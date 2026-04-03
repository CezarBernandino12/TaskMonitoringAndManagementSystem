const statusColorMap = {
    'Ongoing': '#ffe066',
    'Completed': '#b6e388',
    'Overdue': '#ffb3b3',
    'Other': '#ffe082',
    'Extra': '#fff8e1'
};

function App() {
    const [tasks, setTasks] = React.useState([]);

    const fetchTasks = async () => {
        try {
            const response = await fetch("php/get_tasks.php");
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    React.useEffect(() => {
        fetchTasks();
    }, []);

    return (
        <>
            <TaskSummary tasks={tasks} />
            <TaskTable tasks={tasks} />
        </>
    );
}

const priorityToneMap = {
    high: "priority-high",
    medium: "priority-medium",
    low: "priority-low"
};

const statusToneMap = {
    ongoing: "status-ongoing",
    completed: "status-completed",
    overdue: "status-overdue",
    other: "status-other",
    extra: "status-other"
};

function getPriorityTone(priority = "") {
    return priorityToneMap[String(priority).toLowerCase()] || "priority-medium";
}

function getStatusTone(status = "") {
    return statusToneMap[String(status).toLowerCase()] || "status-other";
}

function TaskTable({ tasks }) {
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [showDetailModal, setShowDetailModal] = React.useState(false);
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [statusFilter, setStatusFilter] = React.useState("All");
    const filterRef = React.useRef(null);

    const handleRowClick = (task) => {
        setSelectedTask(task);
        setShowDetailModal(true);
    };

    React.useEffect(() => {
        const handleOutsideClick = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const filteredTasks = tasks.filter((task) => {
        if (statusFilter === "All") return true;
        return String(task.status).toLowerCase() === statusFilter.toLowerCase();
    });

    return (
        <section className="task-board">
            <div className="task-board-head">
                <div className="task-board-head-main">
                    <h5 className="task-board-title">Your Tasks</h5>
                </div>

                <div className="task-board-actions">
                    <div className="task-filter" ref={filterRef}>
                        <button
                            type="button"
                            className={`task-filter-btn ${isFilterOpen ? "is-open" : ""}`}
                            onClick={() => setIsFilterOpen((prev) => !prev)}
                            aria-haspopup="menu"
                            aria-expanded={isFilterOpen}
                        >
                            <span className="task-filter-btn-inner">
                                <i className="bi bi-filter"></i>
                                <span>Filter</span>
                            </span>
                            <i className={`bi ${isFilterOpen ? "bi-chevron-up" : "bi-chevron-down"} task-filter-caret`}></i>
                        </button>

                        {isFilterOpen && (
                            <div className="task-filter-menu" role="menu">
                                {["All", "Ongoing", "Completed", "Overdue"].map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        className={`task-filter-item ${statusFilter === option ? "is-active" : ""}`}
                                        onClick={() => {
                                            setStatusFilter(option);
                                            setIsFilterOpen(false);
                                        }}
                                    >
                                        <span>{option}</span>
                                        {statusFilter === option && <i className="bi bi-check2"></i>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="task-board-strip">
                <span className="task-board-filter-state">
                    Showing: {statusFilter}
                </span>
                <span className="task-board-count">{filteredTasks.length}</span>
            </div>

            <div className="task-board-table-wrap">
                <table className="table task-board-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th>
                                <span className="task-board-th">
                                    <i className="bi bi-card-list"></i>
                                    Task Name
                                </span>
                            </th>
                            <th>
                                <span className="task-board-th">
                                    <i className="bi bi-calendar-event"></i>
                                    Start
                                </span>
                            </th>
                            <th>
                                <span className="task-board-th">
                                    <i className="bi bi-calendar2-week"></i>
                                    Due
                                </span>
                            </th>
                            <th>
                                <span className="task-board-th">
                                    <i className="bi bi-info-circle-fill"></i>
                                    Status
                                </span>
                            </th>
                            <th>
                                <span className="task-board-th">
                                    <i className="bi bi-flag-fill"></i>
                                    Priority
                                </span>
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="task-board-empty">
                                    No {statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}tasks found
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map((task) => (
                                <tr
                                    key={task.id}
                                    className="task-board-row"
                                    onClick={() => handleRowClick(task)}
                                >
                                    <td>
                                        <div className="task-board-name-cell">
                                            <span className="task-board-grip">
                                                <i className="bi bi-grip-vertical"></i>
                                            </span>

                                            <span
                                                className={`task-board-check ${
                                                    task.status === "Completed" ? "is-checked" : ""
                                                }`}
                                            >
                                                {task.status === "Completed" && <i className="bi bi-check2"></i>}
                                            </span>

                                            <div className="task-board-name-copy">
                                                <div className="task-board-task-title">{task.title}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="task-board-date">{formatDate(task.start_date)}</td>
                                    <td className="task-board-date">{formatDate(task.deadline)}</td>

                                    <td>
                                        <span className={`task-pill task-status-pill ${getStatusTone(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={`task-pill task-priority-pill ${getPriorityTone(task.priority)}`}>
                                            <i className="bi bi-flag"></i>
                                            {task.priority}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}


function TaskSummary({ tasks }) {
    const total = tasks.length;
    const ongoing = tasks.filter(t => t.status === "Ongoing").length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const overdue = tasks.filter(t => t.is_overdue).length;

    const stats = [
        {
            key: "total",
            title: "Total Tasks",
            value: total,
            icon: "bi-card-checklist",
            pillClass: "stats-pill-neutral",
            pillText: "Live",
            metaText: "current count"
        },
        {
            key: "ongoing",
            title: "Ongoing",
            value: ongoing,
            icon: "bi-arrow-repeat",
            pillClass: "stats-pill-info",
            pillText: "Open",
            metaText: "active tasks"
        },
        {
            key: "completed",
            title: "Completed",
            value: completed,
            icon: "bi-check2-circle",
            pillClass: "stats-pill-success",
            pillText: "Done",
            metaText: "finished tasks"
        },
        {
            key: "overdue",
            title: "Overdue",
            value: overdue,
            icon: "bi-exclamation-triangle",
            pillClass: "stats-pill-danger",
            pillText: "Alert",
            metaText: "needs attention"
        }
    ];

    return (
        <div className="stats-strip mb-4">
            <div className="stats-strip-inner">
                {stats.map((item) => (
                    <div className="stats-metric" key={item.key}>
                        <div className="stats-icon">
                            <i className={`bi ${item.icon}`}></i>
                        </div>

                        <div className="stats-label">{item.title}</div>

                        <div className="stats-bottom">
                            <div className="stats-value">{item.value}</div>

                            <div className="stats-trend">
                                <span className={`stats-pill ${item.pillClass}`}>
                                    {item.pillText}
                                </span>
                                <span className="stats-meta">{item.metaText}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DueSoon({ tasks }) {
    const today = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    const dueSoonTasks = tasks.filter(task => {
        if (task.status.toLowerCase() === "completed") return false;
        const deadline = new Date(task.deadline + "T00:00:00");
        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return diffDays === 0 || diffDays === 1;
    });

    const formatLabel = (deadlineStr) => {
        const todayPH = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
        );
        const deadline = new Date(deadlineStr + "T00:00:00");
        const diffDays = Math.ceil((deadline - todayPH) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Due Today";
        if (diffDays === 1) return "Due Tomorrow";
        return "";
    };

    return (
        <div className="card p-3 mb-4">
            <h5>⚠️ Due Soon</h5>
            <ul>
                {dueSoonTasks.length === 0 ? (
                    <li>No upcoming deadlines</li>
                ) : (
                    dueSoonTasks.map(task => (
                        <li key={task.id}>
                            {task.title} - {formatLabel(task.deadline)}
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);