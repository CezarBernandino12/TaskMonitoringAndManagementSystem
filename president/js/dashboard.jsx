const { useState, useEffect, useRef } = React;

// ====================================================================
// SIDEBAR
// ====================================================================
function Sidebar() {
    const [showReports, setShowReports] = useState(false);
    return (
        <nav className="col-md-2 d-none d-md-block bg-white border-end min-vh-100 p-0">
            <div className="sidebar-orange d-flex flex-column p-3 gap-2 min-vh-100">
                <a href="dashboard.html" className="nav-link fw-semibold">Dashboard</a>
                <a href="#" className="nav-link fw-semibold d-flex justify-content-between align-items-center"
                    onClick={e => { e.preventDefault(); setShowReports(p => !p); }} style={{ cursor:'pointer' }}>
                    <span>Reports</span>
                    <span style={{ fontSize:'1.1em' }}>{showReports ? '▼' : '▶'}</span>
                </a>
                {showReports && (
                    <div style={{ marginLeft: 12 }}>
                        <a href="daily-reports.html"     className="nav-link fw-semibold">Daily</a>
                        <a href="weekly-reports.html"    className="nav-link fw-semibold">Weekly</a>
                        <a href="monthly-reports.html"   className="nav-link fw-semibold">Monthly</a>
                        <a href="quarterly-reports.html" className="nav-link fw-semibold">Quarterly</a>
                        <a href="annual-reports.html"    className="nav-link fw-semibold">Annually</a>
                    </div>
                )}
                <a href="profile.html" className="nav-link fw-semibold">Profile</a>
            </div>
        </nav>
    );
}

// ====================================================================
// ORG HEALTH RING — doughnut showing ongoing / overdue / completed today
// ====================================================================
function HealthRing({ ongoing, overdue, completedToday, overallRate }) {
    const ref      = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) chartRef.current.destroy();
        chartRef.current = new Chart(ref.current, {
            type: 'doughnut',
            data: {
                labels: ['Completed today', 'Ongoing', 'Overdue'],
                datasets: [{
                    data: [completedToday, ongoing, overdue],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff',
                }]
            },
            options: {
                cutout: '72%',
                responsive: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: {
                    label: ctx => ` ${ctx.label}: ${ctx.parsed}`
                }}}
            }
        });
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [ongoing, overdue, completedToday]);

    return (
        <div className="health-ring-wrap">
            <canvas ref={ref} width="160" height="160"></canvas>
            <div className="health-ring-label">
                <span style={{ fontSize: 26, fontWeight: 700, color: '#333' }}>{overallRate}%</span>
                <span style={{ fontSize: 11, color: '#888' }}>all-time rate</span>
            </div>
        </div>
    );
}

// ====================================================================
// OVERDUE TREND SPARKLINE — 4-week mini line chart
// ====================================================================
function OverdueTrend({ trend }) {
    const ref      = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!trend.length) return;
        if (chartRef.current) chartRef.current.destroy();
        chartRef.current = new Chart(ref.current, {
            type: 'line',
            data: {
                labels: trend.map(t => t.label),
                datasets: [{
                    data: trend.map(t => t.count),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220,53,69,0.08)',
                    pointBackgroundColor: '#dc3545',
                    pointRadius: 4,
                    tension: 0.3,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }
                }
            }
        });
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [trend]);

    // Trend direction: compare last week to first week
    let trendIcon = null;
    if (trend.length >= 2) {
        const first = trend[0].count;
        const last  = trend[trend.length - 1].count;
        if (last > first)      trendIcon = <span className="trend-up   ms-2 fw-semibold">↑ Increasing</span>;
        else if (last < first) trendIcon = <span className="trend-down ms-2 fw-semibold">↓ Decreasing</span>;
        else                   trendIcon = <span className="trend-flat ms-2 fw-semibold">→ Stable</span>;
    }

    return (
        <div>
            <div className="d-flex align-items-center mb-2">
                <h6 className="mb-0">Overdue trend (last 4 weeks)</h6>
                {trendIcon}
            </div>
            <div style={{ height: 100 }}>
                <canvas ref={ref}></canvas>
            </div>
        </div>
    );
}

