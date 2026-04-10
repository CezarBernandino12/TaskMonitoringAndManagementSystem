const { useEffect, useState, useRef } = React;

// ====================================================================
// SIDEBAR
// ====================================================================



function Sidebar() {
    const [showUsers,   setShowUsers]   = useState(false);
    const [showReports, setShowReports] = useState(false);

    const NavGroup = ({ label, open, onToggle, children }) => (
        <>
            <a href="#" className="nav-link fw-semibold d-flex justify-content-between align-items-center"
               onClick={e => { e.preventDefault(); onToggle(); }} style={{ cursor: 'pointer' }}>
                <span>{label}</span>
                <span style={{ fontSize: '1em' }}>{open ? '▼' : '▶'}</span>
            </a>
            {open && <div style={{ marginLeft: 12 }}>{children}</div>}
        </>
    );

    return (
        <nav className="sidebar-orange d-flex flex-column min-vh-100" style={{ minWidth: 0 }}>
            <div className="sidebar-logo">⚙ Admin Panel</div>

            {/* Overview */}
            <div className="sidebar-section">Overview</div>
            <a href="dashboard.html" className="nav-link active">Dashboard</a>

            {/* User Management */}
            <div className="sidebar-section">User Management</div>
            <a href="users.html"  className="nav-link">Manage Users</a>
            <a href="departments.html"  className="nav-link">Departments</a>

              {/* Event Management */}
                <div className="sidebar-section">Event Management</div>
                <a href="calendar.html"    className="nav-link">Calendar</a>

            {/* Reports */}
            <div className="sidebar-section">Reports</div>
            <NavGroup label="Reports" open={showReports} onToggle={() => setShowReports(p => !p)}>
                <a href="daily-reports.html"     className="nav-link">Daily</a>
                <a href="weekly-reports.html"    className="nav-link">Weekly</a>
                <a href="monthly-reports.html"   className="nav-link">Monthly</a>
                <a href="quarterly-reports.html" className="nav-link">Quarterly</a>
                <a href="annual-reports.html"    className="nav-link">Annually</a>
            </NavGroup>

            {/* Account */}
            <div className="sidebar-section">Account</div>
            <a href="profile.html"  className="nav-link">Profile</a>
            <a href="logout.php"    className="nav-link text-danger">Log Out</a>
        </nav>
    );
}

