
const { useEffect, useState, useRef } = React;


// ====================================================================
// EMPLOYEE TASK MODAL — annual version
// ====================================================================
function EmployeeTaskModal({ emp, yearStart, yearEnd, onClose }) {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab('all');

        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}&week_start=${yearStart}&week_end=${yearEnd}`)
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
    }, [emp.id, yearStart, yearEnd]);

    const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    const getTaskStatus  = (task) => task.derived_status ?? task.status;
    const statusBadge    = (s)    => ({ Completed: 'success', Ongoing: 'warning', Overdue: 'danger' }[s] ?? 'secondary');
    const priorityBadge  = (p)    => ({ High: 'danger', Medium: 'warning', Low: 'secondary' }[p] ?? 'secondary');

    const annotated = tasks.map(t => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered  = activeTab === 'all' ? annotated : annotated.filter(t => t.derivedStatus === activeTab);
    const countFor  = (s) => annotated.filter(t => t.derivedStatus === s).length;

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
                        <small className="text-muted">{emp.department} &nbsp;·&nbsp; {yearStart} – {yearEnd}</small>
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
                            No {activeTab === 'all' ? '' : activeTab.toLowerCase() + ' '}tasks found for this year.
                        </div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                                <tr>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Deadline</th>
                                    <th>Progress</th>
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
                                            <td style={{ minWidth: 100 }}>
                                                <div className="progress" style={{ height: 16 }}>
                                                    <div className="progress-bar bg-success" style={{ width: `${task.progress ?? 0}%` }}>
                                                        {task.progress ?? 0}%
                                                    </div>
                                                </div>
                                            </td>
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
// MAIN PAGE — SUPERVISOR VERSION
// Key differences from admin version:
//   • No department filter dropdown — scope is always the supervisor's dept
//   • PHP endpoint changed to get_annual_report_supervisor.php
//   • Department name badge shown in header, sourced from API response
//   • Auth error renders a full-page Access Denied card
//   • selectedDept chart-focus feature removed (only one dept in data)
// ====================================================================
function AnnualReportPage() {
    const now = new Date();

    const [summary, setSummary]             = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [departments, setDepartments]     = useState([]);
    const [quarterlyTrend, setQuarterlyTrend] = useState([]);
    const [monthlyTrend, setMonthlyTrend]   = useState([]);
    const [employees, setEmployees]         = useState([]);
    const [deptName, setDeptName]           = useState('');   // supervisor's department name
    const [year, setYear]                   = useState(now.getFullYear());
    const [modalEmp, setModalEmp]           = useState(null);
    const [authError, setAuthError]         = useState(null);

    // Chart canvas refs
    const groupedBarRef  = useRef(null);
    const lineRef        = useRef(null);
    const quarterBarRef  = useRef(null);
    const donutRef       = useRef(null);
    const hBarRef        = useRef(null);

    // Chart instance refs
    const groupedBarChart = useRef(null);
    const lineChart       = useRef(null);
    const quarterBarChart = useRef(null);
    const donutChart      = useRef(null);
    const hBarChart       = useRef(null);

    const yearStart = `${year}-01-01`;
    const yearEnd   = `${year}-12-31`;

    // Fetch annual report — no department param, PHP reads it from session
    useEffect(() => {
        setModalEmp(null);

        fetch(`php/get_annual_report_supervisor.php?year=${year}`)
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    return res.json().then(d => { throw new Error(d.error ?? 'Access denied'); });
                }
                return res.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary);
                setDepartments(data.departments       ?? []);
                setQuarterlyTrend(data.quarterly_trend ?? []);
                setMonthlyTrend(data.monthly_trend    ?? []);
                setEmployees(data.employees           ?? []);
                setDeptName(data.supervisor_department_name ?? '');
            })
            .catch(err => {
                console.error(err);
                setAuthError(err.message);
            });
    }, [year]);

    // ----------------------------------------------------------------
    // Chart data
    // ----------------------------------------------------------------

    // 1. Grouped bar — single dept for supervisor
    const deptLabels    = departments.map(d => d.department);
    const deptCompleted = departments.map(d => d.completed);
    const deptOngoing   = departments.map(d => d.ongoing);
    const deptOverdue   = departments.map(d => d.overdue);

    // 2. Monthly line
    const monthNames    = monthlyTrend.map(m => m.month_name);
    const lineCompleted = monthlyTrend.map(m => m.completed);
    const lineOngoing   = monthlyTrend.map(m => m.ongoing);
    const lineOverdue   = monthlyTrend.map(m => m.overdue);

    // 3. Quarterly stacked bar
    const quarterLabels = quarterlyTrend.map(q => q.quarter_label);
    const qCompleted    = quarterlyTrend.map(q => q.completed);
    const qOngoing      = quarterlyTrend.map(q => q.ongoing);
    const qOverdue      = quarterlyTrend.map(q => q.overdue);

    // 4. Donut
    const donutData = [summary.completed, summary.ongoing, summary.overdue];

    // 5. Horizontal bar
    const empSorted    = [...employees].sort((a, b) => b.completion_rate - a.completion_rate);
    const empNames     = empSorted.map(e => e.name);
    const empCompleted = empSorted.map(e => e.completed);
    const empOverdue   = empSorted.map(e => e.overdue);

    // ----------------------------------------------------------------
    // Build / rebuild all five charts
    // ----------------------------------------------------------------
    useEffect(() => {
        // 1. GROUPED BAR
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
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx) => {
                                const dept = departments[ctx.dataIndex];
                                return dept ? `Completion rate: ${dept.completion_rate}%` : '';
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

        // 2. LINE CHART — monthly trend
        if (lineChart.current) lineChart.current.destroy();
        lineChart.current = new Chart(lineRef.current, {
            type: 'line',
            data: {
                labels: monthNames,
                datasets: [
                    { label: 'Completed', data: lineCompleted, borderColor: '#28a745', backgroundColor: 'rgba(40,167,69,0.08)',  pointBackgroundColor: '#28a745', pointRadius: 4, tension: 0.4, fill: true },
                    { label: 'Ongoing',   data: lineOngoing,   borderColor: '#ffc107', backgroundColor: 'rgba(255,193,7,0.06)',  pointBackgroundColor: '#ffc107', pointRadius: 4, tension: 0.4, fill: true },
                    { label: 'Overdue',   data: lineOverdue,   borderColor: '#dc3545', backgroundColor: 'rgba(220,53,69,0.06)',  pointBackgroundColor: '#dc3545', pointRadius: 4, tension: 0.4, fill: true },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            footer: (items) => {
                                const idx   = items[0].dataIndex;
                                const comp  = lineCompleted[idx];
                                const total = comp + lineOngoing[idx] + lineOverdue[idx];
                                const rate  = total > 0 ? Math.round((comp / total) * 100) : 0;
                                return `Completion rate: ${rate}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: `${year} — Monthly Activity` }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        // 3. QUARTERLY STACKED BAR
        if (quarterBarChart.current) quarterBarChart.current.destroy();
        quarterBarChart.current = new Chart(quarterBarRef.current, {
            type: 'bar',
            data: {
                labels: quarterLabels,
                datasets: [
                    { label: 'Completed', data: qCompleted, backgroundColor: '#28a745', borderRadius: 4 },
                    { label: 'Ongoing',   data: qOngoing,   backgroundColor: '#ffc107', borderRadius: 4 },
                    { label: 'Overdue',   data: qOverdue,   backgroundColor: '#dc3545', borderRadius: 4 },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            footer: (items) => {
                                const q = quarterlyTrend[items[0].dataIndex];
                                return q ? `Completion rate: ${q.completion_rate}%` : '';
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });

        // 4. DONUT
        if (donutChart.current) donutChart.current.destroy();
        donutChart.current = new Chart(donutRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Ongoing', 'Overdue'],
                datasets: [{
                    data: donutData,
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val   = ctx.raw;
                                const total = donutData.reduce((a, b) => a + b, 0);
                                const pct   = total > 0 ? Math.round((val / total) * 100) : 0;
                                return ` ${ctx.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        // 5. HORIZONTAL BAR — employee performance
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
            if (groupedBarChart.current)  groupedBarChart.current.destroy();
            if (lineChart.current)        lineChart.current.destroy();
            if (quarterBarChart.current)  quarterBarChart.current.destroy();
            if (donutChart.current)       donutChart.current.destroy();
            if (hBarChart.current)        hBarChart.current.destroy();
        };
    }, [summary, departments, employees, quarterlyTrend, monthlyTrend, year]);

    // ----------------------------------------------------------------
    // Year navigation
    // ----------------------------------------------------------------
    const isCurrentYear   = year === now.getFullYear();
    const goToPrevYear    = () => setYear(y => y - 1);
    const goToNextYear    = () => setYear(y => y + 1);
    const goToCurrentYear = () => setYear(now.getFullYear());

    const summaryTotal = summary.completed + summary.ongoing + summary.overdue;
    const summaryRate  = summaryTotal > 0 ? Math.round((summary.completed / summaryTotal) * 100) : 0;

    // ----------------------------------------------------------------
    // RENDER
    // ----------------------------------------------------------------
    if (authError) {
        return (
            <div className="container-fluid p-4">
                <div className="row">

                    <main className="col-md-10 ms-sm-auto px-4 d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                        <div className="text-center">
                            <div className="alert alert-danger d-inline-block px-5 py-4">
                                <h5 className="mb-1">Access Denied</h5>
                                <p className="mb-0">{authError}</p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid p-4">
            <div className="row">


                <main>

                    {/* Page header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2 className="mb-0">Annual Task Report</h2>
                            {/* Department badge — shows which dept this supervisor manages */}
                            {deptName && (
                                <span className="badge bg-primary mt-1" style={{ fontSize: '0.85rem' }}>
                                    {deptName}
                                </span>
                            )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={goToPrevYear}>‹ Prev</button>
                            <span className="fw-semibold" style={{ minWidth: 80, textAlign: 'center', fontSize: '1.1rem' }}>
                                {year}
                            </span>
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={goToNextYear}
                                disabled={isCurrentYear}
                            >
                                Next ›
                            </button>
                            {!isCurrentYear && (
                                <button className="btn btn-sm btn-outline-primary" onClick={goToCurrentYear}>
                                    This Year
                                </button>
                            )}
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
                        <div className="col-md-2">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6 className="text-muted mb-1">Ongoing</h6>
                                <h2 className="text-warning mb-0">{summary.ongoing}</h2>
                            </div>
                        </div>
                        <div className="col-md-2">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6 className="text-muted mb-1">Overdue</h6>
                                <h2 className="text-danger mb-0">{summary.overdue}</h2>
                            </div>
                        </div>
                        <div className="col-md-2">
                            <div className="card shadow-sm border-0 p-3 text-center">
                                <h6 className="text-muted mb-1">Completion Rate</h6>
                                <h2 className={`mb-0 ${summaryRate >= 70 ? 'text-success' : summaryRate >= 40 ? 'text-warning' : 'text-danger'}`}>
                                    {summaryRate}%
                                </h2>
                            </div>
                        </div>
                    </div>

                    {/* Row 1: Department grouped bar (full width) */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <div className="mb-3">
                                    <h5 className="mb-0">Department Task Overview</h5>
                                    <small className="text-muted">Completed, Ongoing, and Overdue for {year}</small>
                                </div>
                                <div style={{ height: 300 }}>
                                    <canvas ref={groupedBarRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Monthly line chart */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <h5 className="mb-1">Monthly Activity Trend</h5>
                                <small className="text-muted d-block mb-3">
                                    Task completion, ongoing, and overdue counts across all 12 months of {year}
                                </small>
                                <div style={{ height: 280 }}>
                                    <canvas ref={lineRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Quarterly stacked bar + Donut */}
                    <div className="row mb-4">
                        <div className="col-md-8">
                            <div className="card shadow-sm border-0 p-3 h-100">
                                <h5 className="mb-1">Quarterly Breakdown</h5>
                                <small className="text-muted d-block mb-3">
                                    Volume and status composition per quarter — Q1 through Q4 {year}
                                </small>
                                {/* Quarterly completion rate badges */}
                                <div className="d-flex gap-3 mb-3 flex-wrap">
                                    {quarterlyTrend.map(q => (
                                        <div key={q.quarter} style={{ fontSize: 13 }}>
                                            <span className="fw-semibold">{q.quarter_label}</span>
                                            <span className="ms-1 badge" style={{
                                                background: q.completion_rate >= 70 ? '#28a745' : q.completion_rate >= 40 ? '#ffc107' : '#dc3545',
                                                color: q.completion_rate >= 40 && q.completion_rate < 70 ? '#333' : '#fff',
                                            }}>
                                                {q.completion_rate}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ height: 220 }}>
                                    <canvas ref={quarterBarRef}></canvas>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 p-3 h-100">
                                <h5 className="mb-1">Annual Status Mix</h5>
                                <small className="text-muted d-block mb-3">
                                    Overall share of completed, ongoing, and overdue for {year}
                                </small>
                                <div style={{ height: 260 }}>
                                    <canvas ref={donutRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Employee horizontal bar */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <h5 className="mb-1">Employee Performance</h5>
                                <small className="text-muted d-block mb-3">
                                    Sorted by most tasks completed in {year}. Hover for completion rate.
                                </small>
                                <div style={{ height: Math.max(200, empSorted.length * 36) }}>
                                    <canvas ref={hBarRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quarterly summary table */}
                    <div className="card shadow-sm border-0 p-3 mb-4">
                        <h5 className="mb-3">Quarterly Summary</h5>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Quarter</th>
                                        <th>Period</th>
                                        <th>Total</th>
                                        <th>Completed</th>
                                        <th>Ongoing</th>
                                        <th>Overdue</th>
                                        <th>Completion Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quarterlyTrend.map(q => (
                                        <tr key={q.quarter}>
                                            <td className="fw-semibold">{q.quarter_label}</td>
                                            <td className="text-muted">{q.quarter_range}</td>
                                            <td>{q.total}</td>
                                            <td>{q.completed}</td>
                                            <td>{q.ongoing}</td>
                                            <td className="text-danger fw-bold">{q.overdue}</td>
                                            <td>
                                                {q.total === 0 ? (
                                                    <span className="text-muted" style={{ fontSize: '0.9em' }}>No tasks yet</span>
                                                ) : q.completion_rate === 0 ? (
                                                    <span className="text-danger" style={{ fontSize: '0.9em', fontWeight: 500 }}>0% — None completed</span>
                                                ) : (
                                                    <div className="progress" style={{ height: 20 }}>
                                                        <div
                                                            className="progress-bar bg-success"
                                                            style={{ width: `${q.completion_rate}%` }}
                                                            aria-valuenow={q.completion_rate}
                                                            aria-valuemin="0"
                                                            aria-valuemax="100"
                                                        >
                                                            {q.completion_rate}%
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Department details table */}
                    <div className="card shadow-sm border-0 p-3 mb-4">
                        <h5 className="mb-3">Department Details</h5>
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.map(dept => (
                                        <tr key={dept.department_id}>
                                            <td>{dept.department}</td>
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
                                        </tr>
                                    ))}
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
                                                        title={`View ${emp.name}'s tasks for ${year}`}
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

            {/* Modal */}
            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    yearStart={yearStart}
                    yearEnd={yearEnd}
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('annualReportRoot'));
root.render(<AnnualReportPage />);