// ====================================================================
// DASHBOARD
// ====================================================================
function Dashboard() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        fetch('php/get_dashboard.php')
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                setData(d);
                setLoading(false);
            })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div className="container-fluid py-4"><div className="row"><Sidebar />
            <main className="col-md-10 ms-sm-auto px-4 d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="text-center text-muted">
                    <div className="spinner-border mb-3" role="status"></div>
                    <div>Loading dashboard…</div>
                </div>
            </main>
        </div></div>
    );

    if (error) return (
        <div className="container-fluid py-4"><div className="row"><Sidebar />
            <main className="col-md-10 ms-sm-auto px-4">
                <div className="alert alert-danger mt-4">Error: {error}</div>
            </main>
        </div></div>
    );

    const { org_health, overdue_trend, at_risk, top_performers, snapshots, month_label } = data;

    return (
        <div className="container-fluid py-4">
            <div className="row">
                <Sidebar />

                <main className="col-md-10 ms-sm-auto px-4">

                    {/* Header */}
                    <div className="mb-4">
                        <h3 className="mb-0">President Dashboard</h3>
                        <p className="text-muted mb-0">Real-time organization overview · {new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
                    </div>

                    {/* ── Row 1: Org Health + Overdue Trend ── */}
                    <div className="row mb-4">

                        {/* Org health ring */}
                        <div className="col-md-4">
                            <div className="card p-3 h-100">
                                <h6 className="mb-3 fw-semibold">Organization Health</h6>
                                <HealthRing
                                    ongoing={org_health.ongoing}
                                    overdue={org_health.overdue}
                                    completedToday={org_health.completed_today}
                                    overallRate={org_health.overall_rate}
                                />
                                {/* Legend */}
                                <div className="d-flex justify-content-center gap-3 mt-3" style={{ fontSize: 13 }}>
                                    <span><span style={{ background:'#28a745', borderRadius:3, display:'inline-block', width:10, height:10, marginRight:4 }}></span>Done today: <strong>{org_health.completed_today}</strong></span>
                                    <span><span style={{ background:'#ffc107', borderRadius:3, display:'inline-block', width:10, height:10, marginRight:4 }}></span>Ongoing: <strong>{org_health.ongoing}</strong></span>
                                    <span><span style={{ background:'#dc3545', borderRadius:3, display:'inline-block', width:10, height:10, marginRight:4 }}></span>Overdue: <strong>{org_health.overdue}</strong></span>
                                </div>
                                <div className="text-center mt-2" style={{ fontSize: 12, color: '#888' }}>
                                    Based on all {org_health.total_active} active tasks
                                </div>
                            </div>
                        </div>

                        {/* Overdue trend sparkline */}
                        <div className="col-md-4">
                            <div className="card p-3 h-100">
                                <OverdueTrend trend={overdue_trend} />
                                <p className="text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                                    Counts tasks whose deadline fell within each week and are still incomplete.
                                    A decreasing trend means the team is catching up.
                                </p>
                            </div>
                        </div>

                        {/* Departments at risk */}
                        <div className="col-md-4">
                            <div className="card p-3 h-100">
                                <h6 className="mb-3 fw-semibold">Departments at Risk</h6>
                                <p className="text-muted mb-3" style={{ fontSize: 12 }}>Ranked by overdue rate (overdue ÷ total tasks). Rate is fairer than raw count.</p>
                                {at_risk.length === 0 ? (
                                    <div className="text-center text-success py-2">
                                        <div style={{ fontSize: 28 }}>✓</div>
                                        No departments at risk
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {at_risk.map((dept, i) => (
                                            <div key={dept.department}>
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{dept.department}</span>
                                                    <span style={{ fontSize: 12, color: dept.overdue_rate >= 50 ? '#dc3545' : '#856404', fontWeight: 600 }}>
                                                        {dept.overdue_rate}% overdue
                                                    </span>
                                                </div>
                                                <div className="risk-bar">
                                                    <div className="risk-bar-fill" style={{ width: `${dept.overdue_rate}%`, opacity: 0.7 + (i === 0 ? 0.3 : 0) }}></div>
                                                </div>
                                                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                                                    {dept.overdue} of {dept.total} tasks overdue
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Row 2: Top performers + Report snapshots ── */}
                    <div className="row mb-4">

                        {/* Top performers this month */}
                        <div className="col-md-5">
                            <div className="card p-3 h-100">
                                <h6 className="mb-1 fw-semibold">Top Performers</h6>
                                <p className="text-muted mb-3" style={{ fontSize: 12 }}>Most tasks completed this month · {month_label}</p>
                                {top_performers.length === 0 ? (
                                    <div className="text-center text-muted py-3">No completions recorded this month yet.</div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {top_performers.map((p, i) => (
                                            <div key={p.name} className="d-flex align-items-center gap-3 p-2 rounded" style={{ background: i === 0 ? 'rgba(255,215,0,0.08)' : 'transparent' }}>
                                                <div className={`performer-rank ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>
                                                    {i + 1}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                    <div style={{ fontSize: 12, color: '#888' }}>{p.department}</div>
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: 18, color: '#28a745', minWidth: 32, textAlign: 'right' }}>
                                                    {p.completed_this_month}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Report snapshots */}
                        <div className="col-md-7">
                            <h6 className="fw-semibold mb-3">Report Snapshots</h6>
                            <div className="d-flex flex-column gap-2">
                                {snapshots.map(snap => {
                                    const rate = snap.data.total > 0
                                        ? Math.round((snap.data.completed / snap.data.total) * 100)
                                        : 0;
                                    return (
                                        <a key={snap.label} href={snap.href} className="card snapshot-card p-3 d-flex flex-row align-items-center gap-3" style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{ flex: 1 }}>
                                                <div className="d-flex align-items-baseline gap-2">
                                                    <span style={{ fontWeight: 600, fontSize: 15 }}>{snap.label}</span>
                                                    <span style={{ fontSize: 12, color: '#888' }}>{snap.sub}</span>
                                                </div>
                                                <div className="d-flex gap-3 mt-1" style={{ fontSize: 13 }}>
                                                    <span><strong>{snap.data.total}</strong> tasks</span>
                                                    <span className="text-success"><strong>{snap.data.completed}</strong> completed</span>
                                                    {snap.data.overdue > 0 && (
                                                        <span className="text-danger"><strong>{snap.data.overdue}</strong> overdue</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: 80 }}>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: rate >= 70 ? '#28a745' : rate >= 40 ? '#cc8400' : '#dc3545' }}>
                                                    {rate}%
                                                </div>
                                                <div style={{ fontSize: 11, color: '#888' }}>completion</div>
                                            </div>
                                            <div style={{ color: '#ffb84d', fontSize: 18 }}>›</div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