// ====================================================================
// EMPLOYEE TASK MODAL
// Rendered at the page root level — NOT inside <tbody> or <tr>.
// Fetches the employee's tasks from the API when opened.
// ====================================================================
function EmployeeTaskModal({ emp, onClose }) {
    const [tasks, setTasks]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    // Which status tab is active: 'all' | 'Completed' | 'Ongoing' | 'Overdue'
    const [activeTab, setActiveTab] = useState('all');

    // Fetch this employee's tasks when the modal opens.
    // Uses get_employee_tasks_report.php which applies the exact same
    // derived_status logic as get_daily_report.php — so counts always match.
    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab('all');

        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}`)
            .then(res => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                // API returns { employee, counts, tasks }
                setTasks(Array.isArray(data.tasks) ? data.tasks : []);
                setLoading(false);
            })
            .catch(err => {
                setError(`Could not load tasks: ${err.message}`);
                setLoading(false);
            });
    }, [emp.id]);

    // Close modal on backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Use derived_status from the API directly — no JS recalculation.
    // This guarantees the modal counts match the employee table counts
    // because both use the exact same SQL logic on the server.
    const getTaskStatus = (task) => task.derived_status ?? task.status;

    const statusBadge = (status) => {
        const map = {
            'Completed': 'success',
            'Ongoing':   'warning',
            'Overdue':   'danger',
        };
        return map[status] ?? 'secondary';
    };

    const priorityBadge = (priority) => {
        const map = {
            'High':   'danger',
            'Medium': 'warning',
            'Low':    'secondary',
        };
        return map[priority] ?? 'secondary';
    };

    // tasks already have derived_status from the API — no annotation needed
    const annotated = tasks.map(t => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered  = activeTab === 'all'
        ? annotated
        : annotated.filter(t => t.derivedStatus === activeTab);

    const countFor = (status) => annotated.filter(t => t.derivedStatus === status).length;

    return (
        // Backdrop — clicking outside the modal card closes it
        <div
            onClick={handleBackdropClick}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 1050,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    width: '100%',
                    maxWidth: 720,
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                }}
            >
                {/* Modal header */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid #dee2e6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexShrink: 0,
                }}>
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{emp.name}</h5>
                        <small className="text-muted">{emp.department}</small>
                    </div>
                    <button
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                        style={{ marginTop: 2 }}
                    />
                </div>

                {/* Summary pills */}
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid #dee2e6',
                    display: 'flex',
                    gap: 8,
                    flexShrink: 0,
                    flexWrap: 'wrap',
                }}>
                    {[
                        { label: 'All',       key: 'all',       count: tasks.length,          color: '#6c757d' },
                        { label: 'Completed', key: 'Completed', count: countFor('Completed'),  color: '#28a745' },
                        { label: 'Ongoing',   key: 'Ongoing',   count: countFor('Ongoing'),    color: '#ffc107' },
                        { label: 'Overdue',   key: 'Overdue',   count: countFor('Overdue'),    color: '#dc3545' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                border: `2px solid ${activeTab === tab.key ? tab.color : '#dee2e6'}`,
                                borderRadius: 20,
                                padding: '3px 14px',
                                background: activeTab === tab.key ? tab.color : '#fff',
                                color: activeTab === tab.key ? '#fff' : '#555',
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label} <span style={{
                                background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#eee',
                                borderRadius: 10,
                                padding: '1px 7px',
                                marginLeft: 4,
                                fontSize: 12,
                            }}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Modal body — scrollable */}
                <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', flex: 1 }}>
                    {loading ? (
                        <div className="text-center text-muted py-4">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            No {activeTab === 'all' ? '' : activeTab.toLowerCase() + ' '}tasks found.
                        </div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                                <tr>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Deadline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((task, idx) => {
                                    const days = task.days_until_deadline;
                                    let deadlineLabel = '—';
                                    let deadlineSub   = null;
                                    if (task.deadline) {
                                        deadlineLabel = new Date(task.deadline).toLocaleDateString('en-PH', {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        });
                                        if (task.derivedStatus === 'Overdue' && days !== null) {
                                            deadlineSub = (
                                                <div style={{ fontSize: 11, color: '#dc3545', fontWeight: 600 }}>
                                                    {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} overdue
                                                </div>
                                            );
                                        } else if (task.derivedStatus === 'Ongoing' && days !== null) {
                                            deadlineSub = (
                                                <div style={{ fontSize: 11, color: days <= 2 ? '#dc3545' : '#6c757d' }}>
                                                    {days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} left`}
                                                </div>
                                            );
                                        } else if (task.derivedStatus === 'Completed' && task.completed_at) {
                                            deadlineSub = (
                                                <div style={{ fontSize: 11, color: '#28a745' }}>
                                                    Done {new Date(task.completed_at).toLocaleDateString('en-PH', {
                                                        month: 'short', day: 'numeric'
                                                    })}
                                                </div>
                                            );
                                        }
                                    }
                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                                {task.description && (
                                                    <small className="text-muted">{task.description}</small>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge bg-${statusBadge(task.derivedStatus)}`}>
                                                    {task.derivedStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge bg-${priorityBadge(task.priority)}`}>
                                                    {task.priority ?? '—'}
                                                </span>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {deadlineLabel}
                                                {deadlineSub}
                                            </td>
                                          
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Modal footer */}
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderTop: '1px solid #dee2e6',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    flexShrink: 0,
                }}>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MAIN PAGE
