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

    chart.setOption({
        animationDuration: 450,
        grid: {
            top: 110,
            left: 100,
            right: 24,
            bottom: 56
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: params => {
                const item = params.find(p => p.seriesName === "Duration");
                if (!item) return "";
                const row = rows[item.dataIndex];
                return `
                    <div style="font-family: Nunito, sans-serif; min-width: 170px;">
                        <div style="font-weight: 800; margin-bottom: 4px;">${row.title}</div>
                        <div>${row.startLabel} – ${row.endLabel}</div>
                        <div>Status: ${row.status}</div>
                        <div>Duration: ${row.duration} day${row.duration !== 1 ? "s" : ""}</div>
                    </div>
                `;
            }
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
                    color: "#d9dce5",
                    width: 1
                }
            },
            axisLabel: {
                color: "#737784",
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
            axisLabel: {
                color: "#737784",
                fontFamily: "Nunito, sans-serif",
                fontSize: 12,
                fontWeight: 700,
                margin: 14
            }
        },
        series: [
            {
                name: "Track",
                type: "bar",
                data: rows.map(() => totalDays),
                barWidth: 34,
                barGap: "-100%",
                silent: true,
                z: 1,
                itemStyle: {
                    color: "#dbdde6",
                    borderRadius: 8
                }
            },
            {
                name: "Offset",
                type: "bar",
                stack: "timeline",
                data: rows.map(r => r.startOffset),
                silent: true,
                z: 2,
                itemStyle: {
                    color: "transparent"
                }
            },
            {
                name: "Duration",
                type: "bar",
                stack: "timeline",
                data: rows.map(r => r.duration),
                z: 3,
                barWidth: 28,
                itemStyle: {
                    borderRadius: 8,
                    color: params => params.dataIndex === featuredIndex ? "#000000" : "#111111"
                },
                markLine: {
                    symbol: ["none", "none"],
                    silent: true,
                    animation: false,
                    lineStyle: {
                        color: "#8c909c",
                        type: "dashed",
                        width: 1.5
                    },
                    data: [
                        { xAxis: featured.startOffset + featured.duration - 0.5 }
                    ]
                }
            }
        ],
        graphic: [
            {
                type: "group",
                left: "center",
                top: 24,
                children: [
                    {
                        type: "rect",
                        shape: { x: 0, y: 0, width: 186, height: 52, r: 10 },
                        style: {
                            fill: "#ffffff",
                            stroke: "#eceef3",
                            shadowBlur: 12,
                            shadowColor: "rgba(17,24,39,0.08)",
                            shadowOffsetY: 4
                        }
                    },
                    {
                        type: "text",
                        style: {
                            x: 14,
                            y: 13,
                            text: featured.title,
                            fill: "#2a2e38",
                            font: '700 12px "Nunito", sans-serif'
                        }
                    },
                    {
                        type: "text",
                        style: {
                            x: 14,
                            y: 32,
                            text: `${featured.startLabel} – ${featured.endLabel}`,
                            fill: "#7a7f8b",
                            font: '700 11px "Nunito", sans-serif'
                        }
                    },
                    {
                        type: "text",
                        style: {
                            x: 138,
                            y: 21,
                            text: `${featured.duration}d`,
                            fill: "#69c356",
                            font: '800 12px "Nunito", sans-serif'
                        }
                    }
                ]
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

                        <h3 className="db-stat-value">
                            {loading ? "…" : card.value}
                        </h3>

                        <p className="db-stat-label">{card.label}</p>
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
                            <div>
                                <h5 className="db-gantt-report-title">Gantt Chart</h5>
                                <p className="db-gantt-report-sub">{periodLabel}</p>
                            </div>
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
