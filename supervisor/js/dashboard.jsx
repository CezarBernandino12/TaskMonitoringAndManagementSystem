const SUPERVISOR_PERIOD_OPTIONS = [
    { key: "today", label: "Today"      },
    { key: "week",  label: "This Week"  },
    { key: "month", label: "This Month" },
    { key: "all",   label: "All Time"   },
];
const SUPERVISOR_DEFAULT_PERIOD = "week";
const MANILA_TZ = "Asia/Manila";


function supervisorGetTodayYMD() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MANILA_TZ,
        year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    return [
        parts.find(p => p.type === "year")?.value,
        parts.find(p => p.type === "month")?.value,
        parts.find(p => p.type === "day")?.value,
    ].join("-");
}

function supervisorGetPeriodRange(periodKey) {
    const todayYMD = supervisorGetTodayYMD();
    const [ty, tm, td] = todayYMD.split("-").map(Number);
    const today = new Date(Date.UTC(ty, tm - 1, td));

    if (periodKey === "today") {
        return { start: todayYMD, end: todayYMD };
    }

    if (periodKey === "week") {
        const dow       = today.getUTCDay();          // 0 = Sun
        const diffToMon = dow === 0 ? -6 : 1 - dow;
        const monday    = new Date(today);
        monday.setUTCDate(today.getUTCDate() + diffToMon);
        const sunday    = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);
        return {
            start: monday.toISOString().slice(0, 10),
            end:   sunday.toISOString().slice(0, 10)
        };
    }

    if (periodKey === "month") {
        const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
        const pad     = n => String(n).padStart(2, "0");
        return {
            start: `${ty}-${pad(tm)}-01`,
            end:   `${ty}-${pad(tm)}-${pad(lastDay)}`
        };
    }

    return { start: null, end: null };
}

/**
 * Whether a task is in scope for the chosen period.
 *
 * Rules (identical to the staff dashboard):
 *   - "all"     → every task qualifies.
 *   - Overdue   → always in scope (past-due tasks need attention regardless).
 *   - All others → in scope if their deadline falls inside the period window.
 *   - No deadline → excluded from bounded periods (no time anchor).
 */
function supervisorIsTaskInPeriod(task, periodKey) {
    if (periodKey === "all") return true;

    const todayYMD    = supervisorGetTodayYMD();
    const deadlineYMD = (task?.deadline || "").slice(0, 10);
    const rawStatus   = String(task?.status || "").trim().toLowerCase();

    const isOverdue =
        task?.is_overdue ||
        rawStatus === "overdue" ||
        (deadlineYMD && deadlineYMD < todayYMD && rawStatus !== "completed");

    // Overdue tasks are always surfaced — they're past-due and need attention
    if (isOverdue) return true;
    if (!deadlineYMD) return false;

    const { start, end } = supervisorGetPeriodRange(periodKey);
    return deadlineYMD >= start && deadlineYMD <= end;
}

/* ─── Supervisor Dashboard ────────────────────────────────────────────────── */