// ====================================================================
function DailyReportPage() {
    // All state declared at top level in a consistent order
    const [summary, setSummary]                   = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [employees, setEmployees]               = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [departments, setDepartments]           = useState([]);
    const [selectedEmp, setSelectedEmp]           = useState(null);
    // modalEmp drives the task modal — separate from selectedEmp (chart filter)
    const [modalEmp, setModalEmp]                 = useState(null);

    const donutRef   = useRef(null);
    const barRef     = useRef(null);
    const donutChart = useRef(null);
    const barChart   = useRef(null);

    // Fetch department list once on mount
    useEffect(() => {
        fetch('php/get_departments.php')
            .then(res => res.json())
            .then(data => setDepartments(data))
            .catch(() => setDepartments([]));
    }, []);

    // Fetch report data whenever department filter changes
    useEffect(() => {
        setSelectedEmp(null);
        fetch(`php/get_daily_report.php?department=${departmentFilter}`)
            .then(res => res.json())
            .then(data => {
                setSummary(data.summary);
                setEmployees(data.employees);
            })
            .catch(err => console.error(err));
    }, [departmentFilter]);

    // Toggle row selection for chart filtering
    const handleRowClick = (emp) => {
        setSelectedEmp(prev => prev?.id === emp.id ? null : emp);
    };

    // Derived chart data
    const chartDonutData  = selectedEmp
        ? [selectedEmp.completed, selectedEmp.ongoing, selectedEmp.overdue]
        : [summary.completed, summary.ongoing, summary.overdue];
    const chartBarLabels  = selectedEmp ? [selectedEmp.name]     : employees.map(e => e.name);
    const chartCompleted  = selectedEmp ? [selectedEmp.completed] : employees.map(e => e.completed);
    const chartOngoing    = selectedEmp ? [selectedEmp.ongoing]   : employees.map(e => e.ongoing);
    const chartOverdue    = selectedEmp ? [selectedEmp.overdue]   : employees.map(e => e.overdue);

    // Rebuild charts whenever data changes
    useEffect(() => {
        if (donutChart.current) donutChart.current.destroy();
        donutChart.current = new Chart(donutRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Ongoing', 'Overdue'],
                datasets: [{
                    data: chartDonutData,
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: !!selectedEmp,
                        text: selectedEmp ? `${selectedEmp.name} — Task Distribution` : ''
                    }
                }
            }
        });

        if (barChart.current) barChart.current.destroy();
        // Calculate a fixed max for the x-axis (e.g., 10 or the highest total + buffer)
        const maxTasks = Math.max(
            10,
            ...employees.map(e => e.completed + e.ongoing + e.overdue)
        );
        barChart.current = new Chart(barRef.current, {
            type: 'bar',
            data: {
                labels: chartBarLabels,
                datasets: [
                    { label: 'Completed', data: chartCompleted, backgroundColor: '#28a745' },
                    { label: 'Ongoing',   data: chartOngoing,   backgroundColor: '#ffc107' },
                    { label: 'Overdue',   data: chartOverdue,   backgroundColor: '#dc3545' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: !!selectedEmp,
                        text: selectedEmp ? `${selectedEmp.name} — Task Breakdown` : ''
                    }
                },
                scales: {
                    x: { stacked: true, beginAtZero: true, max: maxTasks },
                    y: { stacked: true }
                }
            }
        });

        return () => {
            if (donutChart.current) donutChart.current.destroy();
            if (barChart.current)   barChart.current.destroy();
        };
    }, [selectedEmp, summary, employees]);

    return (
        <div className="container-fluid p-4">
            <div className="row">


                <main>
                    <h2 className="mb-4">Daily Task Report</h2>

                    <div className="alert alert-info" role="alert" hidden>
                        <strong>Overview:</strong> This dashboard displays a real-time snapshot of all
                        staff task activity for <strong>today</strong>.<br />
                        <ul className="mb-0 mt-1">
                            <li><strong>Completed</strong>: Tasks marked as completed today.</li>
                            <li><strong>Ongoing</strong>: Tasks still in progress whose deadline is today or later.</li>
                            <li><strong>Overdue</strong>: Incomplete tasks whose deadline has already passed.</li>
                        </ul>
                        Use the <strong>Department</strong> filter to narrow results. Click any row to
                        focus the charts on that employee, or click the <strong>eye icon</strong> to view
                        their full task list.
                    </div>

                    {/* Department filter */}
                    <div className="mb-4">
                        <select
                            className="form-select w-auto"
                            value={departmentFilter}
                            onChange={e => setDepartmentFilter(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dep => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary cards */}
                    <div className="row mb-4">
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6>Total Tasks</h6>
                                <h2>{summary.total}</h2>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6>Completed</h6>
                                <h2 className="text-success">{summary.completed}</h2>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6>Ongoing</h6>
                                <h2 className="text-warning">{summary.ongoing}</h2>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6>Overdue</h6>
                                <h2 className="text-danger">{summary.overdue}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="row mb-4">
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 p-3 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Task Status Distribution</h5>
                                    {selectedEmp && (
                                        <span className="badge bg-primary">{selectedEmp.name}</span>
                                    )}
                                </div>
                                <canvas ref={donutRef} height="250"></canvas>
                            </div>
                        </div>
                        <div className="col-md-8">
                            <div className="card shadow-sm border-0 p-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Employee Task Performance</h5>
                                    {selectedEmp ? (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge bg-primary">{selectedEmp.name}</span>
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => setSelectedEmp(null)}
                                            >
                                                ✕ Clear
                                            </button>
                                        </div>
                                    ) : (
                                        <small className="text-muted">Click a row to filter</small>
                                    )}
                                </div>
                                <div style={{ width: '100%' }}>
                                    <canvas ref={barRef} style={{ width: '100%', minHeight: 300 }}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employee details table */}
                    <div className="card shadow-sm border-0 p-3 mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Employee Details</h5>
                            {selectedEmp && (
                                <small className="text-muted">
                                    Showing charts for <strong>{selectedEmp.name}</strong> —{' '}
                                    <span
                                        style={{ cursor: 'pointer', color: '#0d6efd' }}
                                        onClick={() => setSelectedEmp(null)}
                                    >
                                        show all
                                    </span>
                                </small>
                            )}
                        </div>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Employee</th>
                                        <th>Department</th>
                                        <th>Completed</th>
                                        <th>Ongoing</th>
                                        <th>Overdue</th>
                                        <th>Completion Rate</th>
                                        <th style={{ textAlign: 'center' }}>Tasks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => {
                                        // Include overdue in the denominator so the rate reflects
                                        // all unfinished tasks, not just ongoing ones.
                                        // e.g. 1 completed + 0 ongoing + 5 overdue = 17%, not 100%
                                        const total      = emp.completed + emp.ongoing + emp.overdue;
                                        const rate       = total > 0 ? Math.round((emp.completed / total) * 100) : 0;
                                        const isSelected = selectedEmp?.id === emp.id;

                                        return (
                                            <tr
                                                key={emp.id}
                                                onClick={() => handleRowClick(emp)}
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: isSelected ? '#cfe2ff' : '',
                                                    fontWeight: isSelected ? '600' : 'normal',
                                                    opacity: selectedEmp && !isSelected ? 0.5 : 1,
                                                    transition: 'opacity 0.2s, background-color 0.2s'
                                                }}
                                            >
                                                <td>
                                                    {isSelected && (
                                                        <span className="me-1" style={{ color: '#0d6efd' }}>▶</span>
                                                    )}
                                                    {emp.name}
                                                </td>
                                                <td>{emp.department}</td>
                                                <td>{emp.completed}</td>
                                                <td>{emp.ongoing}</td>
                                                <td className="text-danger fw-bold">{emp.overdue}</td>
                                                <td>
                                                    {total === 0 ? (
                                                        // No tasks assigned at all
                                                        <span className="text-muted" style={{ fontSize: '0.9em' }}>
                                                            No tasks yet
                                                        </span>
                                                    ) : rate === 0 ? (
                                                        // Has tasks but none completed — show 0% as plain text,
                                                        // no green bar since there is nothing to show progress on
                                                        <span className="text-danger" style={{ fontSize: '0.9em', fontWeight: 500 }}>
                                                            0% — None completed
                                                        </span>
                                                    ) : (
                                                        <div className="progress" style={{ height: 20 }}>
                                                            <div
                                                                className="progress-bar bg-success"
                                                                style={{ width: `${rate}%` }}
                                                                aria-valuenow={rate}
                                                                aria-valuemin="0"
                                                                aria-valuemax="100"
                                                            >
                                                                {rate}%
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Eye icon — stopPropagation so it doesn't also trigger row selection */}
                                                <td
                                                    style={{ textAlign: 'center' }}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setModalEmp(emp);
                                                    }}
                                                >
                                                    <button
                                                        className="btn btn-link p-0"
                                                        title={`View ${emp.name}'s tasks`}
                                                        style={{ color: '#0d6efd' }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.133 13.133 0 0 1 1.172 8z"/>
                                                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z"/>
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

            </div>

            {/*
                Modal rendered here — at the page root, completely OUTSIDE
                the table. This is critical: modals inside <tbody> break
                HTML structure and cause display and z-index issues.
            */}
            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}
const sidebarEl = document.getElementById('sidebarRoot');
if (sidebarEl) {
    ReactDOM.createRoot(sidebarEl).render(<Sidebar />);
}

const root = ReactDOM.createRoot(document.getElementById('dailyReportRoot'));
root.render(<DailyReportPage />);
