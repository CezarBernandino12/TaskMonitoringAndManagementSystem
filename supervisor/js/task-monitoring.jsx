/* ---------------- Task Monitoring ---------------- */
function TaskMonitoring() {
    const [tasks, setTasks] = React.useState([]);
    const [staffData, setStaffData] = React.useState([]);
    const [search, setSearch] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    const statusColorMap = {
        Ongoing: "#ffe066",
        Completed: "#b6e388",
        Overdue: "#ffb3b3",
        Other: "#ffe082",
        Extra: "#fff8e1"
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

    async function fetchDashboardData() {
        try {
            setLoading(true);
            setError("");

            const [tasksRes, staffRes] = await Promise.all([
                fetch("php/get_department_tasks.php", {
                    headers: { Accept: "application/json" }
                }),
                fetch("php/get_staff_performance.php", {
                    headers: { Accept: "application/json" }
                })
            ]);

            const tasksJson = await tasksRes.json().catch(() => []);
            const staffJson = await staffRes.json().catch(() => []);

            const safeTasks = extractArray(tasksJson, ["tasks", "data", "results"]);
            const safeStaff = extractArray(staffJson, ["staffs", "data", "results"]);

            setTasks(safeTasks);
            setStaffData(safeStaff);

            if (!tasksRes.ok || !staffRes.ok) {
                setError("Some task monitoring data could not be loaded.");
            }
        } catch (err) {
            console.error("Failed to load task monitoring data", err);
            setTasks([]);
            setStaffData([]);
            setError("Failed to load task monitoring data.");
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        fetchDashboardData();
    }, []);

    React.useEffect(() => {
        if (!window.Chart) return;
        if (!Array.isArray(tasks) || tasks.length === 0) return;

        const canvas = document.getElementById("taskStatusPieChart");
        if (!canvas) return;

        const statusCounts = {};
        tasks.forEach((t) => {
            const status = normalizeStatus(t?.status);
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const labels = Object.keys(statusCounts);
        const values = Object.values(statusCounts);
        const backgroundColors = labels.map(
            (label) => statusColorMap[label] || "#e0e0e0"
        );

        if (window.taskStatusPieChartInstance) {
            window.taskStatusPieChartInstance.destroy();
        }

        window.taskStatusPieChartInstance = new window.Chart(canvas, {
            type: "pie",
            data: {
                labels,
                datasets: [
                    {
                        data: values,
                        backgroundColor: backgroundColors,
                        borderColor: "#fffaf3",
                        borderWidth: 3,
                        hoverOffset: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#a67c52",
                            font: { size: 13 }
                        }
                    }
                },
                layout: {
                    padding: 10
                }
            }
        });

        return () => {
            if (window.taskStatusPieChartInstance) {
                window.taskStatusPieChartInstance.destroy();
                window.taskStatusPieChartInstance = null;
            }
        };
    }, [tasks]);

    React.useEffect(() => {
        if (!window.Chart) return;
        if (!Array.isArray(tasks) || tasks.length === 0) return;

        const canvas = document.getElementById("ganttChartCanvas");
        if (!canvas) return;

        const validTasks = tasks.filter(
            (t) => t?.title && t?.start_date && t?.deadline
        );

        if (validTasks.length === 0) return;

        const sortedTasks = [...validTasks].sort(
            (a, b) => new Date(a.start_date) - new Date(b.start_date)
        );

        const startDates = sortedTasks.map((t) => new Date(t.start_date));
        const endDates = sortedTasks.map((t) => new Date(t.deadline));

        const minDate = Math.min(...startDates.map((d) => d.getTime()));
        const maxDate = Math.max(...endDates.map((d) => d.getTime()));
        const totalDays =
            Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

        const ganttData = sortedTasks.map((t) => {
            const start = new Date(t.start_date).getTime();
            const end = new Date(t.deadline).getTime();

            return {
                x: (start - minDate) / (1000 * 60 * 60 * 24),
                x2: (end - minDate) / (1000 * 60 * 60 * 24),
                y: t.title,
                status: normalizeStatus(t.status)
            };
        });

        if (window.ganttChartInstance) {
            window.ganttChartInstance.destroy();
        }

        window.ganttChartInstance = new window.Chart(canvas, {
            type: "bar",
            data: {
                labels: sortedTasks.map((t) => t.title),
                datasets: [
                    {
                        label: "Task Duration",
                        data: ganttData,
                        backgroundColor: ganttData.map(
                            (d) => statusColorMap[d.status] || "#e0e0e0"
                        ),
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    }
                ]
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
                            label: function (context) {
                                const d = context.raw;
                                const start = new Date(
                                    minDate + d.x * 24 * 60 * 60 * 1000
                                );
                                const end = new Date(
                                    minDate + d.x2 * 24 * 60 * 60 * 1000
                                );
                                return `${d.y}: ${start.toLocaleDateString()} - ${end.toLocaleDateString()} (${d.status})`;
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
                            callback: function (value) {
                                const date = new Date(
                                    minDate + value * 24 * 60 * 60 * 1000
                                );
                                return date.toLocaleDateString();
                            },
                            autoSkip: true,
                            maxTicksLimit: 10
                        },
                        grid: { color: "#ffe7b3" }
                    },
                    y: {
                        grid: { color: "#ffe7b3" }
                    }
                }
            },
            plugins: [
                {
                    id: "ganttBar",
                    beforeDatasetsDraw(chart) {
                        const { ctx, data, scales } = chart;
                        if (!data.datasets.length) return;

                        ctx.save();

                        data.datasets[0].data.forEach((d, i) => {
                            const y = scales.y.getPixelForValue(d.y);
                            const xStart = scales.x.getPixelForValue(d.x);
                            const xEnd = scales.x.getPixelForValue(d.x2);
                            const width = Math.max(xEnd - xStart, 4);

                            ctx.beginPath();
                            ctx.fillStyle = data.datasets[0].backgroundColor[i];
                            ctx.strokeStyle = "#fff";
                            ctx.lineWidth = 2;

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
                }
            ]
        });

        return () => {
            if (window.ganttChartInstance) {
                window.ganttChartInstance.destroy();
                window.ganttChartInstance = null;
            }
        };
    }, [tasks]);

    const filteredTasks = Array.isArray(tasks)
        ? tasks.filter((t) => {
              const title = String(t?.title || "").toLowerCase();
              const assigned = String(t?.assigned_name || "").toLowerCase();
              const term = search.toLowerCase();
              return title.includes(term) || assigned.includes(term);
          })
        : [];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
        (t) => normalizeStatus(t?.status) === "Completed"
    ).length;
    const ongoingTasks = tasks.filter(
        (t) => normalizeStatus(t?.status) === "Ongoing"
    ).length;
    const overdueTasks = tasks.filter(
        (t) => t?.is_overdue || normalizeStatus(t?.status) === "Overdue"
    ).length;

    const renderTaskRow = (task) => {
        const status = normalizeStatus(task?.status);

        return (
            <tr key={task?.id || `${task?.title}-${task?.deadline}`}>
                <td>{task?.title || "-"}</td>
                <td>{task?.assigned_name || "-"}</td>
                <td>{formatDate(task?.start_date)}</td>
                <td>{formatDate(task?.deadline)}</td>
                <td>
                    <span
                        style={{
                            display: "inline-block",
                            minWidth: "90px",
                            backgroundColor: statusColorMap[status] || "#ffffff",
                            color: "#000",
                            textAlign: "center",
                            padding: "4px 8px",
                            borderRadius: "4px"
                        }}
                    >
                        {status}
                    </span>
                </td>
                <td>{task?.priority || "-"}</td>
            </tr>
        );
    };

    return (
        <div className="container-fluid py-4">
            {error && (
                <div className="alert alert-warning" role="alert">
                    {error}
                </div>
            )}

            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card summary-card text-center p-3">
                        <h6>Total Tasks</h6>
                        <h3>{loading ? "..." : totalTasks}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card summary-card text-center p-3">
                        <h6>Ongoing</h6>
                        <h3>{loading ? "..." : ongoingTasks}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card summary-card text-center p-3">
                        <h6>Completed</h6>
                        <h3>{loading ? "..." : completedTasks}</h3>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card summary-card text-center p-3">
                        <h6>Overdue</h6>
                        <h3>{loading ? "..." : overdueTasks}</h3>
                    </div>
                </div>
            </div>

            <div className="row mb-4 justify-content-center align-items-start">
                <div className="col-md-5">
                    <div className="card p-3 mb-4" style={{ maxWidth: "420px", margin: "0 auto" }}>
                        <h5>Task Status Distribution</h5>
                        <div style={{ width: "100%", height: "260px", display: "flex", justifyContent: "center" }}>
                            <canvas id="taskStatusPieChart"></canvas>
                        </div>
                    </div>
                </div>

                <div className="col-md-7">
                    <div className="card p-3 mb-4" style={{ minHeight: "260px", overflowX: "auto" }}>
                        <h5>Gantt Chart</h5>
                        <div style={{ height: "380px" }}>
                            <canvas id="ganttChartCanvas"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card p-3 mb-4">
                <div className="d-flex justify-content-between mb-2">
                    <h5>All Department Tasks</h5>
                    <input
                        type="text"
                        className="form-control w-25"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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
                            <tr>
                                <td colSpan="6">Loading tasks...</td>
                            </tr>
                        ) : filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="6">No tasks found</td>
                            </tr>
                        ) : (
                            filteredTasks.map(renderTaskRow)
                        )}
                    </tbody>
                </table>
            </div>

            <div className="card p-3 mb-4">
                <h5>Staff Performance</h5>
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
                            <tr>
                                <td colSpan="5">Loading staff performance...</td>
                            </tr>
                        ) : staffData.length === 0 ? (
                            <tr>
                                <td colSpan="5">No staff found</td>
                            </tr>
                        ) : (
                            staffData.map((s) => (
                                <tr key={s.id || s.email || s.name}>
                                    <td>{s.name || "-"}</td>
                                    <td>{s.total ?? 0}</td>
                                    <td>{s.completed ?? 0}</td>
                                    <td>{s.ongoing ?? 0}</td>
                                    <td>{s.overdue ?? 0}</td>
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
    if (!dateStr) return "-";
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

/* ---------------- Render the Task Monitoring ---------------- */
const taskMonitoringRoot = document.getElementById("task-monitoring-page-root");

if (taskMonitoringRoot) {
    ReactDOM.createRoot(taskMonitoringRoot).render(<TaskMonitoring />);
} else {
    console.error("task-monitoring-page-root not found");
}