function SupervisorDashboard() {
    const [tasks,     setTasks]     = React.useState([]);
    const [staffData, setStaffData] = React.useState([]);
    const [search,    setSearch]    = React.useState("");
    const [loading,   setLoading]   = React.useState(true);
    const [error,     setError]     = React.useState("");
    const [period,    setPeriod]    = React.useState(SUPERVISOR_DEFAULT_PERIOD);

    const statusColorMap = {
        Ongoing:   "#ffbd59",
        Completed: "#7ed957",
        Overdue:   "#ff6969",
        Other:     "#ffe082",
        Extra:     "#fff8e1"
    };

    function normalizeStatus(status = "") {
        const s = String(status).trim().toLowerCase();
        if (!s) return "Other";
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function extractArray(payload, keys = []) {
        if (Array.isArray(payload)) return payload;
        for (const key of keys) {
            if (Array.isArray(payload?.[key])) return payload[key];
        }
        return [];
    }

const TASK_STATUS_COLOR_MAP = {
    Overdue:   "#ef5a5a",
    Ongoing:   "#7a8dff",
    Completed: "#4f73ff",
    Other:     "#f5a0a0",
    Extra:     "#b8c9ff"
};

/* ── Period-scoped task list ──────────────────────────────────────────── */
const scopedTasks = React.useMemo(
    () => (Array.isArray(tasks) ? tasks.filter(t => supervisorIsTaskInPeriod(t, period)) : []),
    [tasks, period]
);

const taskStatusData = React.useMemo(() => {
    const order = ["Overdue", "Ongoing", "Completed", "Other", "Extra"];
    const counts = {};

    scopedTasks.forEach(task => {
        const name = normalizeStatus(task?.status);
        counts[name] = (counts[name] || 0) + 1;
    });

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    return order
        .filter(name => counts[name] > 0)
        .map(name => ({
            name,
            value: counts[name],
            percent: total ? Math.round((counts[name] / total) * 100) : 0,
            color: TASK_STATUS_COLOR_MAP[name] || "#9fb4ff"
        }));
}, [scopedTasks]);

const ganttReportData = React.useMemo(() => {
    const validTasks = scopedTasks.filter(
        t => t?.title && t?.start_date && t?.deadline
    );

    if (!validTasks.length) return null;

    const sortedTasks = [...validTasks].sort(
        (a, b) => new Date(a.start_date) - new Date(b.start_date)
    );

    const formatShort = dateStr => {
        const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
    };

    const startTimes = sortedTasks.map(
        t => new Date(`${t.start_date}T00:00:00`).getTime()
    );
    const endTimes = sortedTasks.map(
        t => new Date(`${t.deadline}T00:00:00`).getTime()
    );

    const minDate = Math.min(...startTimes);
    const maxDate = Math.max(...endTimes);
    const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / 864e5) + 1);

    const rows = sortedTasks.map(task => {
        const startTime = new Date(`${task.start_date}T00:00:00`).getTime();
        const deadlineTime = new Date(`${task.deadline}T00:00:00`).getTime();
        const startOffset = Math.max(0, Math.round((startTime - minDate) / 864e5));
        const duration = Math.max(1, Math.round((deadlineTime - startTime) / 864e5) + 1);
        const status = normalizeStatus(task?.status);

        return {
            title: task.title,
            status,
            startOffset,
            duration,
            startLabel: formatShort(task.start_date),
            endLabel: formatShort(task.deadline)
        };
    });

    const featured = rows.reduce((best, row) => {
        if (!best) return row;
        return row.duration > best.duration ? row : best;
    }, null);

    return { rows, featured, minDate, totalDays };
}, [scopedTasks]);

