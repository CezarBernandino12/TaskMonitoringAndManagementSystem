

        const statusColorMap = {
        'Ongoing': '#ffe066',   
        'Completed': '#b6e388', 
        'Overdue': '#ffb3b3',  
        'Other': '#ffe082',     
        'Extra': '#fff8e1'      
    };

    
function App() {
    const [tasks, setTasks] = React.useState([]);

    // Load tasks from PHP
    const fetchTasks = async () => {
        try {
            const response = await fetch("http://localhost/taskmanagement/staff/php/get_tasks.php");
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

// Modal component
function TaskDetailModal({ show, task, onClose, refreshTasks }) {
    const [status, setStatus] = React.useState(task.status);

    React.useEffect(() => {
        setStatus(task.status);
    }, [task]);

    if (!show || !task) return null;

    // Only updates state locally
    const handleStatusChange = (e) => {
        setStatus(e.target.value);
    };

    // Save status to backend
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
            refreshTasks(); // refresh table without reload

        } catch (error) {
            alert("Failed to update task");
            console.error(error);
        }
    };

    // Delete task
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
            refreshTasks(); // refresh table

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
                        <button className="btn btn-danger" onClick={handleDelete}>
                            Delete
                        </button>

                        <button className="btn btn-primary" onClick={handleSave}>
                            Save
                        </button>

                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}



function TaskSummary({ tasks }) {

    const total = tasks.length;

    const ongoing = tasks.filter(task => task.status === "Ongoing").length;

    const completed = tasks.filter(task => task.status === "Completed").length;

    const overdue = tasks.filter(task => task.is_overdue).length;

    return (
        <div className="row mb-4">
            <div className="col-md-3">
                <div className="card summary-card text-center p-3">
                    <h5>Total Tasks</h5>
                    <h3>{total}</h3>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card summary-card text-center p-3">
                    <h5>Ongoing</h5>
                    <h3>{ongoing}</h3>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card summary-card text-center p-3">
                    <h5>Completed</h5>
                    <h3>{completed}</h3>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card summary-card text-center p-3">
                    <h5>Overdue</h5>
                    <h3>{overdue}</h3>
                </div>
            </div>
        </div>
    );
}

function DueSoon({ tasks }) {

    // Get "today" in Philippine time
    const today = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    // Filter tasks due today or tomorrow
    const dueSoonTasks = tasks.filter(task => {
        if (task.status.toLowerCase() === "completed") return false;

        const deadline = new Date(task.deadline + "T00:00:00");

        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Only today or tomorrow
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
        return ""; // this should never appear
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

function DashboardHeader() {
    const [dept, setDept] = React.useState('');
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetch('php/get_department_name.php')
            .then(res => res.json())
            .then(data => {
                if (data.department_name) setDept(data.department_name);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>
                {loading ? 'Loading...' : dept ? `${dept} - Staff Dashboard` : 'Staff Dashboard'}
            </h3>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('dashboard-header-root')).render(<DashboardHeader />);
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
