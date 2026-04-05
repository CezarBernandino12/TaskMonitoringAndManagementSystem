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
