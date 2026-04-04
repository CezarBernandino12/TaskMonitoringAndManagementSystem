const { useEffect, useState, useRef } = React;

// ====================================================================
// EMPLOYEE TASK MODAL
// Same as the admin version — fetches tasks for a single employee.
// ====================================================================
function EmployeeTaskModal({ emp, onClose }) {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('all');

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
                setTasks(Array.isArray(data.tasks) ? data.tasks : []);
                setLoading(false);
            })
            .catch(err => {
                setError(`Could not load tasks: ${err.message}`);
                setLoading(false);
            });
    }, [emp.id]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const getTaskStatus  = (task) => task.derived_status ?? task.status;
    const statusBadge    = (s)    => ({ Completed: 'success', Ongoing: 'warning', Overdue: 'danger' }[s] ?? 'secondary');
    const priorityBadge  = (p)    => ({ High: 'danger', Medium: 'warning', Low: 'secondary' }[p] ?? 'secondary');

    const annotated = tasks.map(t => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered  = activeTab === 'all' ? annotated : annotated.filter(t => t.derivedStatus === activeTab);
    const countFor  = (s) => annotated.filter(t => t.derivedStatus === s).length;

    return (
        <div
            onClick={handleBackdropClick}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 1050,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: 12,
                width: '100%', maxWidth: 720, maxHeight: '85vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem 1.25rem', borderBottom: '1px solid #dee2e6',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0,
                }}>
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{emp.name}</h5>
                        <small className="text-muted">{emp.department}</small>
                    </div>
                    <button className="btn-close" aria-label="Close" onClick={onClose} style={{ marginTop: 2 }} />
                </div>

                {/* Tab pills */}
                <div style={{
                    padding: '0.75rem 1.25rem', borderBottom: '1px solid #dee2e6',
                    display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap',
                }}>
                    {[
                        { label: 'All',       key: 'all',       count: tasks.length,         color: '#6c757d' },
                        { label: 'Completed', key: 'Completed', count: countFor('Completed'), color: '#28a745' },
                        { label: 'Ongoing',   key: 'Ongoing',   count: countFor('Ongoing'),   color: '#ffc107' },
                        { label: 'Overdue',   key: 'Overdue',   count: countFor('Overdue'),   color: '#dc3545' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                border: `2px solid ${activeTab === tab.key ? tab.color : '#dee2e6'}`,
                                borderRadius: 20, padding: '3px 14px',
                                background: activeTab === tab.key ? tab.color : '#fff',
                                color: activeTab === tab.key ? '#fff' : '#555',
                                fontWeight: 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}{' '}
                            <span style={{
                                background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#eee',
                                borderRadius: 10, padding: '1px 7px', marginLeft: 4, fontSize: 12,
                            }}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Body */}
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

                {/* Footer */}
                <div style={{
                    padding: '0.75rem 1.25rem', borderTop: '1px solid #dee2e6',
                    display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
                }}>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MAIN PAGE — Supervisor Daily Report
// Scoped to the logged-in supervisor's own department only.
// No department filter dropdown — scope is fixed by the server.
// ====================================================================
function SupervisorDailyReportPage() {
    const [supervisor,   setSupervisor]   = useState(null);   // { id, name, department, department_id }
    const [summary,      setSummary]      = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [employees,    setEmployees]    = useState([]);
    const [selectedEmp,  setSelectedEmp] = useState(null);
    const [modalEmp,     setModalEmp]    = useState(null);
    const [loading,      setLoading]     = useState(true);
    const [error,        setError]       = useState(null);

    const donutRef   = useRef(null);
    const barRef     = useRef(null);
    const donutChart = useRef(null);
    const barChart   = useRef(null);

    // ----------------------------------------------------------------
    // 1. Fetch the currently logged-in supervisor's profile first.
    //    The server enforces the department scope — we just pass the
    //    supervisor's department_id to get_daily_report.php so only
    //    staff under that department are returned.
    // ----------------------------------------------------------------
    useEffect(() => {
        fetch('php/get_current_user.php')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError('Could not load your profile. Please log in again.');
                    setLoading(false);
                    return;
                }
                // Guard: redirect non-supervisors away
                if (data.role !== 'supervisor') {
                    setError('Access denied. This page is for supervisors only.');
                    setLoading(false);
                    return;
                }
                setSupervisor(data);
            })
            .catch(() => {
                setError('Failed to connect to the server.');
                setLoading(false);
            });
    }, []);

    // ----------------------------------------------------------------
    // 2. Once the supervisor's department_id is known, fetch the
    //    daily report scoped to that department only.
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!supervisor) return;

        setLoading(true);
        setSelectedEmp(null);

        fetch('php/get_supervisor_daily_report.php')
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary   ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setEmployees(data.employees ?? []);
                setLoading(false);
            })
            .catch(err => {
                setError(`Failed to load report: ${err.message}`);
                setLoading(false);
            });
    }, [supervisor]);

    // ----------------------------------------------------------------
    // Chart data — scoped to selectedEmp or all dept employees
    // ----------------------------------------------------------------
    const chartDonutData = selectedEmp
        ? [selectedEmp.completed, selectedEmp.ongoing, selectedEmp.overdue]
        : [summary.completed, summary.ongoing, summary.overdue];

    const chartBarLabels = selectedEmp ? [selectedEmp.name]      : employees.map(e => e.name);
    const chartCompleted = selectedEmp ? [selectedEmp.completed]  : employees.map(e => e.completed);
    const chartOngoing   = selectedEmp ? [selectedEmp.ongoing]    : employees.map(e => e.ongoing);
    const chartOverdue   = selectedEmp ? [selectedEmp.overdue]    : employees.map(e => e.overdue);

    // ----------------------------------------------------------------
    // Rebuild charts whenever selection or data changes
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!donutRef.current || !barRef.current) return;

        if (donutChart.current) donutChart.current.destroy();
        donutChart.current = new Chart(donutRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Ongoing', 'Overdue'],
                datasets: [{
                    data: chartDonutData,
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: !!selectedEmp,
                        text: selectedEmp ? `${selectedEmp.name} — Task Distribution` : '',
                    }
                }
            }
        });

        if (barChart.current) barChart.current.destroy();
        const maxTasks = Math.max(10, ...employees.map(e => e.completed + e.ongoing + e.overdue));
        barChart.current = new Chart(barRef.current, {
            type: 'bar',
            data: {
                labels: chartBarLabels,
                datasets: [
                    { label: 'Completed', data: chartCompleted, backgroundColor: '#28a745' },
                    { label: 'Ongoing',   data: chartOngoing,   backgroundColor: '#ffc107' },
                    { label: 'Overdue',   data: chartOverdue,   backgroundColor: '#dc3545' },
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
                        text: selectedEmp ? `${selectedEmp.name} — Task Breakdown` : '',
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

    const handleRowClick = (emp) => {
        setSelectedEmp(prev => prev?.id === emp.id ? null : emp);
    };

    // ----------------------------------------------------------------
    // Loading / error states
    // ----------------------------------------------------------------
    if (error) {
        return (
            <div className="container-fluid p-4">
                <div className="row">
                    <main className="col-md-10 ms-sm-auto px-4 d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                        <div className="alert alert-danger text-center" style={{ maxWidth: 480 }}>
                            <h5 className="mb-2">⚠ Access Error</h5>
                            <p className="mb-0">{error}</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (loading || !supervisor) {
        return (
            <div className="container-fluid p-4">
                <div className="row">
                    <main className="col-md-10 ms-sm-auto px-4 d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                        <div className="text-center text-muted">
                            <div className="spinner-border me-2" role="status"></div>
                            <span>Loading report…</span>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------------------
    // RENDER
    // ----------------------------------------------------------------
    return (
        <div className="container-fluid p-4">
            <div className="row">


                <main>

                    {/* Page header */}
                    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                        <div>
                            <h2 className="mb-0">Daily Task Report</h2>
                            <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                                Viewing staff under your supervision
                            </p>
                        </div>
                        {/* Department badge — always fixed to the supervisor's dept */}
                        <div className="d-flex align-items-center gap-2">
                            <span style={{ fontSize: 13, color: '#888' }}>Department:</span>
                            <span className="dept-badge">{supervisor.department}</span>
                        </div>
                    </div>

              

                    {/* Summary cards */}
                    <div className="row mb-4">
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6 className="text-muted mb-1">Total Tasks</h6>
                                <h2 className="mb-0">{summary.total}</h2>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6 className="text-muted mb-1">Completed</h6>
                                <h2 className="text-success mb-0">{summary.completed}</h2>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6 className="text-muted mb-1">Ongoing</h6>
                                <h2 className="text-warning mb-0">{summary.ongoing}</h2>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6 className="text-muted mb-1">Overdue</h6>
                                <h2 className="text-danger mb-0">{summary.overdue}</h2>
                            </div>
                        </div>
                    </div>

                    {/* No staff guard */}
                    {employees.length === 0 ? (
                        <div className="alert alert-warning text-center">
                            No staff members found in the <strong>{supervisor.department}</strong> department.
                        </div>
                    ) : (
                        <>
                            {/* Charts */}
                            <div className="row mb-4">
                                <div className="col-md-4">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5 className="mb-0">Task Distribution</h5>
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
                                            <h5 className="mb-0">Staff Task Performance</h5>
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

                            {/* Staff details table */}
                            <div className="card shadow-sm border-0 p-3 mt-2">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">
                                        Staff Details
                                        <span className="ms-2 text-muted" style={{ fontSize: 13, fontWeight: 400 }}>
                                            ({employees.length} member{employees.length !== 1 ? 's' : ''})
                                        </span>
                                    </h5>
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
                                                <th>Staff Member</th>
                                                <th>Completed</th>
                                                <th>Ongoing</th>
                                                <th>Overdue</th>
                                                <th>Completion Rate</th>
                                                <th style={{ textAlign: 'center' }}>Tasks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employees.map(emp => {
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
                                                            transition: 'opacity 0.2s, background-color 0.2s',
                                                        }}
                                                    >
                                                        <td>
                                                            {isSelected && (
                                                                <span className="me-1" style={{ color: '#0d6efd' }}>▶</span>
                                                            )}
                                                            {emp.name}
                                                        </td>
                                                        <td>{emp.completed}</td>
                                                        <td>{emp.ongoing}</td>
                                                        <td className="text-danger fw-bold">{emp.overdue}</td>
                                                        <td>
                                                            {total === 0 ? (
                                                                <span className="text-muted" style={{ fontSize: '0.9em' }}>
                                                                    No tasks yet
                                                                </span>
                                                            ) : rate === 0 ? (
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
                                                        <td
                                                            style={{ textAlign: 'center' }}
                                                            onClick={e => { e.stopPropagation(); setModalEmp(emp); }}
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
                        </>
                    )}

                </main>
            </div>

            {/* Modal — rendered outside the table */}
            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('supervisorDailyReportRoot'));
root.render(<SupervisorDailyReportPage />);