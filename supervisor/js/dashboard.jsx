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

    /* ── Fetch ────────────────────────────────────────────────────────────── */

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

    /* ── Period-scoped task list ──────────────────────────────────────────── */

    const scopedTasks = React.useMemo(
        () => (Array.isArray(tasks) ? tasks.filter(t => supervisorIsTaskInPeriod(t, period)) : []),
        [tasks, period]
    );

    /* ── Pie chart — rebuilds whenever scopedTasks or period changes ─────── */

    React.useEffect(() => {
        if (!window.Chart) return;

        const canvas = document.getElementById("taskStatusPieChart");
        if (!canvas) return;

        if (window.taskStatusPieChartInstance) {
            window.taskStatusPieChartInstance.destroy();
            window.taskStatusPieChartInstance = null;
        }

        if (scopedTasks.length === 0) return;

        const statusCounts = {};
        scopedTasks.forEach(t => {
            const s = normalizeStatus(t?.status);
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        const labels           = Object.keys(statusCounts);
        const values           = Object.values(statusCounts);
        const backgroundColors = labels.map(l => statusColorMap[l] || "#e0e0e0");

        window.taskStatusPieChartInstance = new window.Chart(canvas, {
            type: "pie",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: "#fffaf3",
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { color: "#a67c52", font: { size: 13 } }
                    }
                },
                layout: { padding: 10 }
            }
        });

        return () => {
            if (window.taskStatusPieChartInstance) {
                window.taskStatusPieChartInstance.destroy();
                window.taskStatusPieChartInstance = null;
            }
        };
    }, [scopedTasks]);

    /* ── Gantt chart — rebuilds whenever scopedTasks or period changes ───── */

    React.useEffect(() => {
        if (!window.Chart) return;

        const canvas = document.getElementById("ganttChartCanvas");
        if (!canvas) return;

        if (window.ganttChartInstance) {
            window.ganttChartInstance.destroy();
            window.ganttChartInstance = null;
        }

        const validTasks = scopedTasks.filter(t => t?.title && t?.start_date && t?.deadline);
        if (validTasks.length === 0) return;

        const sortedTasks = [...validTasks].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        const labels      = sortedTasks.map(t => t.title);
        const startDates  = sortedTasks.map(t => new Date(t.start_date));
        const endDates    = sortedTasks.map(t => new Date(t.deadline));

        const minDate   = Math.min(...startDates.map(d => d.getTime()));
        const maxDate   = Math.max(...endDates.map(d => d.getTime()));
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

        const ganttData = sortedTasks.map(t => ({
            x:      (new Date(t.start_date).getTime() - minDate) / 864e5,
            x2:     (new Date(t.deadline).getTime()   - minDate) / 864e5,
            y:      t.title,
            status: normalizeStatus(t.status)
        }));

        window.ganttChartInstance = new window.Chart(canvas, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Task Duration",
                    data: ganttData,
                    backgroundColor: ganttData.map(d => statusColorMap[d.status] || "#e0e0e0"),
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                const d     = context.raw;
                                const start = new Date(minDate + d.x  * 864e5);
                                const end   = new Date(minDate + d.x2 * 864e5);
                                return `${d.y}: ${start.toLocaleDateString()} – ${end.toLocaleDateString()} (${d.status})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: totalDays,
                        title: { display: true, text: "Timeline (days)" },
                        ticks: {
                            callback: value => new Date(minDate + value * 864e5).toLocaleDateString(),
                            autoSkip: true,
                            maxTicksLimit: 10
                        },
                        grid: { color: "#ffe7b3" }
                    },
                    y: { grid: { color: "#ffe7b3" } }
                }
            },
            plugins: [{
                id: "ganttBar",
                beforeDatasetsDraw(chart) {
                    const { ctx, data, scales } = chart;
                    if (!data.datasets.length) return;
                    ctx.save();
                    data.datasets[0].data.forEach((d, i) => {
                        const y      = scales.y.getPixelForValue(d.y);
                        const xStart = scales.x.getPixelForValue(d.x);
                        const xEnd   = scales.x.getPixelForValue(d.x2);
                        const width  = Math.max(xEnd - xStart, 4);
                        ctx.beginPath();
                        ctx.fillStyle   = data.datasets[0].backgroundColor[i];
                        ctx.strokeStyle = "#fff";
                        ctx.lineWidth   = 2;
                        if (typeof ctx.roundRect === "function") {
                            ctx.roundRect(xStart, y - 12, width, 24, 6);
                        } else {
                            ctx.rect(xStart, y - 12, width, 24);
                        }
                        ctx.fill();
                        ctx.stroke();
                    });
                    ctx.restore();
                }
            }]
        });

        return () => {
            if (window.ganttChartInstance) {
                window.ganttChartInstance.destroy();
                window.ganttChartInstance = null;
            }
        };
    }, [scopedTasks]);

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
            <div className="row mb-4">
                {[
                    { label: "Total Tasks", value: totalTasks,     sub: periodLabel      },
                    { label: "Ongoing",     value: ongoingTasks,   sub: "active"         },
                    { label: "Completed",   value: completedTasks, sub: "done"           },
                    { label: "Overdue",     value: overdueTasks,   sub: "past due"       },
                ].map(card => (
                    <div className="col-md-3" key={card.label}>
                        <div className="card summary-card text-center p-3">
                            <h6>{card.label}</h6>
                            <h3>{loading ? "…" : card.value}</h3>
                            <small style={{ color: "#a67c52", fontSize: "0.78rem" }}>
                                {card.sub}
                            </small>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts ────────────────────────────────────────────────── */}
            <div className="row mb-4 justify-content-center align-items-start">
                <div className="col-md-5">
                    <div className="card p-3 mb-4" style={{ maxWidth: "420px", margin: "0 auto" }}>
                        <div className="d-flex justify-content-between align-items-baseline mb-2">
                            <h5 className="mb-0">Task Status Distribution</h5>
                            <small style={{ color: "#a67c52" }}>{periodLabel}</small>
                        </div>
                        {!loading && scopedTasks.length === 0 ? (
                            <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                 className="text-muted">
                                No tasks for this period
                            </div>
                        ) : (
                            <div style={{ width: "100%", height: "260px", display: "flex", justifyContent: "center" }}>
                                <canvas id="taskStatusPieChart"></canvas>
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-md-7">
                    <div className="card p-3 mb-4" style={{ minHeight: "260px", overflowX: "auto" }}>
                        <div className="d-flex justify-content-between align-items-baseline mb-2">
                            <h5 className="mb-0">Gantt Chart</h5>
                            <small style={{ color: "#a67c52" }}>{periodLabel}</small>
                        </div>
                        {!loading && scopedTasks.filter(t => t?.start_date && t?.deadline).length === 0 ? (
                            <div style={{ height: "380px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                 className="text-muted">
                                No tasks with date ranges for this period
                            </div>
                        ) : (
                            <div style={{ height: "380px" }}>
                                <canvas id="ganttChartCanvas"></canvas>
                            </div>
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
