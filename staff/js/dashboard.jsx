import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";
window.sileo = sileo;


function showSileoToast(payload) {
    if (window.sileo?.info) {
        window.sileo.info(payload);
        return;
    }

    console.warn("Sileo is not ready yet.", payload);
}

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

    const fetchTasks = async ({ showLoader = true } = {}) => {
        if (showLoader) setLoading(true);
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
            if (showLoader) setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchTasks();
    }, []);

    const updateTaskStatusOnServer = async (taskId, status) => {
        const body = new URLSearchParams();
        body.append("task_id", taskId);
        body.append("status", status);

        const response = await fetch("php/update_task_status.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: body.toString()
        });

        const resultText = (await response.text()).trim();

        if (!response.ok || !/successfully/i.test(resultText)) {
            throw new Error(resultText || `Failed to update task ${taskId}.`);
        }

        return resultText;
    };

const handleBulkUpdateStatus = async (taskIds, nextStatus) => {
    const previousTasks = tasks;
    const scrollY = window.scrollY;
    setError("");

    setTasks(prev =>
        prev.map(task =>
            taskIds.includes(task.id)
                ? normalizeTask({ ...task, status: nextStatus })
                : task
        )
    );

    try {
        await Promise.all(
            taskIds.map(taskId => updateTaskStatusOnServer(taskId, nextStatus))
        );

        await fetchTasks({ showLoader: false });

        window.requestAnimationFrame(() => {
            window.scrollTo({
                top: scrollY,
                behavior: "auto"
            });
        });

        const normalizedStatus = normalizeText(nextStatus);

        if (normalizedStatus === "completed") {
            window.sileo?.success({
                title: "Status updated",
                description: `${taskIds.length} ${taskIds.length === 1 ? "task was" : "tasks were"} marked as Completed.`
            });
        } else if (normalizedStatus === "ongoing") {
            window.sileo?.info({
                title: "Status updated",
                description: `${taskIds.length} ${taskIds.length === 1 ? "task was" : "tasks were"} moved to Ongoing.`
            });
        } else {
            window.sileo?.info({
                title: "Status updated",
                description: `${taskIds.length} ${taskIds.length === 1 ? "task was" : "tasks were"} updated to ${nextStatus}.`
            });
        }
    } catch (err) {
        console.error("Bulk status update failed:", err);
        setTasks(previousTasks);
        setError(err.message || "Unable to save status update.");

        window.sileo?.error({
            title: "Update failed",
            description: err.message || "Unable to save task status."
        });
    }
};

const updateTaskPriorityOnServer = async (taskId, priority) => {
    const body = new URLSearchParams();
    body.append("task_id", taskId);
    body.append("priority", priority);

    const response = await fetch("php/update_task_priority.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: body.toString()
    });

    const resultText = (await response.text()).trim();

    if (!response.ok || !/successfully/i.test(resultText)) {
        throw new Error(resultText || `Failed to update priority for task ${taskId}.`);
    }

    return resultText;
};

const deleteTaskOnServer = async (taskId) => {
    const body = new URLSearchParams();
    body.append("task_id", taskId);

    const response = await fetch("php/delete_task.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: body.toString()
    });

    const resultText = (await response.text()).trim();

    if (!response.ok || !/successfully/i.test(resultText)) {
        throw new Error(resultText || `Failed to delete task ${taskId}.`);
    }

    return resultText;
};

const handleBulkDelete = async (taskIds) => {
    const previousTasks = tasks;
    const scrollY = window.scrollY;
    setError("");

    setTasks(prev => prev.filter(task => !taskIds.includes(task.id)));

    try {
        await Promise.all(
            taskIds.map(taskId => deleteTaskOnServer(taskId))
        );

        await fetchTasks({ showLoader: false });

        window.requestAnimationFrame(() => {
            window.scrollTo({
                top: scrollY,
                behavior: "auto"
            });
        });

        window.sileo?.success({
            title: "Tasks deleted",
            description: `${taskIds.length} ${taskIds.length === 1 ? "task has" : "tasks have"} been removed.`
        });
    } catch (err) {
        console.error("Bulk delete failed:", err);
        setTasks(previousTasks);
        setError(err.message || "Unable to delete selected tasks.");

        window.sileo?.error({
            title: "Delete failed",
            description: err.message || "Unable to delete selected tasks."
        });
    }
};

