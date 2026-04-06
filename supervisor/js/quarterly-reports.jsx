
const { useEffect, useState, useRef } = React;



// ====================================================================
// HELPERS
// ====================================================================
const QUARTER_LABELS = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
const QUARTER_RANGES = { 1: 'Jan – Mar', 2: 'Apr – Jun', 3: 'Jul – Sep', 4: 'Oct – Dec' };

function formatQuarterDisplay(year, quarter) {
    return `${QUARTER_LABELS[quarter]} ${year}  (${QUARTER_RANGES[quarter]})`;
}

function getCurrentQuarter() {
    return Math.ceil((new Date().getMonth() + 1) / 3);
}

// ====================================================================
// EMPLOYEE TASK MODAL
// ====================================================================
function EmployeeTaskModal({ emp, quarterStart, quarterEnd, onClose }) {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        setLoading(true); setError(null); setTasks([]); setActiveTab('all');
        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}&week_start=${quarterStart}&week_end=${quarterEnd}`)
            .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
            .then(data => { if (data.error) throw new Error(data.error); setTasks(Array.isArray(data.tasks) ? data.tasks : []); setLoading(false); })
            .catch(err => { setError(`Could not load tasks: ${err.message}`); setLoading(false); });
    }, [emp.id, quarterStart, quarterEnd]);

    const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };
    const getTaskStatus  = (task) => task.derived_status ?? task.status;
    const statusBadge    = (s) => ({ Completed: 'success', Ongoing: 'warning', Overdue: 'danger' }[s] ?? 'secondary');
    const priorityBadge  = (p) => ({ High: 'danger', Medium: 'warning', Low: 'secondary' }[p] ?? 'secondary');
    const annotated = tasks.map(t => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered  = activeTab === 'all' ? annotated : annotated.filter(t => t.derivedStatus === activeTab);
    const countFor  = (s) => annotated.filter(t => t.derivedStatus === s).length;

    return (
        <div onClick={handleBackdropClick} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:720, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #dee2e6', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
                    <div>
                        <h5 style={{ margin:0, fontWeight:600 }}>{emp.name}</h5>
                        <small className="text-muted">{emp.department} &nbsp;·&nbsp; {quarterStart} – {quarterEnd}</small>
                    </div>
                    <button className="btn-close" aria-label="Close" onClick={onClose} style={{ marginTop:2 }} />
                </div>
                <div style={{ padding:'0.75rem 1.25rem', borderBottom:'1px solid #dee2e6', display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
                    {[
                        { label:'All', key:'all', count:tasks.length, color:'#6c757d' },
                        { label:'Completed', key:'Completed', count:countFor('Completed'), color:'#28a745' },
                        { label:'Ongoing',   key:'Ongoing',   count:countFor('Ongoing'),   color:'#ffc107' },
                        { label:'Overdue',   key:'Overdue',   count:countFor('Overdue'),   color:'#dc3545' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            border:`2px solid ${activeTab===tab.key?tab.color:'#dee2e6'}`, borderRadius:20, padding:'3px 14px',
                            background:activeTab===tab.key?tab.color:'#fff', color:activeTab===tab.key?'#fff':'#555',
                            fontWeight:500, fontSize:13, cursor:'pointer', transition:'all 0.15s',
                        }}>
                            {tab.label} <span style={{ background:activeTab===tab.key?'rgba(255,255,255,0.3)':'#eee', borderRadius:10, padding:'1px 7px', marginLeft:4, fontSize:12 }}>{tab.count}</span>
                        </button>
                    ))}
                </div>
                <div style={{ overflowY:'auto', padding:'1rem 1.25rem', flex:1 }}>
                    {loading ? (
                        <div className="text-center text-muted py-4"><div className="spinner-border spinner-border-sm me-2" role="status"></div>Loading tasks...</div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-muted py-4">No {activeTab==='all'?'':activeTab.toLowerCase()+' '}tasks found for this quarter.</div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light" style={{ position:'sticky', top:0 }}>
                                <tr><th>Title</th><th>Status</th><th>Priority</th><th>Deadline</th><th>Progress</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map((task, idx) => {
                                    const days = task.days_until_deadline;
                                    let deadlineLabel = '—', deadlineSub = null;
                                    if (task.deadline) {
                                        deadlineLabel = new Date(task.deadline).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
                                        if (task.derivedStatus === 'Overdue' && days !== null)
                                            deadlineSub = <div style={{ fontSize:11, color:'#dc3545', fontWeight:600 }}>{Math.abs(days)} day{Math.abs(days)!==1?'s':''} overdue</div>;
                                        else if (task.derivedStatus === 'Ongoing' && days !== null)
                                            deadlineSub = <div style={{ fontSize:11, color:days<=2?'#dc3545':'#6c757d' }}>{days===0?'Due today':`${days} day${days!==1?'s':''} left`}</div>;
                                        else if (task.derivedStatus === 'Completed' && task.completed_at)
                                            deadlineSub = <div style={{ fontSize:11, color:'#28a745' }}>Done {new Date(task.completed_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</div>;
                                    }
                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td><div style={{ fontWeight:500 }}>{task.title}</div>{task.description && <small className="text-muted">{task.description}</small>}</td>
                                            <td><span className={`badge bg-${statusBadge(task.derivedStatus)}`}>{task.derivedStatus}</span></td>
                                            <td><span className={`badge bg-${priorityBadge(task.priority)}`}>{task.priority ?? '—'}</span></td>
                                            <td style={{ whiteSpace:'nowrap' }}>{deadlineLabel}{deadlineSub}</td>
                                            <td style={{ minWidth:100 }}>
                                                <div className="progress" style={{ height:16 }}>
                                                    <div className="progress-bar bg-success" style={{ width:`${task.progress??0}%` }}>{task.progress??0}%</div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid #dee2e6', display:'flex', justifyContent:'flex-end', flexShrink:0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MAIN PAGE
// ====================================================================
function SupervisorQuarterlyReportPage() {
    const now = new Date();

    const [summary, setSummary]         = useState({ total:0, completed:0, ongoing:0, overdue:0, completion_rate:0 });
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [employees, setEmployees]     = useState([]);
    const [department, setDepartment]   = useState(null);
    const [supervisor, setSupervisor]   = useState(null);
    const [year, setYear]               = useState(now.getFullYear());
    const [quarter, setQuarter]         = useState(getCurrentQuarter());
    const [modalEmp, setModalEmp]       = useState(null);
    const [loadError, setLoadError]     = useState(null);

    // Chart refs
    const monthlyBarRef = useRef(null);
    const donutRef      = useRef(null);
    const hBarRef       = useRef(null);
    const monthlyBarChart = useRef(null);
    const donutChart      = useRef(null);
    const hBarChart       = useRef(null);

    // Quarter boundaries (for modal)
    const qMonthStart  = (quarter - 1) * 3 + 1;
    const qMonthEnd    = qMonthStart + 2;
    const quarterStart = `${year}-${String(qMonthStart).padStart(2,'0')}-01`;
    const lastDay      = new Date(year, qMonthEnd, 0).getDate();
    const quarterEnd   = `${year}-${String(qMonthEnd).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

    // Fetch whenever year or quarter changes — no department param
    useEffect(() => {
        setModalEmp(null);
        setLoadError(null);
        fetch(`php/get_supervisor_quarterly_report.php?year=${year}&quarter=${quarter}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setLoadError(data.error); return; }
                setSummary(data.summary);
                setMonthlyTrend(data.monthly_trend ?? []);
                setEmployees(data.employees ?? []);
                setDepartment(data.department ?? null);
                setSupervisor(data.supervisor ?? null);
            })
            .catch(err => setLoadError(err.message));
    }, [year, quarter]);

    // Derived chart data
    const monthNames     = monthlyTrend.map(m => m.month_name);
    const trendCompleted = monthlyTrend.map(m => m.completed);
    const trendOngoing   = monthlyTrend.map(m => m.ongoing);
    const trendOverdue   = monthlyTrend.map(m => m.overdue);
    const donutData      = [summary.completed, summary.ongoing, summary.overdue];
    const empSorted      = [...employees].sort((a, b) => b.completion_rate - a.completion_rate);
    const empNames       = empSorted.map(e => e.name);
    const empCompleted   = empSorted.map(e => e.completed);
    const empOverdue     = empSorted.map(e => e.overdue);

    // Rebuild charts
    useEffect(() => {
        // 1. STACKED BAR — monthly trend
        if (monthlyBarChart.current) monthlyBarChart.current.destroy();
        monthlyBarChart.current = new Chart(monthlyBarRef.current, {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [
                    { label:'Completed', data:trendCompleted, backgroundColor:'#28a745', borderRadius:4 },
                    { label:'Ongoing',   data:trendOngoing,   backgroundColor:'#ffc107', borderRadius:4 },
                    { label:'Overdue',   data:trendOverdue,   backgroundColor:'#dc3545', borderRadius:4 },
                ]
            },
            options: {
                responsive:true, maintainAspectRatio:false,
                plugins: {
                    legend: { position:'top' },
                    tooltip: { callbacks: { footer: (items) => {
                        const idx  = items[0].dataIndex;
                        const comp = trendCompleted[idx];
                        const tot  = comp + trendOngoing[idx] + trendOverdue[idx];
                        return `Completion rate: ${tot > 0 ? Math.round((comp/tot)*100) : 0}%`;
                    }}}
                },
                scales: {
                    x: { stacked:true, grid:{ display:false } },
                    y: { stacked:true, beginAtZero:true, ticks:{ stepSize:1 } }
                }
            }
        });

        // 2. DONUT — overall status breakdown
        if (donutChart.current) donutChart.current.destroy();
        donutChart.current = new Chart(donutRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Completed','Ongoing','Overdue'],
                datasets: [{
                    data: donutData,
                    backgroundColor: ['#28a745','#ffc107','#dc3545'],
                    borderWidth: 2, borderColor: '#fff', hoverOffset: 8,
                }]
            },
            options: {
                responsive:true, maintainAspectRatio:false, cutout:'65%',
                plugins: {
                    legend: { position:'bottom' },
                    tooltip: { callbacks: { label: (ctx) => {
                        const val = ctx.raw;
                        const tot = donutData.reduce((a,b) => a+b, 0);
                        const pct = tot > 0 ? Math.round((val/tot)*100) : 0;
                        return ` ${ctx.label}: ${val} (${pct}%)`;
                    }}}
                }
            }
        });

        // 3. HORIZONTAL BAR — employee performance
        if (hBarChart.current) hBarChart.current.destroy();
        if (empSorted.length > 0) {
            hBarChart.current = new Chart(hBarRef.current, {
                type: 'bar',
                data: {
                    labels: empNames,
                    datasets: [
                        { label:'Completed', data:empCompleted, backgroundColor:'#28a745', borderRadius:4 },
                        { label:'Overdue',   data:empOverdue,   backgroundColor:'#dc3545', borderRadius:4 },
                    ]
                },
                options: {
                    indexAxis:'y', responsive:true, maintainAspectRatio:false,
                    plugins: {
                        legend: { position:'top' },
                        tooltip: { callbacks: { afterLabel: (ctx) => {
                            const emp = empSorted[ctx.dataIndex];
                            return emp ? `Completion rate: ${emp.completion_rate}%` : '';
                        }}}
                    },
                    scales: { x:{ beginAtZero:true, ticks:{ stepSize:1 } }, y:{ grid:{ display:false } } }
                }
            });
        }

        return () => {
            if (monthlyBarChart.current) monthlyBarChart.current.destroy();
            if (donutChart.current)      donutChart.current.destroy();
            if (hBarChart.current)       hBarChart.current.destroy();
        };
    }, [summary, employees, monthlyTrend, year, quarter]);

    // Quarter navigation
    const isCurrentQuarter = (year === now.getFullYear() && quarter === getCurrentQuarter());
    const goToPrevQuarter  = () => { if (quarter === 1) { setYear(y => y-1); setQuarter(4); } else setQuarter(q => q-1); };
    const goToNextQuarter  = () => { if (quarter === 4) { setYear(y => y+1); setQuarter(1); } else setQuarter(q => q+1); };
    const goToCurrent      = () => { setYear(now.getFullYear()); setQuarter(getCurrentQuarter()); };

    const summaryRate = summary.completion_rate ?? 0;

    return (
        <div className="container-fluid p-4">
            <div className="row">
               

                <main>

                    {/* Page header */}
                    <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                            <h2 className="mb-1">Quarterly Report</h2>
                            <div className="d-flex align-items-center gap-2">
                                {department && <span className="dept-badge">{department.name}</span>}
                                {supervisor  && <span className="text-muted" style={{ fontSize:13 }}>Supervisor: {supervisor.name}</span>}
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={goToPrevQuarter}>‹ Prev</button>
                            <span className="fw-semibold" style={{ minWidth:220, textAlign:'center' }}>{formatQuarterDisplay(year, quarter)}</span>
                            <button className="btn btn-sm btn-outline-secondary" onClick={goToNextQuarter} disabled={isCurrentQuarter}>Next ›</button>
                            {!isCurrentQuarter && <button className="btn btn-sm btn-outline-primary" onClick={goToCurrent}>This Quarter</button>}
                        </div>
                    </div>

                    {/* Error */}
                    {loadError && (
                        <div className="alert alert-danger mb-4">
                            <strong>Error:</strong> {loadError}
                            {loadError.includes('authenticated') && <span> — <a href="login.html">Please log in</a>.</span>}
                        </div>
                    )}

              

                    {/* Summary cards — 5 cards including Completion Rate */}
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
                                <h2 className={`mb-0 ${summaryRate>=70?'text-success':summaryRate>=40?'text-warning':'text-danger'}`}>{summaryRate}%</h2>
                            </div>
                        </div>
                    </div>

                    {/* Row 1: Monthly stacked bar + Donut */}
                    <div className="row mb-4">
                        <div className="col-md-8">
                            <div className="card shadow-sm border-0 p-3 h-100">
                                <h5 className="mb-1">Monthly Breakdown</h5>
                                <small className="text-muted d-block mb-3">
                                    Task volume and composition across the 3 months of {QUARTER_LABELS[quarter]} {year}
                                </small>
                                <div style={{ height:260 }}><canvas ref={monthlyBarRef}></canvas></div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card shadow-sm border-0 p-3 h-100">
                                <h5 className="mb-1">Quarter Status Mix</h5>
                                <small className="text-muted d-block mb-3">
                                    Overall share of completed, ongoing, and overdue tasks
                                </small>
                                <div style={{ height:260 }}><canvas ref={donutRef}></canvas></div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Horizontal bar — staff performance */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <h5 className="mb-1">Staff Performance</h5>
                                <small className="text-muted d-block mb-3">
                                    Sorted by completion rate. Hover a bar for completion rate.
                                </small>
                                <div style={{ height: Math.max(200, empSorted.length * 36) }}>
                                    <canvas ref={hBarRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staff details table — no Department column since all staff same dept */}
                    <div className="card shadow-sm border-0 p-3">
                        <h5 className="mb-3">
                            Staff Details
                            {department && <span className="text-muted fw-normal ms-2" style={{ fontSize:14 }}>— {department.name}</span>}
                        </h5>
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Staff Member</th>
                                        <th>Completed</th>
                                        <th>Ongoing</th>
                                        <th>Overdue</th>
                                        <th>Completion Rate</th>
                                        <th style={{ textAlign:'center' }}>Tasks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center text-muted py-4">No staff activity found for this quarter.</td></tr>
                                    ) : employees.map(emp => {
                                        const rate  = emp.completion_rate;
                                        const total = emp.total;
                                        return (
                                            <tr key={emp.id}>
                                                <td style={{ fontWeight:500 }}>{emp.name}</td>
                                                <td>{emp.completed}</td>
                                                <td>{emp.ongoing}</td>
                                                <td className="text-danger fw-bold">{emp.overdue}</td>
                                                <td>
                                                    {total === 0 ? (
                                                        <span className="text-muted" style={{ fontSize:'0.9em' }}>No tasks yet</span>
                                                    ) : rate === 0 ? (
                                                        <span className="text-danger" style={{ fontSize:'0.9em', fontWeight:500 }}>0% — None completed</span>
                                                    ) : (
                                                        <div className="progress" style={{ height:20 }}>
                                                            <div className="progress-bar bg-success" style={{ width:`${rate}%` }} aria-valuenow={rate} aria-valuemin="0" aria-valuemax="100">{rate}%</div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign:'center' }} onClick={e => { e.stopPropagation(); setModalEmp(emp); }}>
                                                    <button className="btn btn-link p-0" title={`View ${emp.name}'s tasks this quarter`} style={{ color:'#0d6efd' }}>
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

            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    quarterStart={quarterStart}
                    quarterEnd={quarterEnd}
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('supervisorQuarterlyRoot'));
root.render(<SupervisorQuarterlyReportPage />);