const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError("");

            const [tasksRes, staffRes] = await Promise.all([
                fetch("php/get_department_tasks.php", { headers: { Accept: "application/json" } }),
                fetch("php/get_staff_performance.php", { headers: { Accept: "application/json" } })
            ]);

            const tasksJson = await tasksRes.json().catch(() => []);
            const staffJson = await staffRes.json().catch(() => []);

            setTasks(extractArray(tasksJson, ["tasks", "data", "results"]));
            setStaffData(extractArray(staffJson, ["staff", "data", "results"]));

            if (!tasksRes.ok || !staffRes.ok) {
                setError("Some dashboard data could not be loaded.");
            }
        } catch (err) {
            console.error("Failed to load dashboard data", err);
            setTasks([]);
            setStaffData([]);
            setError("Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchDashboardData(); }, []);

    React.useEffect(() => {
        if (!window.echarts) return;

        const el = document.getElementById("taskStatusDonutChart");
        if (!el) return;

        const chart = window.echarts.getInstanceByDom(el) || window.echarts.init(el);

        if (taskStatusData.length === 0) {
            chart.clear();
            return () => chart.dispose();
        }

        chart.setOption({
            animation: true,
            tooltip: {
                trigger: "item",
                formatter: params => `${params.name}: ${params.value} (${params.percent}%)`
            },
            series: [{
                type: "pie",
                radius: ["42%", "68%"],
                center: ["50%", "44%"],
                startAngle: 140,
                clockwise: true,
                avoidLabelOverlap: false,
                minAngle: 8,
                hoverAnimation: true,
                selectedMode: false,
                itemStyle: {
                    borderColor: "#f7f7f7",
                    borderWidth: 3,
                    shadowBlur: 10,
                    shadowOffsetY: 5,
                    shadowColor: "rgba(0,0,0,0.12)"
                },
                label: {
                    show: true,
                    position: "outside",
                    formatter: "{d}%",
                    color: "#444",
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 9,
                    fontWeight: 800,
                    backgroundColor: "#ffffff",
                    borderRadius: 999,
                    padding: [3, 5],
                    shadowBlur: 4,
                    shadowColor: "rgba(0,0,0,0.10)"
                },
                labelLine: {
                    show: false
                },
                data: taskStatusData.map(item => ({
                    value: item.value,
                    name: item.name,
                    itemStyle: {
                        color: item.color
                    }
                }))
            }]
        });

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [taskStatusData]);

    /* ── Gantt chart — rebuilds whenever scopedTasks or period changes ───── */

React.useEffect(() => {
    if (!window.echarts) return;

    const el = document.getElementById("ganttReportChart");
    if (!el) return;

    const chart = window.echarts.getInstanceByDom(el) || window.echarts.init(el);

    if (!ganttReportData?.rows?.length) {
        chart.clear();
        return () => chart.dispose();
    }

    const { rows, featured, minDate, totalDays } = ganttReportData;
    const featuredIndex = rows.findIndex(r => r.title === featured.title);

    const axisDate = value => {
        const d = new Date(minDate + value * 864e5);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

 const durationSeries = rows.map((row, idx) => (
    idx === featuredIndex ? 0 : row.duration
));

const featuredSeries = rows.map((row, idx) => (
    idx === featuredIndex ? row.duration : 0
));

const tooltipFormatter = params => {
    const item = Array.isArray(params)
        ? params.find(
            p =>
                (p.seriesName === "Task span" || p.seriesName === "Featured task") &&
                Number(p.value) > 0
        )
        : params;

    if (!item || Number(item.value) <= 0) return "";

    const row = rows[item.dataIndex];
    const accent = item.seriesName === "Featured task" ? "#f4a340" : "#6d84ff";
    const badge = item.seriesName === "Featured task" ? "Featured task" : row.status;

    return `
        <div style="font-family: Nunito, sans-serif; min-width: 176px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${accent};display:inline-block;"></span>
                <span style="font-size:12px;font-weight:800;color:#7c8798;">${badge}</span>
            </div>

            <div style="font-size:15px;font-weight:900;color:#234f3f;margin-bottom:6px;">
                ${row.title}
            </div>

            <div style="font-size:12px;font-weight:700;color:#7b8797;">
                ${row.startLabel} - ${row.endLabel}
            </div>

            <div style="margin-top:10px;font-size:12px;font-weight:700;color:#9aa4b2;">
                Duration
            </div>

            <div style="font-size:30px;line-height:1;font-weight:900;color:#234f3f;">
                ${row.duration}
                <span style="font-size:13px;font-weight:800;color:#47b97f;margin-left:4px;">
                    days
                </span>
            </div>
        </div>
    `;
};

chart.setOption({
    animationDuration: 500,
    animationEasing: "cubicOut",
    legend: {
        top: 0,
        left: "center",
        itemWidth: 8,
        itemHeight: 8,
        icon: "circle",
        selectedMode: false,
        textStyle: {
            color: "#5f6b7a",
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            fontWeight: 700
        },
        data: ["Task span", "Featured task"]
    },
    grid: {
        top: 44,
        left: 120,
        right: 18,
        bottom: 28
    },
    tooltip: {
        trigger: "item",
        backgroundColor: "#ffffff",
        borderColor: "#edf1f7",
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
            color: "#1f3551",
            fontFamily: "Nunito, sans-serif"
        },
        extraCssText: "box-shadow:0 14px 30px rgba(31,53,81,0.14); border-radius:16px;",
        formatter: tooltipFormatter
    },
    xAxis: {
        type: "value",
        min: 0,
        max: totalDays,
        interval: Math.max(1, Math.ceil(totalDays / 6)),
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
            show: true,
            lineStyle: {
                color: "#edf1f7",
                width: 1
            }
        },
        axisLabel: {
            margin: 14,
            color: "#97a2b2",
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            formatter: value => axisDate(value)
        }
    },
    yAxis: {
        type: "category",
        inverse: true,
        data: rows.map(r => r.title),
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
            color: "#5d6878",
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            margin: 18,
            width: 92,
            overflow: "truncate"
        }
    },
    series: [
        {
            name: "Timeline track",
            type: "bar",
            data: rows.map(() => totalDays),
            barWidth: 16,
            barGap: "-100%",
            silent: true,
            z: 1,
            itemStyle: {
                color: "#f3f5f9",
                borderRadius: 999
            }
        },
        {
            name: "Offset",
            type: "bar",
            stack: "timeline",
            data: rows.map(r => r.startOffset),
            silent: true,
            tooltip: { show: false },
            z: 2,
            itemStyle: {
                color: "transparent"
            }
        },
        {
            name: "Task span",
            type: "bar",
            stack: "timeline",
            data: durationSeries,
            z: 3,
            barWidth: 16,
            itemStyle: {
                color: "#6d84ff",
                borderRadius: 999,
                shadowBlur: 8,
                shadowOffsetY: 4,
                shadowColor: "rgba(109,132,255,0.18)"
            }
        },
        {
            name: "Featured task",
            type: "bar",
            stack: "timeline",
            data: featuredSeries,
            z: 4,
            barWidth: 16,
            itemStyle: {
                color: "#f4a340",
                borderRadius: 999,
                shadowBlur: 8,
                shadowOffsetY: 4,
                shadowColor: "rgba(244,163,64,0.22)"
            }
        }
    ]
});

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
        window.removeEventListener("resize", onResize);
        chart.dispose();
    };
}, [ganttReportData]);

    /* ── Summary counts — derived from scopedTasks ───────────────────────── */

    const todayYMD       = supervisorGetTodayYMD();
    const totalTasks     = scopedTasks.length;
    const completedTasks = scopedTasks.filter(t => normalizeStatus(t?.status) === "Completed").length;
    const ongoingTasks   = scopedTasks.filter(t => normalizeStatus(t?.status) === "Ongoing").length;
    const overdueTasks   = scopedTasks.filter(t =>
        t?.is_overdue ||
        normalizeStatus(t?.status) === "Overdue" ||
        ((t?.deadline || "").slice(0, 10) < todayYMD && normalizeStatus(t?.status) !== "Completed")
    ).length;

    const periodLabel = SUPERVISOR_PERIOD_OPTIONS.find(o => o.key === period)?.label ?? "This Week";

    /* ── Filtered task table (search on top of period-scoped list) ───────── */

    const filteredTasks = scopedTasks.filter(t => {
        const title    = String(t?.title        || "").toLowerCase();
        const assigned = String(t?.assigned_name || "").toLowerCase();
        const term     = search.toLowerCase();
        return title.includes(term) || assigned.includes(term);
    });

    /* ── Row renderer ─────────────────────────────────────────────────────── */

    const renderTaskRow = task => {
        const status = normalizeStatus(task?.status);
        return (
            <tr key={task?.id || `${task?.title}-${task?.deadline}`}>
                <td>{task?.title          || "–"}</td>
                <td>{task?.assigned_name  || "–"}</td>
                <td>{formatDate(task?.start_date)}</td>
                <td>{formatDate(task?.deadline)}</td>
                <td>
                    <span style={{
                        display: "inline-block", minWidth: "90px",
                        backgroundColor: statusColorMap[status] || "#ffffff",
                        color: "#000", textAlign: "center",
                        padding: "4px 8px", borderRadius: "4px"
                    }}>
                        {status}
                    </span>
                </td>
                <td>{task?.priority || "–"}</td>
            </tr>
        );
    };

    /* ── Render ───────────────────────────────────────────────────────────── */

    return (
        <div className="container-fluid py-4">

            {error && (
                <div className="alert alert-warning" role="alert">{error}</div>
            )}

            {/* ── Period filter bar ──────────────────────────────────────── */}
            <div className="db-period-wrap">
                <div className="db-period-bar" aria-label="Supervisor dashboard period">
                    {SUPERVISOR_PERIOD_OPTIONS.map(opt => {
                        const isActive = period === opt.key;

                        return (
                            <button
                                key={opt.key}
                                type="button"
                                className={`db-period-tab ${isActive ? "is-active" : ""}`}
                                onClick={() => setPeriod(opt.key)}
                                aria-pressed={isActive}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Summary Cards ─────────────────────────────────────────── */}
            <div className="db-metrics-row db-metrics-row--four mb-4">
                {[
                    {
                        label: "Total Tasks",
                        value: totalTasks,
                        sub: periodLabel,
                        icon: "bi-list-task",
                        tone: "teal",
                        trend: "up"
                    },
                    {
                        label: "Ongoing",
                        value: ongoingTasks,
                        sub: "active",
                        icon: "bi-arrow-repeat",
                        tone: "blue",
                        trend: "up"
                    },
                    {
                        label: "Completed",
                        value: completedTasks,
                        sub: "done",
                        icon: "bi-check2-circle",
                        tone: "green",
                        trend: "up"
                    },
                    {
                        label: "Overdue",
                        value: overdueTasks,
                        sub: "past due",
                        icon: "bi-exclamation-circle",
                        tone: "red",
                        trend: "down"
                    },
                ].map(card => (
                    <div className="db-stat-card" key={card.label}>
                        <div className="db-stat-card-top">
                            <div className={`db-stat-icon-wrap ${card.tone}`}>
                                <i className={`bi ${card.icon}`}></i>
                            </div>

                            <span className={`db-stat-top-text ${card.trend}`}>
                                {card.sub}
                            </span>
                        </div>

                        <div className="db-stat-main">
                            <h3 className="db-stat-value">
                                {loading ? "…" : card.value}
                            </h3>

                            <p className="db-stat-label">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts ────────────────────────────────────────────────── */}
            <div className="row g-4 mb-4 align-items-start">
                <div className="col-lg-5 col-xl-4 d-flex">
                    <div className="db-donut-card db-chart-card w-100">
                        <div className="db-donut-card-head">
                            <h5 className="db-donut-title">Task Status Distribution</h5>
                            <small className="db-donut-period">{periodLabel}</small>
                        </div>

                        {loading ? (
                            <div className="db-donut-empty">Loading chart…</div>
                        ) : taskStatusData.length === 0 ? (
                            <div className="db-donut-empty">No tasks for this period</div>
                        ) : (
                            <>
                                <div id="taskStatusDonutChart" className="db-donut-chart"></div>

                                <div className="db-donut-legend">
                                    {taskStatusData.map(item => (
                                        <div className="db-donut-legend-row" key={item.name}>
                                            <div className="db-donut-legend-left">
                                                <span
                                                    className="db-donut-dot"
                                                    style={{ backgroundColor: item.color }}
                                                ></span>
                                                <span className="db-donut-legend-label">{item.name}</span>
                                            </div>

                                            <span className="db-donut-legend-value">
                                                {item.value} ({item.percent}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="col-lg-7 col-xl-8 d-flex">
                    <div className="db-gantt-report-card db-chart-card w-100">
                        <div className="db-gantt-report-head">
                            <h5 className="db-gantt-report-title">Task Timeline</h5>
                            <span className="db-gantt-report-range">{periodLabel}</span>
                        </div>

                        {!loading && !ganttReportData?.rows?.length ? (
                            <div className="db-gantt-report-empty">
                                No tasks with date ranges for this period
                            </div>
                        ) : (
                            <div id="ganttReportChart" className="db-gantt-report-chart"></div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Department Tasks table ────────────────────────────────── */}
            <div className="card p-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div>
                        <h5 className="mb-0">Department Tasks</h5>
                        <small style={{ color: "#a67c52" }}>
                            {loading
                                ? "Loading…"
                                : `${filteredTasks.length} task${filteredTasks.length !== 1 ? "s" : ""} · ${periodLabel}`}
                        </small>
                    </div>
                    <input
                        type="text"
                        className="form-control w-25"
                        placeholder="Search task or staff…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ minWidth: "180px" }}
                    />
                </div>

                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Task</th>
                            <th>Assigned To</th>
                            <th>Start</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th>Priority</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6">Loading tasks…</td></tr>
                        ) : filteredTasks.length === 0 ? (
                            <tr><td colSpan="6">No tasks found for this period</td></tr>
                        ) : (
                            filteredTasks.map(renderTaskRow)
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Staff Performance — intentionally unscoped by period ───── */}
            {/*   Always shows overall workload totals so the supervisor has   */}
            {/*   a full picture of each staff member's entire assignment.     */}
            <div className="card p-3 mb-4">
                <div className="mb-2">
                    <h5 className="mb-0">Staff Performance</h5>
                    <small style={{ color: "#a67c52" }}>All time — overall workload</small>
                </div>
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th>Staff Name</th>
                            <th>Total Tasks</th>
                            <th>Completed</th>
                            <th>Ongoing</th>
                            <th>Overdue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5">Loading staff performance…</td></tr>
                        ) : !Array.isArray(staffData) || staffData.length === 0 ? (
                            <tr><td colSpan="5">No staff found</td></tr>
                        ) : (
                            staffData.map((s, idx) => (
                                <tr key={idx}>
                                    <td>{s?.name      || "–"}</td>
                                    <td>{s?.total     ?? 0}</td>
                                    <td>{s?.completed ?? 0}</td>
                                    <td>{s?.ongoing   ?? 0}</td>
                                    <td>{s?.overdue   ?? 0}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return "–";
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date.getTime())) return "–";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* ── Mount ───────────────────────────────────────────────────────────────── */
const dashboardRoot = document.getElementById("supervisor-dashboard-root");
if (dashboardRoot) {
    ReactDOM.createRoot(dashboardRoot).render(<SupervisorDashboard />);
}
