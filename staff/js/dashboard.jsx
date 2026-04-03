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
            <DueSoon tasks={tasks} />
            <TaskTable tasks={tasks} refreshTasks={fetchTasks} />
        </>
    );
}

function TaskTable({ tasks, refreshTasks }) {
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [showDetailModal, setShowDetailModal] = React.useState(false);

    const handleRowClick = (task) => {
        setSelectedTask(task);
        setShowDetailModal(true);
    };

    return (
        <>
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th>Task</th>
                        <th>Start</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.length === 0 ? (
                        <tr>
                            <td colSpan="5">No tasks found</td>
                        </tr>
                    ) : (
                        tasks.map(task => (
                            <tr
                                key={task.id}
                                style={{ backgroundColor: task.is_overdue ? '#f8d7da' : '', cursor: 'pointer' }}
                                onClick={() => handleRowClick(task)}
                            >
                                <td>{task.title}</td>
                                <td>{formatDate(task.start_date)}</td>
                                <td>{formatDate(task.deadline)}</td>
                                <td
                                    style={{
                                        backgroundColor: statusColorMap[task.status] || '#ffffff',
                                        color: '#000',
                                        textAlign: 'center',
                                        padding: '4px 8px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    {task.status}
                                </td>
                                <td>{task.priority}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

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

            const res = await fetch("php/update_task_status.php", {
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

            const res = await fetch("php/delete_task.php", {
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
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Task Details</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="mb-2"><strong>Title:</strong> {task.title}</div>
                        <div className="mb-2"><strong>Description:</strong> {task.description || "-"}</div>
                        <div className="mb-2"><strong>Start Date:</strong> {task.start_date}</div>
                        <div className="mb-2"><strong>Deadline:</strong> {task.deadline}</div>
                        <div className="mb-2"><strong>Priority:</strong> {task.priority}</div>
                        <div className="mb-2">
                            <strong>Status:</strong>
                            <select className="form-select mt-1" value={status} onChange={handleStatusChange}>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                        <button className="btn btn-primary" onClick={handleSave}>Save</button>
                        <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
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