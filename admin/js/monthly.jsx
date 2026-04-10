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
// HELPERS
// ====================================================================
const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

function formatMonthDisplay(year, month) {
    return `${MONTH_NAMES[month - 1]} ${year}`;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ====================================================================
// EMPLOYEE TASK MODAL — monthly version
// Passes month_start and month_end to the PHP endpoint so only tasks
// relevant to the selected month are shown in the modal.
// ====================================================================
function EmployeeTaskModal({ emp, monthStart, monthEnd, onClose }) {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab('all');

        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}&week_start=${monthStart}&week_end=${monthEnd}`)
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
    }, [emp.id, monthStart, monthEnd]);

    const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    const getTaskStatus  = (task) => task.derived_status ?? task.status;
    const statusBadge    = (s)    => ({ Completed: 'success', Ongoing: 'warning', Overdue: 'danger' }[s] ?? 'secondary');
    const priorityBadge  = (p)    => ({ High: 'danger', Medium: 'warning', Low: 'secondary' }[p] ?? 'secondary');

    const annotated = tasks.map(t => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered  = activeTab === 'all' ? annotated : annotated.filter(t => t.derivedStatus === activeTab);
    const countFor  = (s) => annotated.filter(t => t.derivedStatus === s).length;

    const monthLabel = new Date(monthStart + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

    return (
        <div onClick={handleBackdropClick} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '100%', maxWidth: 720,
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{emp.name}</h5>
                        <small className="text-muted">{emp.department} &nbsp;·&nbsp; {monthLabel}</small>
                    </div>
                    <button className="btn-close" aria-label="Close" onClick={onClose} style={{ marginTop: 2 }} />
                </div>

                {/* Tab pills */}
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #dee2e6', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    {[
                        { label: 'All',       key: 'all',       count: tasks.length,         color: '#6c757d' },
                        { label: 'Completed', key: 'Completed', count: countFor('Completed'), color: '#28a745' },
                        { label: 'Ongoing',   key: 'Ongoing',   count: countFor('Ongoing'),   color: '#ffc107' },
                        { label: 'Overdue',   key: 'Overdue',   count: countFor('Overdue'),   color: '#dc3545' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            border: `2px solid ${activeTab === tab.key ? tab.color : '#dee2e6'}`,
                            borderRadius: 20, padding: '3px 14px',
                            background: activeTab === tab.key ? tab.color : '#fff',
                            color: activeTab === tab.key ? '#fff' : '#555',
                            fontWeight: 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                            {tab.label}{' '}
                            <span style={{ background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#eee', borderRadius: 10, padding: '1px 7px', marginLeft: 4, fontSize: 12 }}>
                                {tab.count}
                            </span>
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
                            No {activeTab === 'all' ? '' : activeTab.toLowerCase() + ' '}tasks found for this month.
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
                                        deadlineLabel = new Date(task.deadline).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
                                        if (task.derivedStatus === 'Overdue' && days !== null)
                                            deadlineSub = <div style={{ fontSize: 11, color: '#dc3545', fontWeight: 600 }}>{Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} overdue</div>;
                                        else if (task.derivedStatus === 'Ongoing' && days !== null)
                                            deadlineSub = <div style={{ fontSize: 11, color: days <= 2 ? '#dc3545' : '#6c757d' }}>{days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} left`}</div>;
                                        else if (task.derivedStatus === 'Completed' && task.completed_at)
                                            deadlineSub = <div style={{ fontSize: 11, color: '#28a745' }}>Done {new Date(task.completed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>;
                                    }
                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                                {task.description && <small className="text-muted">{task.description}</small>}
                                            </td>
                                            <td><span className={`badge bg-${statusBadge(task.derivedStatus)}`}>{task.derivedStatus}</span></td>
                                            <td><span className={`badge bg-${priorityBadge(task.priority)}`}>{task.priority ?? '—'}</span></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{deadlineLabel}{deadlineSub}</td>
                                           
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MAIN PAGE
// ====================================================================
// ====================================================================
// DEPARTMENT TASK MODAL
// Fetches all tasks for a department scoped to the selected month,
// with the assigned employee name shown in each row.
// ====================================================================
function DepartmentTaskModal({ dept, monthStart, monthEnd, onClose }) {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab('all');

        fetch(`php/get_department_tasks_report.php?department_id=${dept.department_id}&week_start=${monthStart}&week_end=${monthEnd}`)
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
    }, [dept.department_id, monthStart, monthEnd]);

    const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    const getTaskStatus  = (task) => task.derived_status ?? task.status;
    const statusBadge    = (s) => ({ Completed: 'success', Ongoing: 'warning', Overdue: 'danger' }[s] ?? 'secondary');
    const priorityBadge  = (p) => ({ High: 'danger', Medium: 'warning', Low: 'secondary' }[p] ?? 'secondary');

    const annotated  = tasks.map(t => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered   = activeTab === 'all' ? annotated : annotated.filter(t => t.derivedStatus === activeTab);
    const countFor   = (s) => annotated.filter(t => t.derivedStatus === s).length;

    const monthLabel = new Date(monthStart + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

    return (
        <div onClick={handleBackdropClick} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '100%', maxWidth: 780,
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{dept.department}</h5>
                        <small className="text-muted">Department tasks · {monthLabel}</small>
                    </div>
                    <button className="btn-close" aria-label="Close" onClick={onClose} style={{ marginTop: 2 }} />
                </div>

                {/* Tab filter pills */}
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #dee2e6', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    {[
                        { label: 'All',       key: 'all',       count: tasks.length,         color: '#6c757d' },
                        { label: 'Completed', key: 'Completed', count: countFor('Completed'), color: '#28a745' },
                        { label: 'Ongoing',   key: 'Ongoing',   count: countFor('Ongoing'),   color: '#ffc107' },
                        { label: 'Overdue',   key: 'Overdue',   count: countFor('Overdue'),   color: '#dc3545' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            border: `2px solid ${activeTab === tab.key ? tab.color : '#dee2e6'}`,
                            borderRadius: 20, padding: '3px 14px',
                            background: activeTab === tab.key ? tab.color : '#fff',
                            color: activeTab === tab.key ? '#fff' : '#555',
                            fontWeight: 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                            {tab.label}{' '}
                            <span style={{ background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#eee', borderRadius: 10, padding: '1px 7px', marginLeft: 4, fontSize: 12 }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Scrollable body */}
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
                            No {activeTab === 'all' ? '' : activeTab.toLowerCase() + ' '}tasks found for this department this month.
                        </div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                                <tr>
                                    <th>Title</th>
                                    <th>Assigned To</th>
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
                                        if (task.derivedStatus === 'Overdue' && days !== null)
                                            deadlineSub = <div style={{ fontSize: 11, color: '#dc3545', fontWeight: 600 }}>{Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} overdue</div>;
                                        else if (task.derivedStatus === 'Ongoing' && days !== null)
                                            deadlineSub = <div style={{ fontSize: 11, color: days <= 2 ? '#dc3545' : '#6c757d' }}>{days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} left`}</div>;
                                        else if (task.derivedStatus === 'Completed' && task.completed_at)
                                            deadlineSub = <div style={{ fontSize: 11, color: '#28a745' }}>Done {new Date(task.completed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>;
                                    }
                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                                {task.description && <small className="text-muted">{task.description}</small>}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: '#0d6efd' }}>
                                                {task.assigned_to_name}
                                            </td>
                                            <td><span className={`badge bg-${statusBadge(task.derivedStatus)}`}>{task.derivedStatus}</span></td>
                                            <td><span className={`badge bg-${priorityBadge(task.priority)}`}>{task.priority ?? '—'}</span></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{deadlineLabel}{deadlineSub}</td>
                                          
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function MonthlyReportPage() {
    const now = new Date();

    const [summary, setSummary]                   = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [departments, setDepartments]           = useState([]);
    const [allDepartments, setAllDepartments]     = useState([]);
    const [dailyTrend, setDailyTrend]             = useState([]);
    const [employees, setEmployees]               = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [year, setYear]                         = useState(now.getFullYear());
    const [month, setMonth]                       = useState(now.getMonth() + 1);
    const [selectedDept, setSelectedDept]         = useState(null); // for table highlight
    const [modalEmp, setModalEmp]                 = useState(null);
    // modalDept drives the department task modal
    const [modalDept, setModalDept]               = useState(null);

    // Chart canvas refs
    const groupedBarRef = useRef(null);
    const lineRef       = useRef(null);
    const hBarRef       = useRef(null);

    // Chart instance refs
    const groupedBarChart = useRef(null);
    const lineChart       = useRef(null);
    const hBarChart       = useRef(null);

    // Derive month boundaries for the modal
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStart  = `${year}-${String(month).padStart(2,'0')}-01`;
    const monthEnd    = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

    // Fetch department list for filter dropdown
    useEffect(() => {
        fetch('php/get_departments.php')
            .then(res => res.json())
            .then(data => setAllDepartments(data))
            .catch(() => setAllDepartments([]));
    }, []);

    // Fetch monthly report whenever year, month, or department filter changes
    useEffect(() => {
        setSelectedDept(null);
        setModalEmp(null);
        setModalDept(null);
        fetch(`php/get_monthly_report.php?year=${year}&month=${month}&department=${departmentFilter}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) { console.error('PHP error:', data.error); return; }
                setSummary(data.summary);
                setDepartments(data.departments ?? []);
                setDailyTrend(data.daily_trend  ?? []);
                setEmployees(data.employees     ?? []);
            })
            .catch(err => console.error(err));
    }, [year, month, departmentFilter]);

    // ----------------------------------------------------------------
    // Chart data derived from state
    // ----------------------------------------------------------------

    // Grouped bar chart data — filtered to selectedDept if one is active
    const chartDepts     = selectedDept
        ? departments.filter(d => d.department_id === selectedDept.department_id)
        : departments;
    const deptLabels     = chartDepts.map(d => d.department);
    const deptCompleted  = chartDepts.map(d => d.completed);
    const deptOngoing    = chartDepts.map(d => d.ongoing);
    const deptOverdue    = chartDepts.map(d => d.overdue);

    // Line chart — daily completion trend for the month
    const dayLabels      = dailyTrend.map(d => {
        const dt = new Date(d.date + 'T00:00:00');
        return dt.getDate(); // just the day number: 1, 2, 3 …
    });
    const lineCompleted  = dailyTrend.map(d => d.completed);
    const lineOngoing    = dailyTrend.map(d => d.ongoing);
    const lineOverdue    = dailyTrend.map(d => d.overdue);

    // Horizontal bar — employee completion rate (sorted descending by rate)
    const empSorted      = [...employees].sort((a, b) => b.completion_rate - a.completion_rate);
    const empNames       = empSorted.map(e => e.name);
    const empCompleted   = empSorted.map(e => e.completed);
    const empOverdue     = empSorted.map(e => e.overdue);

    // ----------------------------------------------------------------
    // Build / rebuild all three charts
    // ----------------------------------------------------------------
    useEffect(() => {
        // 1. GROUPED BAR — department comparison
        if (groupedBarChart.current) groupedBarChart.current.destroy();
        groupedBarChart.current = new Chart(groupedBarRef.current, {
            type: 'bar',
            data: {
                labels: deptLabels,
                datasets: [
                    { label: 'Completed', data: deptCompleted, backgroundColor: '#28a745', borderRadius: 4 },
                    { label: 'Ongoing',   data: deptOngoing,   backgroundColor: '#ffc107', borderRadius: 4 },
                    { label: 'Overdue',   data: deptOverdue,   backgroundColor: '#dc3545', borderRadius: 4 },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: {
                        display: !!selectedDept,
                        text: selectedDept ? `Focused: ${selectedDept.department}` : ''
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx) => {
                                const dept = chartDepts[ctx.dataIndex];
                                if (!dept) return '';
                                return `Completion rate: ${dept.completion_rate}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        // 2. LINE CHART — daily completions trend across the month
        if (lineChart.current) lineChart.current.destroy();
        lineChart.current = new Chart(lineRef.current, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [
                    {
                        label: 'Completed',
                        data: lineCompleted,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40,167,69,0.08)',
                        pointBackgroundColor: '#28a745',
                        pointRadius: 3,
                        tension: 0.4,
                        fill: true,
                    },
                    {
                        label: 'Ongoing',
                        data: lineOngoing,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255,193,7,0.06)',
                        pointBackgroundColor: '#ffc107',
                        pointRadius: 3,
                        tension: 0.4,
                        fill: true,
                    },
                    {
                        label: 'Overdue',
                        data: lineOverdue,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220,53,69,0.06)',
                        pointBackgroundColor: '#dc3545',
                        pointRadius: 3,
                        tension: 0.4,
                        fill: true,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: {
                        title: { display: true, text: `Day of ${MONTH_NAMES[month - 1]}` },
                        ticks: { maxTicksLimit: 15 }
                    },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        // 3. HORIZONTAL BAR — employee completion count + overdue
        if (hBarChart.current) hBarChart.current.destroy();
        if (empSorted.length > 0) {
            hBarChart.current = new Chart(hBarRef.current, {
                type: 'bar',
                data: {
                    labels: empNames,
                    datasets: [
                        { label: 'Completed', data: empCompleted, backgroundColor: '#28a745', borderRadius: 4 },
                        { label: 'Overdue',   data: empOverdue,   backgroundColor: '#dc3545', borderRadius: 4 },
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                afterLabel: (ctx) => {
                                    const emp = empSorted[ctx.dataIndex];
                                    return emp ? `Completion rate: ${emp.completion_rate}%` : '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { stepSize: 1 } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }

        return () => {
            if (groupedBarChart.current) groupedBarChart.current.destroy();
            if (lineChart.current)       lineChart.current.destroy();
            if (hBarChart.current)       hBarChart.current.destroy();
        };
    }, [selectedDept, summary, departments, employees, dailyTrend, year, month]);

    // ----------------------------------------------------------------
    // Month navigation helpers
    // ----------------------------------------------------------------
    const isCurrentMonth = (year === now.getFullYear() && month === (now.getMonth() + 1));

    const goToPrevMonth = () => {
        if (month === 1) { setYear(y => y - 1); setMonth(12); }
        else             { setMonth(m => m - 1); }
    };

    const goToNextMonth = () => {
        if (month === 12) { setYear(y => y + 1); setMonth(1); }
        else              { setMonth(m => m + 1); }
    };

    const goToCurrentMonth = () => {
        setYear(now.getFullYear());
        setMonth(now.getMonth() + 1);
    };

    // Completion rate for the summary cards
    const summaryTotal = summary.completed + summary.ongoing + summary.overdue;
    const summaryRate  = summaryTotal > 0 ? Math.round((summary.completed / summaryTotal) * 100) : 0;

    // ----------------------------------------------------------------
    // RENDER
    // ----------------------------------------------------------------
    return (
        <div className="container-fluid p-4">
            <div className="row">


                <main>

                    {/* Page header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="mb-0">Monthly Task Report</h2>
                        <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={goToPrevMonth}>‹ Prev</button>
                            <span className="fw-semibold" style={{ minWidth: 160, textAlign: 'center' }}>
                                {formatMonthDisplay(year, month)}
                            </span>
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={goToNextMonth}
                                disabled={isCurrentMonth}
                            >
                                Next ›
                            </button>
                            {!isCurrentMonth && (
                                <button className="btn btn-sm btn-outline-primary" onClick={goToCurrentMonth}>
                                    This Month
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info alert */}
                    <div className="alert alert-info" role="alert" hidden>
                        <strong>Overview:</strong> This report summarises department and staff task activity
                        for <strong>{formatMonthDisplay(year, month)}</strong>.
                        <ul className="mb-0 mt-1">
                            <li><strong>Completed</strong>: Tasks marked as completed within this month.</li>
                            <li><strong>Ongoing</strong>: Tasks still in progress with a deadline today or later.</li>
                            <li><strong>Overdue</strong>: Incomplete tasks whose deadline has already passed.</li>
                        </ul>
                        Use the <strong>Department</strong> filter to focus on a specific department.
                        Click a department row to highlight it in the chart. Click the <strong>eye icon</strong> to
                        view an employee's task list for this month.
                    </div>

                    {/* Department filter */}
                    <div className="mb-4">
                        <select
                            className="form-select w-auto"
                            value={departmentFilter}
                            onChange={e => { setDepartmentFilter(e.target.value); setSelectedDept(null); }}
                        >
                            <option value="all">All Departments</option>
                            {allDepartments.map(dep => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
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

                    {/* Row 1: Grouped bar chart — department comparison (primary visual) */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h5 className="mb-0">Department Task Comparison</h5>
                                        <small className="text-muted">Completed, Ongoing, and Overdue per department</small>
                                    </div>
                                    {selectedDept && (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge bg-primary">{selectedDept.department}</span>
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => setSelectedDept(null)}
                                            >
                                                ✕ Show all
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div style={{ height: 300 }}>
                                    <canvas ref={groupedBarRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Line chart (daily trend) */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <h5 className="mb-3">Daily Task Activity — {formatMonthDisplay(year, month)}</h5>
                                <div style={{ height: 260 }}>
                                    <canvas ref={lineRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Horizontal bar — employee performance */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <h5 className="mb-1">Employee Performance</h5>
                                <small className="text-muted d-block mb-3">
                                    Sorted by most tasks completed. Hover a bar for completion rate.
                                </small>
                                <div style={{ height: Math.max(200, empSorted.length * 36) }}>
                                    <canvas ref={hBarRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department details table */}
                    <div className="card shadow-sm border-0 p-3 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Department Details</h5>
                            {selectedDept && (
                                <small className="text-muted">
                                    Focused on <strong>{selectedDept.department}</strong> —{' '}
                                    <span style={{ cursor: 'pointer', color: '#0d6efd' }} onClick={() => setSelectedDept(null)}>
                                        show all
                                    </span>
                                </small>
                            )}
                        </div>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Department</th>
                                        <th>Total</th>
                                        <th>Completed</th>
                                        <th>Ongoing</th>
                                        <th>Overdue</th>
                                        <th>Completion Rate</th>
                                        <th style={{ textAlign: 'center' }}>Tasks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.map(dept => {
                                        const isSelected = selectedDept?.department_id === dept.department_id;
                                        return (
                                            <tr
                                                key={dept.department_id}
                                                onClick={() => setSelectedDept(prev =>
                                                    prev?.department_id === dept.department_id ? null : dept
                                                )}
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: isSelected ? '#cfe2ff' : '',
                                                    fontWeight: isSelected ? '600' : 'normal',
                                                    opacity: selectedDept && !isSelected ? 0.5 : 1,
                                                    transition: 'opacity 0.2s, background-color 0.2s'
                                                }}
                                            >
                                                <td>
                                                    {isSelected && <span className="me-1" style={{ color: '#0d6efd' }}>▶</span>}
                                                    {dept.department}
                                                </td>
                                                <td>{dept.total}</td>
                                                <td>{dept.completed}</td>
                                                <td>{dept.ongoing}</td>
                                                <td className="text-danger fw-bold">{dept.overdue}</td>
                                                <td>
                                                    {dept.total === 0 ? (
                                                        <span className="text-muted" style={{ fontSize: '0.9em' }}>No tasks yet</span>
                                                    ) : dept.completion_rate === 0 ? (
                                                        <span className="text-danger" style={{ fontSize: '0.9em', fontWeight: 500 }}>0% — None completed</span>
                                                    ) : (
                                                        <div className="progress" style={{ height: 20 }}>
                                                            <div
                                                                className="progress-bar bg-success"
                                                                style={{ width: `${dept.completion_rate}%` }}
                                                                aria-valuenow={dept.completion_rate}
                                                                aria-valuemin="0"
                                                                aria-valuemax="100"
                                                            >
                                                                {dept.completion_rate}%
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        className="btn btn-link p-0"
                                                        title={`View ${dept.department} tasks this month`}
                                                        style={{ color: '#0d6efd' }}
                                                        onClick={e => { e.stopPropagation(); setModalDept(dept); }}
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

                    {/* Employee details table */}
                    <div className="card shadow-sm border-0 p-3">
                        <h5 className="mb-3">Employee Details</h5>
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
                                        const rate  = emp.completion_rate;
                                        const total = emp.total;
                                        return (
                                            <tr key={emp.id}>
                                                <td>{emp.name}</td>
                                                <td>{emp.department}</td>
                                                <td>{emp.completed}</td>
                                                <td>{emp.ongoing}</td>
                                                <td className="text-danger fw-bold">{emp.overdue}</td>
                                                <td>
                                                    {total === 0 ? (
                                                        <span className="text-muted" style={{ fontSize: '0.9em' }}>No tasks yet</span>
                                                    ) : rate === 0 ? (
                                                        <span className="text-danger" style={{ fontSize: '0.9em', fontWeight: 500 }}>0% — None completed</span>
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
                                                <td style={{ textAlign: 'center' }} onClick={e => { e.stopPropagation(); setModalEmp(emp); }}>
                                                    <button
                                                        className="btn btn-link p-0"
                                                        title={`View ${emp.name}'s tasks this month`}
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

            {/* Modals — rendered at page root, outside all tables */}
            {modalDept && (
                <DepartmentTaskModal
                    dept={modalDept}
                    monthStart={monthStart}
                    monthEnd={monthEnd}
                    onClose={() => setModalDept(null)}
                />
            )}
            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    monthStart={monthStart}
                    monthEnd={monthEnd}
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


const root = ReactDOM.createRoot(document.getElementById('monthlyReportRoot'));
root.render(<MonthlyReportPage />);