const handleBulkUpdatePriority = async (taskIds, nextPriority) => {
    const previousTasks = tasks;
    const scrollY = window.scrollY;
    setError("");

    setTasks(prev =>
        prev.map(task =>
            taskIds.includes(task.id)
                ? normalizeTask({ ...task, priority: nextPriority })
                : task
        )
    );

    try {
        await Promise.all(
            taskIds.map(taskId => updateTaskPriorityOnServer(taskId, nextPriority))
        );

        await fetchTasks({ showLoader: false });

        window.requestAnimationFrame(() => {
            window.scrollTo({
                top: scrollY,
                behavior: "auto"
            });
        });

        window.sileo?.info({
            title: "Priority updated",
            description: `${taskIds.length} ${taskIds.length === 1 ? "task was" : "tasks were"} updated to ${nextPriority}.`
        });
    } catch (err) {
        console.error("Bulk priority update failed:", err);
        setTasks(previousTasks);
        setError(err.message || "Unable to save priority update.");

        window.sileo?.error({
            title: "Update failed",
            description: err.message || "Unable to save task priority."
        });
    }
};

    return (
        <>
            <TaskSummary tasks={tasks} />
            <TaskTable
                tasks={tasks}
                loading={loading}
                error={error}
                onRetry={fetchTasks}
                onBulkUpdateStatus={handleBulkUpdateStatus}
                onBulkUpdatePriority={handleBulkUpdatePriority}
                onBulkDelete={handleBulkDelete}
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

function TaskTable({
    tasks,
    loading,
    error,
    onRetry,
    onBulkUpdateStatus,
    onBulkUpdatePriority,
    onBulkDelete
}) {
    const ITEMS_PER_PAGE = 10;

    const [selectedTaskIds, setSelectedTaskIds] = React.useState([]);
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [statusFilter, setStatusFilter] = React.useState("All");
    const [currentPage, setCurrentPage] = React.useState(1);

    const filterRef = React.useRef(null);
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

    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ITEMS_PER_PAGE));
    const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPageTasks = filteredTasks.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter]);

    React.useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const visibleTaskIds = currentPageTasks.map(task => task.id);
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

    const clearSelection = () => {
        setSelectedTaskIds([]);
    };

    const getPaginationItems = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const items = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        if (start > 2) items.push("left-ellipsis");

        for (let page = start; page <= end; page += 1) {
            items.push(page);
        }

        if (end < totalPages - 1) items.push("right-ellipsis");

        items.push(totalPages);
        return items;
    };

    const paginationItems = getPaginationItems();
    const pageFrom = filteredTasks.length === 0 ? 0 : pageStartIndex + 1;
    const pageTo = Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredTasks.length);

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
                        <label
                            className="task-checkbox-wrap"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <input
                                ref={checkAllRef}
                                type="checkbox"
                                className="task-checkbox-input"
                                checked={allVisibleSelected}
                                onChange={toggleSelectAllVisible}
                                aria-label={`Select all ${statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}tasks on this page`}
                            />
                            <span className="task-checkbox-ui"></span>
                        </label>

                        <span className="task-board-check-all-text">Check All</span>
                    </div>

                    <div className="task-board-strip-meta">
                        <span className="task-board-filter-state">Showing: {statusFilter}</span>
                        <span className="task-board-count">{filteredTasks.length}</span>

                        {selectedTaskIds.length > 0 && (
                            <span className="task-board-selected-count">
                                {selectedTaskIds.length} selected
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
                                            <button
                                                type="button"
                                                className="task-action-btn"
                                                onClick={() => onRetry()}
                                            >
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
                                currentPageTasks.map(task => (
                                    <tr
                                        key={task.id}
                                        className={`task-board-row ${selectedTaskIds.includes(task.id) ? "is-selected" : ""}`}
                                        onClick={() => toggleTaskSelection(task.id)}
                                    >
                                        <td
                                            className="task-board-checkbox-col"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <label
                                                className="task-checkbox-wrap"
                                                onClick={(event) => event.stopPropagation()}
                                            >
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

                {!loading && !error && filteredTasks.length > 0 && (
                    <div className="task-board-pagination">

                        <div className="task-board-pagination-controls">
                            <button
                                type="button"
                                className="task-page-btn task-page-nav"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                aria-label="Previous page"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            {paginationItems.map(item =>
                                typeof item === "number" ? (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`task-page-btn ${currentPage === item ? "is-active" : ""}`}
                                        onClick={() => setCurrentPage(item)}
                                        aria-current={currentPage === item ? "page" : undefined}
                                    >
                                        {item}
                                    </button>
                                ) : (
                                    <span key={item} className="task-page-ellipsis">…</span>
                                )
                            )}

                            <button
                                type="button"
                                className="task-page-btn task-page-nav"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                aria-label="Next page"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {selectedTaskIds.length > 0 && (
                <BulkActionBar
                    selectedCount={selectedTaskIds.length}
                    selectedTaskIds={selectedTaskIds}
                    onUpdateStatus={(ids, status) => {
                        onBulkUpdateStatus(ids, status);
                    }}
                    onUpdatePriority={(ids, priority) => {
                        onBulkUpdatePriority(ids, priority);
                    }}
                    onDelete={(ids) => {
                        onBulkDelete(ids);
                        clearSelection();
                    }}
                    onClearSelection={clearSelection}
                />
            )}
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

function BulkActionBar({
    selectedCount,
    selectedTaskIds,
    onUpdateStatus,
    onUpdatePriority,
    onDelete,
    onClearSelection
}) {
    const [openMenu, setOpenMenu] = React.useState("");
    const barRef = React.useRef(null);

    React.useEffect(() => {
        const handleOutsideClick = (event) => {
            if (barRef.current && !barRef.current.contains(event.target)) {
                setOpenMenu("");
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const statusOptions = ["Ongoing", "Completed"];
    const priorityOptions = ["High", "Medium", "Low"];

    return (
        <div className="bulk-action-bar" ref={barRef}>
            <div className="bulk-action-main">
                <div className="bulk-action-count">{selectedCount}</div>

                <div className="bulk-action-copy">
                    <div className="bulk-action-title">
                        {selectedCount === 1 ? "Task selected" : "Tasks selected"}
                    </div>
                    <div className="bulk-action-subtitle">Manage selected items</div>
                </div>
            </div>

            <div className="bulk-action-actions">
                <div className="bulk-action-group">
                    <button
                        type="button"
                        className={`bulk-action-tool ${openMenu === "status" ? "is-open" : ""}`}
                        onClick={() => setOpenMenu(prev => prev === "status" ? "" : "status")}
                    >
                        <span className="bulk-action-tool-icon">
                            <i className="bi bi-check2-square"></i>
                        </span>
                        <span className="bulk-action-tool-label-row">
                            <span className="bulk-action-tool-label">Update status</span>
                            <i className={`bi ${openMenu === "status" ? "bi-chevron-up" : "bi-chevron-down"} bulk-action-tool-caret`}></i>
                        </span>
                    </button>

                    {openMenu === "status" && (
                        <div className="bulk-action-menu">
                            {statusOptions.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    className="bulk-action-menu-item"
                                    onClick={() => {
                                        onUpdateStatus(selectedTaskIds, option);
                                        setOpenMenu("");
                                    }}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bulk-action-group">
                    <button
                        type="button"
                        className={`bulk-action-tool ${openMenu === "priority" ? "is-open" : ""}`}
                        onClick={() => setOpenMenu(prev => prev === "priority" ? "" : "priority")}
                    >
                        <span className="bulk-action-tool-icon">
                            <i className="bi bi-flag"></i>
                        </span>
                        <span className="bulk-action-tool-label-row">
                            <span className="bulk-action-tool-label">Update priority</span>
                            <i className={`bi ${openMenu === "priority" ? "bi-chevron-up" : "bi-chevron-down"} bulk-action-tool-caret`}></i>
                        </span>
                    </button>

                    {openMenu === "priority" && (
                        <div className="bulk-action-menu">
                            {priorityOptions.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    className="bulk-action-menu-item"
                                    onClick={() => {
                                        onUpdatePriority(selectedTaskIds, option);
                                        setOpenMenu("");
                                    }}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className="bulk-action-tool is-danger"
                    onClick={() => {
                        onDelete(selectedTaskIds);
                        onClearSelection();
                    }}
                >
                    <span className="bulk-action-tool-icon">
                        <i className="bi bi-trash3"></i>
                    </span>
                    <span className="bulk-action-tool-label-row">
                        <span className="bulk-action-tool-label">Delete</span>
                    </span>
                </button>
            </div>

            <button
                type="button"
                className="bulk-action-close"
                onClick={onClearSelection}
                aria-label="Close bulk actions"
                title="Close"
            >
                <i className="bi bi-x-lg"></i>
            </button>
        </div>
    );
}


ReactDOM.createRoot(document.getElementById("root")).render(<App />);