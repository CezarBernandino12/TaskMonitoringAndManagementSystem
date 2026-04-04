// js/task.jsx

function normalizeText(value = "") {
    return String(value).trim().toLowerCase();
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function getLaneKey(task = {}) {
    const normalized = normalizeText(task.status);

    if (normalized === "completed") return "completed";
    if (task.is_overdue || normalized === "overdue") return "overdue";
    return "ongoing";
}

function getLaneMeta(laneKey) {
    if (laneKey === "overdue") {
        return {
            title: "Overdue",
            badgeClass: "task-lane-badge task-lane-badge-overdue",
            dotClass: "task-lane-dot task-lane-dot-overdue",
            iconClass: "bi-exclamation-circle"
        };
    }

    if (laneKey === "completed") {
        return {
            title: "Completed",
            badgeClass: "task-lane-badge task-lane-badge-completed",
            dotClass: "task-lane-dot task-lane-dot-completed",
            iconClass: "bi-check2-circle"
        };
    }

    return {
        title: "Ongoing",
        badgeClass: "task-lane-badge task-lane-badge-ongoing",
        dotClass: "task-lane-dot task-lane-dot-ongoing",
        iconClass: "bi-arrow-repeat"
    };
}

function getPriorityClass(priority = "") {
    const normalized = normalizeText(priority);

    if (normalized === "high") return "task-priority-high";
    if (normalized === "medium") return "task-priority-medium";
    return "task-priority-low";
}

function getAssigneeInitials(assignee = "") {
    const words = String(assignee).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "NA";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function App() {
    const [tasks, setTasks] = React.useState([]);

    const fetchTasks = async () => {
        try {
            const response = await fetch("http://localhost/taskmanagement/staff/php/get_tasks.php");
            const data = await response.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error:", error);
            setTasks([]);
        }
    };

    React.useEffect(() => {
        fetchTasks();
    }, []);

    return (
        <div className="task-view">
            <div className="task-toolbar">
                <div className="task-toolbar-left">
                    <button type="button" className="task-toolbar-chip">
                        <i className="bi bi-calendar3"></i>
                        <span>Due Date</span>
                        <i className="bi bi-chevron-down"></i>
                    </button>


                    <button type="button" className="task-toolbar-chip">
                        <i className="bi bi-flag"></i>
                        <span>Priority</span>
                        <i className="bi bi-chevron-down"></i>
                    </button>
                </div>

                <button
                    type="button"
                    className="task-create-btn"
                    onClick={() => document.getElementById("openReactModalBtn").click()}
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>Add New</span>
                </button>
            </div>

            <ModalController refreshTasks={fetchTasks} />

            <TaskTable tasks={tasks} refreshTasks={fetchTasks} />
        </div>
    );
}

function TaskTable({ tasks, refreshTasks }) {
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [showDetailModal, setShowDetailModal] = React.useState(false);

    const ongoingTasks = tasks.filter(task => getLaneKey(task) === "ongoing");
    const overdueTasks = tasks.filter(task => getLaneKey(task) === "overdue");
    const completedTasks = tasks.filter(task => getLaneKey(task) === "completed");

    const handleRowClick = (task) => {
        setSelectedTask(task);
        setShowDetailModal(true);
    };

    return (
        <>
            <div className="task-board-shell">
                <TaskLane
                    laneKey="ongoing"
                    tasks={ongoingTasks}
                    onRowClick={handleRowClick}
                />

                <TaskLane
                    laneKey="overdue"
                    tasks={overdueTasks}
                    onRowClick={handleRowClick}
                />

                <TaskLane
                    laneKey="completed"
                    tasks={completedTasks}
                    onRowClick={handleRowClick}
                />
            </div>

            {showDetailModal && selectedTask && (
                <TaskDetailModal
                    show={showDetailModal}
                    task={selectedTask}
                    onClose={() => setShowDetailModal(false)}
                    refreshTasks={refreshTasks}
                />
            )}
        </>
    );
}

function TaskLane({ laneKey, tasks, onRowClick }) {
    const meta = getLaneMeta(laneKey);

    return (
        <section className="task-lane-card">
            <div className="task-lane-head">
                <div className="task-lane-head-left">
                    <button type="button" className="task-lane-icon-btn" aria-label={`Open ${meta.title}`}>
                        <i className="bi bi-chevron-down"></i>
                    </button>

                    <span className={meta.badgeClass}>
                        <span className={meta.dotClass}></span>
                        {meta.title}
                    </span>
                </div>

                <button type="button" className="task-lane-icon-btn" aria-label={`${meta.title} menu`}>
                    <i className="bi bi-three-dots"></i>
                </button>
            </div>

            <div className="task-lane-grid">
                <div className="task-lane-grid-head">
                    <div>Task Name</div>
                    <div>Assignee</div>
                    <div>Due Date</div>
                    <div>Priority</div>
                    <div></div>
                </div>

                <div className="task-lane-grid-body">
                    {tasks.length === 0 ? (
                        <div className="task-lane-empty">
                            No tasks found
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div
                                key={task.id}
                                className={`task-lane-row ${task.is_overdue ? "is-overdue" : ""}`}
                                onClick={() => onRowClick(task)}
                                role="button"
                                tabIndex="0"
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        onRowClick(task);
                                    }
                                }}
                            >
                                <div className="task-lane-col task-lane-col-name">
                                    <span className="task-lane-title">{task.title}</span>
                                </div>

                                <div className="task-lane-col task-lane-col-assignee">
                                    {task.assignee ? (
                                        <div className="task-assignee-chip" title={task.assignee}>
                                            <span className="task-assignee-avatar">
                                                {getAssigneeInitials(task.assignee)}
                                            </span>
                                            <span className="task-assignee-name">{task.assignee}</span>
                                        </div>
                                    ) : (
                                        <span className="task-assignee-empty">
                                            <i className="bi bi-person-circle"></i>
                                            Assign
                                        </span>
                                    )}
                                </div>

                                <div className="task-lane-col task-lane-col-date">
                                    {formatDate(task.deadline)}
                                </div>

                                <div className="task-lane-col task-lane-col-priority">
                                    <span className={`task-priority-tag ${getPriorityClass(task.priority)}`}>
                                        <i className="bi bi-flag-fill"></i>
                                        {task.priority || "Low"}
                                    </span>
                                </div>

                                <div className="task-lane-col task-lane-col-menu">
                                    <i className="bi bi-three-dots"></i>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

// Modal component
function TaskDetailModal({ show, task, onClose, refreshTasks }) {
    const [status, setStatus] = React.useState(task.status);

    React.useEffect(() => {
        setStatus(task.status);
    }, [task]);

    if (!show || !task) return null;

    const handleStatusChange = (e) => {
        setStatus(e.target.value);
    };

    const handleSave = async () => {
        try {
            const formData = new FormData();
            formData.append("task_id", task.id);
            formData.append("status", status);

            const res = await fetch("http://localhost/taskmanagement/staff/php/update_task_status.php", {
                method: "POST",
                body: formData
            });

            const result = await res.text();
            alert(result);

            onClose();
            refreshTasks();
        } catch (error) {
            alert("Failed to update task");
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this task?")) return;

        try {
            const formData = new FormData();
            formData.append("task_id", task.id);

            const res = await fetch("http://localhost/taskmanagement/staff/php/delete_task.php", {
                method: "POST",
                body: formData
            });

            const result = await res.text();
            alert(result);

            onClose();
            refreshTasks();
        } catch (error) {
            alert("Failed to delete task");
            console.error(error);
        }
    };

    return (
        <div className="task-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content task-modal-card">
                    <div className="modal-header task-modal-head">
                        <div>
                            <h5 className="modal-title task-modal-title">Task Details</h5>
                            <div className="task-modal-subtitle">Update task status or remove task</div>
                        </div>

                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body task-modal-body">
                        <div className="task-detail-grid">
                            <div className="task-detail-box">
                                <div className="task-detail-label">Title</div>
                                <div className="task-detail-value">{task.title}</div>
                            </div>

                            <div className="task-detail-box">
                                <div className="task-detail-label">Priority</div>
                                <div className="task-detail-value">{task.priority || "-"}</div>
                            </div>

                            <div className="task-detail-box">
                                <div className="task-detail-label">Start Date</div>
                                <div className="task-detail-value">{task.start_date || "-"}</div>
                            </div>

                            <div className="task-detail-box">
                                <div className="task-detail-label">Deadline</div>
                                <div className="task-detail-value">{task.deadline || "-"}</div>
                            </div>
                        </div>

                        <div className="task-detail-box task-detail-box-block">
                            <div className="task-detail-label">Description</div>
                            <div className="task-detail-value task-detail-value-multiline">
                                {task.description || "-"}
                            </div>
                        </div>

                        <div className="task-detail-box task-detail-box-block">
                            <div className="task-detail-label">Status</div>
                            <select className="form-select task-modal-select" value={status} onChange={handleStatusChange}>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-footer task-modal-foot">
                        <button className="btn task-btn task-btn-danger" onClick={handleDelete}>
                            Delete
                        </button>

                        <button className="btn task-btn task-btn-primary" onClick={handleSave}>
                            Save
                        </button>

                        <button className="btn task-btn task-btn-neutral" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AddTaskModal({ show, onClose, refreshTasks }) {
    const [taskName, setTaskName] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [deadline, setDeadline] = React.useState("");
    const [priority, setPriority] = React.useState("Low");

    if (!show) return null;

    const handleSubmit = async () => {
        const formData = new FormData();
        formData.append("task_name", taskName);
        formData.append("description", "");
        formData.append("start_date", startDate);
        formData.append("deadline", deadline);
        formData.append("priority", priority);

        try {
            const response = await fetch("http://localhost/taskmanagement/staff/php/create_task.php", {
                method: "POST",
                body: formData
            });

            const result = await response.text();
            alert(result);

            refreshTasks();

            setTaskName("");
            setStartDate("");
            setDeadline("");
            setPriority("Low");

            onClose();
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (
        <div className="task-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content task-modal-card">
                    <div className="modal-header task-modal-head">
                        <div>
                            <h5 className="modal-title task-modal-title">Add Task</h5>
                            <div className="task-modal-subtitle">Create a new task entry</div>
                        </div>

                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body task-modal-body">
                        <div className="mb-3">
                            <label className="form-label task-form-label">Task Name</label>
                            <input
                                type="text"
                                className="form-control task-form-control"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label task-form-label">Start Date</label>
                            <input
                                type="date"
                                className="form-control task-form-control"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label task-form-label">Due Date</label>
                            <input
                                type="date"
                                className="form-control task-form-control"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                        </div>

                        <div className="mb-0">
                            <label className="form-label task-form-label">Priority</label>
                            <select
                                className="form-select task-form-control"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-footer task-modal-foot">
                        <button type="button" className="btn task-btn task-btn-neutral" onClick={onClose}>
                            Close
                        </button>

                        <button type="button" className="btn task-btn task-btn-primary" onClick={handleSubmit}>
                            Add Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalController({ refreshTasks }) {
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const btn = document.getElementById("openReactModalBtn");
        if (btn) {
            btn.onclick = () => setShow(true);
        }

        return () => {
            if (btn) btn.onclick = null;
        };
    }, []);

    return (
        <AddTaskModal
            show={show}
            onClose={() => setShow(false)}
            refreshTasks={refreshTasks}
        />
    );
}

function DueSoon({ tasks }) {
    const today = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    const dueSoonTasks = tasks.filter(task => {
        if (task.status.toLowerCase() === "completed") return false;

        const deadline = new Date(task.deadline + "T00:00:00");
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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

function DashboardHeader() {
    const [dept, setDept] = React.useState("");
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetch("php/get_department_name.php")
            .then(res => res.json())
            .then(data => {
                if (data.department_name) setDept(data.department_name);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return null;
}

const dashboardHeaderRoot = document.getElementById("dashboard-header-root");
if (dashboardHeaderRoot) {
    ReactDOM.createRoot(dashboardHeaderRoot).render(<DashboardHeader />);
}

const rootElement = document.getElementById("root");
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<App />);
}