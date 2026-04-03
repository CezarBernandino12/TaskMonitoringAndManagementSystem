const MANILA_TIMEZONE = "Asia/Manila";

function getTodayYMDInManila() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MANILA_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const year = parts.find(p => p.type === "year")?.value;
    const month = parts.find(p => p.type === "month")?.value;
    const day = parts.find(p => p.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

function parseYMDToUTC(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(dateStr) {
    const date = parseYMDToUTC(dateStr);
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

function normalizeText(value = "") {
    return String(value).trim().toLowerCase();
}

function normalizeStatus(status = "", deadline = "") {
    const normalized = normalizeText(status);
    const todayYMD = getTodayYMDInManila();

    if (normalized === "completed") return "completed";
    if (deadline && deadline < todayYMD) return "overdue";
    if (normalized === "overdue") return "overdue";
    if (normalized === "ongoing") return "ongoing";
    return "other";
}

function normalizePriority(priority = "") {
    const normalized = normalizeText(priority);
    if (normalized === "high") return "high";
    if (normalized === "medium") return "medium";
    if (normalized === "low") return "low";
    return "medium";
}

function normalizeTask(task = {}) {
    const normalizedStatus = normalizeStatus(task.status, task.deadline);
    const normalizedPriority = normalizePriority(task.priority);

    return {
        ...task,
        id: task.id ?? `${task.title || "task"}-${task.deadline || Math.random()}`,
        title: task.title || "Untitled Task",
        description: task.description || "",
        remarks: task.remarks || "",
        assignee: task.assignee || "",
        project_name: task.project_name || "",
        start_date: task.start_date || "",
        deadline: task.deadline || "",
        status: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1),
        priority: normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1),
        normalizedStatus,
        normalizedPriority,
        isCompleted: normalizedStatus === "completed",
        isOverdue: normalizedStatus === "overdue"
    };
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
    other: "status-other"
};

function getPriorityTone(priority = "") {
    return priorityToneMap[normalizeText(priority)] || "priority-medium";
}

function getStatusTone(status = "") {
    return statusToneMap[normalizeText(status)] || "status-other";
}

function App() {
    const [tasks, setTasks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    const fetchTasks = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("php/get_tasks.php", {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("The server did not return a valid task list.");
            }

            setTasks(data.map(normalizeTask));
        } catch (err) {
            console.error("Error fetching tasks:", err);
            setError(err.message || "Unable to load tasks.");
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchTasks();
    }, []);

    return (
        <>
            <TaskSummary tasks={tasks} />
            <TaskTable
                tasks={tasks}
                loading={loading}
                error={error}
                onRetry={fetchTasks}
            />
        </>
    );
}

function TaskSummary({ tasks }) {
    const total = tasks.length;
    const ongoing = tasks.filter(task => task.normalizedStatus === "ongoing").length;
    const completed = tasks.filter(task => task.normalizedStatus === "completed").length;
    const overdue = tasks.filter(task => task.normalizedStatus === "overdue").length;

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
        <section className="stats-strip mb-4">
            <div className="stats-strip-inner">
                {stats.map(item => (
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
        </section>
    );
}

function DueSoon({ tasks }) {
    const today = parseYMDToUTC(getTodayYMDInManila());

    const dueSoonTasks = tasks.filter(task => {
        if (task.isCompleted || !task.deadline) return false;

        const deadline = parseYMDToUTC(task.deadline);
        if (!deadline || !today) return false;

        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return diffDays === 0 || diffDays === 1;
    });

    const getDueLabel = (deadlineStr) => {
        const deadline = parseYMDToUTC(deadlineStr);
        if (!deadline || !today) return "";

        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Due Today";
        if (diffDays === 1) return "Due Tomorrow";
        return "";
    };

    return (
        <section className="due-soon-card mb-4">
            <div className="due-soon-head">
                <h5 className="due-soon-title">
                    <i className="bi bi-alarm"></i>
                    Due Soon
                </h5>
            </div>

            {dueSoonTasks.length === 0 ? (
                <div className="due-soon-empty">No upcoming deadlines</div>
            ) : (
                <ul className="due-soon-list">
                    {dueSoonTasks.map(task => (
                        <li key={task.id} className="due-soon-item">
                            <div className="due-soon-copy">
                                <div className="due-soon-task">{task.title}</div>
                                <div className="due-soon-date">{formatDate(task.deadline)}</div>
                            </div>
                            <span className="due-soon-badge">{getDueLabel(task.deadline)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function TaskTable({ tasks, loading, error, onRetry }) {
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [statusFilter, setStatusFilter] = React.useState("All");
    const filterRef = React.useRef(null);
    const [selectedTaskIds, setSelectedTaskIds] = React.useState([]);
    const checkAllRef = React.useRef(null);

    const filterOptions = ["All", "Ongoing", "Completed", "Overdue", "Other"];

    React.useEffect(() => {
        const handleOutsideClick = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const filteredTasks = tasks.filter(task => {
        if (statusFilter === "All") return true;
        return task.normalizedStatus === normalizeText(statusFilter);
    });

    const visibleTaskIds = filteredTasks.map(task => task.id);
    const selectedVisibleCount = visibleTaskIds.filter(id => selectedTaskIds.includes(id)).length;

    const allVisibleSelected =
        visibleTaskIds.length > 0 && selectedVisibleCount === visibleTaskIds.length;

    const someVisibleSelected =
        selectedVisibleCount > 0 && !allVisibleSelected;

    React.useEffect(() => {
        if (!checkAllRef.current) return;
        checkAllRef.current.indeterminate = someVisibleSelected;
    }, [someVisibleSelected]);

    React.useEffect(() => {
        setSelectedTaskIds(prev =>
            prev.filter(id => tasks.some(task => task.id === id))
        );
    }, [tasks]);

    const toggleTaskSelection = (taskId) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const toggleSelectAllVisible = () => {
        setSelectedTaskIds(prev => {
            if (allVisibleSelected) {
                return prev.filter(id => !visibleTaskIds.includes(id));
            }

            const merged = new Set([...prev, ...visibleTaskIds]);
            return Array.from(merged);
        });
    };
    return (
        <>
            <section className="task-board">
                <div className="task-board-head">
                    <div>
                        <h5 className="task-board-title">Your Tasks</h5>
                    </div>

                    <div className="task-board-actions">
                        <div className="task-filter" ref={filterRef}>
                            <button
                                type="button"
                                className={`task-filter-btn ${isFilterOpen ? "is-open" : ""}`}
                                onClick={() => setIsFilterOpen(prev => !prev)}
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
                                    {filterOptions.map(option => (
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
                    <div
                        className="task-board-check-all"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <label className="task-checkbox-wrap" onClick={(event) => event.stopPropagation()}>
                            <input
                                ref={checkAllRef}
                                type="checkbox"
                                className="task-checkbox-input"
                                checked={allVisibleSelected}
                                onChange={toggleSelectAllVisible}
                                aria-label={`Select all ${statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}tasks`}
                            />
                            <span className="task-checkbox-ui"></span>
                        </label>

                        <span className="task-board-check-all-text">Check All</span>
                    </div>

                    <div className="task-board-strip-meta">
                        <span className="task-board-filter-state">Showing: {statusFilter}</span>
                        <span className="task-board-count">{filteredTasks.length}</span>

                        {selectedVisibleCount > 0 && (
                            <span className="task-board-selected-count">
                                {selectedVisibleCount} selected
                            </span>
                        )}
                    </div>
                </div>

                <div className="task-board-table-wrap">
                    <table className="table task-board-table align-middle mb-0">
                        <thead>
                            <tr>
                                <th className="task-board-checkbox-col"></th>
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
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="task-board-empty">Loading tasks...</td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="task-board-empty">
                                        <div className="task-board-feedback">
                                            <div className="task-board-error">{error}</div>
                                            <button type="button" className="task-action-btn" onClick={onRetry}>
                                                Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="task-board-empty">
                                        No {statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}tasks found
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map(task => (
                                    <tr
                                        key={task.id}
                                        className={`task-board-row ${selectedTaskIds.includes(task.id) ? "is-selected" : ""}`}
                                        onClick={() => toggleTaskSelection(task.id)}
                                    >
                                    <td
                                        className="task-board-checkbox-col"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <label className="task-checkbox-wrap" onClick={(event) => event.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="task-checkbox-input"
                                                checked={selectedTaskIds.includes(task.id)}
                                                onChange={() => toggleTaskSelection(task.id)}
                                                aria-label={`Select ${task.title}`}
                                            />
                                            <span className="task-checkbox-ui"></span>
                                        </label>
                                    </td>

                                    <td>
                                        <div className="task-board-name-cell">
                                            <div className="task-board-name-copy">
                                                <div className="task-board-task-title">{task.title}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="task-board-date">{formatDate(task.start_date)}</td>
                                    <td className="task-board-date">{formatDate(task.deadline)}</td>

                                    <td>
                                        <span className={`task-pill task-status-pill ${getStatusTone(task.normalizedStatus)}`}>
                                            {task.status}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={`task-priority-pill ${getPriorityTone(task.normalizedPriority)}`}>
                                            <i className="bi bi-flag-fill"></i>
                                            {getPriorityLabel(task.normalizedPriority)}
                                        </span>
                                    </td>
                                </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function getPriorityLabel(priority = "") {
    const normalized = normalizeText(priority);

    if (normalized === "high") return "High Priority";
    if (normalized === "medium") return "Normal Priority";
    if (normalized === "low") return "Low Priority";

    return "Normal Priority";
}


ReactDOM.createRoot(document.getElementById("root")).render(<App />);