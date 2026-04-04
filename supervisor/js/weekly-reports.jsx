
const { useEffect, useState, useRef } = React;


// ====================================================================
// HELPERS
// ====================================================================
function getWeekStart(offsetWeeks = 0) {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function weekDayLabels(monday) {
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return `${d} ${date.getDate()}`;
    });
}

// ====================================================================
// EMPLOYEE TASK MODAL
// ====================================================================
function EmployeeTaskModal({ emp, weekStart, weekEnd, onClose }) {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        setLoading(true); setError(null); setTasks([]); setActiveTab('all');
        const start = formatDate(weekStart);
        const end   = formatDate(weekEnd);
        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}&week_start=${start}&week_end=${end}`)
            .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
            .then(data => { if (data.error) throw new Error(data.error); setTasks(Array.isArray(data.tasks) ? data.tasks : []); setLoading(false); })
            .catch(err => { setError(`Could not load tasks: ${err.message}`); setLoading(false); });
    }, [emp.id, weekStart, weekEnd]);

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
                        <small className="text-muted">{emp.department} &nbsp;·&nbsp; Week of {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}</small>
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
                            border:`2px solid ${activeTab===tab.key ? tab.color : '#dee2e6'}`, borderRadius:20, padding:'3px 14px',
                            background:activeTab===tab.key ? tab.color : '#fff', color:activeTab===tab.key ? '#fff' : '#555',
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
                        <div className="text-center text-muted py-4">No {activeTab === 'all' ? '' : activeTab.toLowerCase() + ' '}tasks found for this week.</div>
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
function SupervisorWeeklyReportPage() {
    const [summary, setSummary]       = useState({ total:0, completed:0, ongoing:0, overdue:0 });
    const [employees, setEmployees]   = useState([]);
    const [dailyTrend, setDailyTrend] = useState([]);
    const [department, setDepartment] = useState(null); // { id, name } from API
    const [supervisor, setSupervisor] = useState(null); // { id, name } from API
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalEmp, setModalEmp]     = useState(null);
    const [loadError, setLoadError]   = useState(null);

    const lineRef  = useRef(null);
    const pieRef   = useRef(null);
    const lineChart  = useRef(null);
    const pieChart   = useRef(null);

    const weekStart = getWeekStart(weekOffset);
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Fetch whenever week changes — no department param, scoped by session server-side
    useEffect(() => {
        setSelectedEmp(null);
        setModalEmp(null);
        setLoadError(null);
        const start = formatDate(weekStart);
        const end   = formatDate(weekEnd);
        fetch(`php/get_supervisor_weekly_report.php?week_start=${start}&week_end=${end}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setLoadError(data.error); return; }
                setSummary(data.summary);
                setEmployees(data.employees ?? []);
                setDailyTrend(data.daily_trend ?? []);
                setDepartment(data.department ?? null);
                setSupervisor(data.supervisor ?? null);
            })
            .catch(err => setLoadError(err.message));
    }, [weekOffset]);

    const handleRowClick = (emp) => setSelectedEmp(prev => prev?.id === emp.id ? null : emp);

    // Derived chart data
    const dayLabels     = weekDayLabels(weekStart);
    const trendSource   = (selectedEmp && selectedEmp.daily_trend) ? selectedEmp.daily_trend : dailyTrend;
    const lineCompleted = trendSource.map(d => d.completed ?? 0);
    const lineOngoing   = trendSource.map(d => d.ongoing   ?? 0);
    const lineOverdue   = trendSource.map(d => d.overdue   ?? 0);
    const pieData       = selectedEmp
        ? [selectedEmp.completed, selectedEmp.ongoing, selectedEmp.overdue]
        : [summary.completed, summary.ongoing, summary.overdue];

    // Rebuild charts
    useEffect(() => {
        if (lineChart.current) lineChart.current.destroy();
        lineChart.current = new Chart(lineRef.current, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [
                    { label:'Completed', data:lineCompleted, borderColor:'#28a745', backgroundColor:'rgba(40,167,69,0.08)', pointBackgroundColor:'#28a745', tension:0.4, fill:true },
                    { label:'Ongoing',   data:lineOngoing,   borderColor:'#ffc107', backgroundColor:'rgba(255,193,7,0.08)',  pointBackgroundColor:'#ffc107', tension:0.4, fill:true },
                    { label:'Overdue',   data:lineOverdue,   borderColor:'#dc3545', backgroundColor:'rgba(220,53,69,0.08)',  pointBackgroundColor:'#dc3545', tension:0.4, fill:true },
                ]
            },
            options: {
                responsive:true, maintainAspectRatio:false,
                plugins: { legend:{ position:'top' }, title:{ display:!!selectedEmp, text:selectedEmp?`${selectedEmp.name} — Daily Trend`:'' } },
                scales: { y:{ beginAtZero:true, ticks:{ stepSize:1 } } }
            }
        });

        if (pieChart.current) pieChart.current.destroy();
        pieChart.current = new Chart(pieRef.current, {
            type: 'pie',
            data: {
                labels: ['Completed','Ongoing','Overdue'],
                datasets: [{ data:pieData, backgroundColor:['#28a745','#ffc107','#dc3545'], borderWidth:2, borderColor:'#fff' }]
            },
            options: {
                responsive:true, maintainAspectRatio:false,
                plugins: { legend:{ position:'bottom' }, title:{ display:!!selectedEmp, text:selectedEmp?`${selectedEmp.name} — Status Split`:'' } }
            }
        });

        return () => {
            if (lineChart.current) lineChart.current.destroy();
            if (pieChart.current)  pieChart.current.destroy();
        };
    }, [selectedEmp, summary, employees, dailyTrend, weekOffset]);

    const completionRate = (emp) => {
        const total = emp.completed + emp.ongoing + emp.overdue;
        return total > 0 ? Math.round((emp.completed / total) * 100) : 0;
    };

    const isCurrentWeek = weekOffset === 0;

    return (
        <div className="container-fluid p-4">
            <div className="row">
             

                <main>

                    {/* Page header */}
                    <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                            <h2 className="mb-1">Weekly Report</h2>
                            <div className="d-flex align-items-center gap-2">
                                {department && <span className="dept-badge">{department.name}</span>}
                                {supervisor && <span className="text-muted" style={{ fontSize:13 }}>Supervisor: {supervisor.name}</span>}
                            </div>
                        </div>
                        {/* Week navigation */}
                        <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setWeekOffset(p => p - 1)}>‹ Prev</button>
                            <span className="fw-semibold" style={{ minWidth:200, textAlign:'center' }}>
                                {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
                            </span>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setWeekOffset(p => p + 1)} disabled={isCurrentWeek}>Next ›</button>
                            {weekOffset !== 0 && (
                                <button className="btn btn-sm btn-outline-primary" onClick={() => setWeekOffset(0)}>This Week</button>
                            )}
                        </div>
                    </div>

                    {/* Error state */}
                    {loadError && (
                        <div className="alert alert-danger mb-4">
                            <strong>Error:</strong> {loadError}
                            {loadError.includes('authenticated') && <span> — <a href="login.html">Please log in</a>.</span>}
                        </div>
                    )}

         

                    {/* Summary cards */}
                    <div className="row mb-4">
                        {[
                            { label:'Total Tasks', value:summary.total,     cls:'' },
                            { label:'Completed',   value:summary.completed, cls:'text-success' },
                            { label:'Ongoing',     value:summary.ongoing,   cls:'text-warning' },
                            { label:'Overdue',     value:summary.overdue,   cls:'text-danger' },
                        ].map(c => (
                            <div className="col-md-3" key={c.label}>
                                <div className="card shadow-sm border-0 p-3 text-center">
                                    <h6 className="text-muted mb-1">{c.label}</h6>
                                    <h2 className={`mb-0 ${c.cls}`}>{c.value}</h2>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Line chart — full width */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 p-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Daily Task Trend</h5>
                                    {selectedEmp ? (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge bg-primary">{selectedEmp.name}</span>
                                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedEmp(null)}>✕ Clear</button>
                                        </div>
                                    ) : (
                                        <small className="text-muted">Click a staff row below to filter by employee</small>
                                    )}
                                </div>
                                <div style={{ height:280 }}><canvas ref={lineRef}></canvas></div>
                            </div>
                        </div>
                    </div>

                    {/* Pie chart — half width (no dept comparison chart for supervisor) */}
                    <div className="row mb-4">
                        <div className="col-md-5">
                            <div className="card shadow-sm border-0 p-3 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Status Distribution</h5>
                                    {selectedEmp && <span className="badge bg-primary">{selectedEmp.name}</span>}
                                </div>
                                <div style={{ height:280 }}><canvas ref={pieRef}></canvas></div>
                            </div>
                        </div>
                    </div>

                    {/* Staff details table */}
                    <div className="card shadow-sm border-0 p-3 mt-2">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">
                                Staff Details
                                {department && <span className="text-muted fw-normal ms-2" style={{ fontSize:14 }}>— {department.name}</span>}
                            </h5>
                            {selectedEmp && (
                                <small className="text-muted">
                                    Showing charts for <strong>{selectedEmp.name}</strong> —{' '}
                                    <span style={{ cursor:'pointer', color:'#0d6efd' }} onClick={() => setSelectedEmp(null)}>show all</span>
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
                                        <th>Avg / Day</th>
                                        <th>Completion Rate</th>
                                        <th style={{ textAlign:'center' }}>Tasks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center text-muted py-4">No staff activity found for this week.</td></tr>
                                    ) : employees.map(emp => {
                                        const rate       = completionRate(emp);
                                        const total      = emp.completed + emp.ongoing + emp.overdue;
                                        const avgPerDay  = (emp.completed / 6).toFixed(1);
                                        const isSelected = selectedEmp?.id === emp.id;
                                        return (
                                            <tr key={emp.id} onClick={() => handleRowClick(emp)} style={{
                                                cursor:'pointer',
                                                backgroundColor: isSelected ? '#cfe2ff' : '',
                                                fontWeight: isSelected ? '600' : 'normal',
                                                opacity: selectedEmp && !isSelected ? 0.5 : 1,
                                                transition:'opacity 0.2s, background-color 0.2s'
                                            }}>
                                                <td>
                                                    {isSelected && <span className="me-1" style={{ color:'#0d6efd' }}>▶</span>}
                                                    {emp.name}
                                                </td>
                                                <td>{emp.completed}</td>
                                                <td>{emp.ongoing}</td>
                                                <td className="text-danger fw-bold">{emp.overdue}</td>
                                                <td>{avgPerDay}</td>
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
                                                    <button className="btn btn-link p-0" title={`View ${emp.name}'s tasks this week`} style={{ color:'#0d6efd' }}>
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
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('supervisorWeeklyRoot'));
root.render(<SupervisorWeeklyReportPage />);
