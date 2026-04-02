
/* ---------------- Staff Performance ---------------- */
function StaffPerformance() {
    const [staffs, setStaffs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        fetch('php/get_staff_performance.php')
            .then(res => res.json())
            .then(data => {
                setStaffs(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="card p-3" style={{ borderColor: '#ffb366' }}>
            <h5>Manage Staffs</h5>
            <div style={{ minHeight: '300px', background: '#fff3e0', borderRadius: '8px', padding: '20px' }}>
                {loading ? (
                    <div className="text-center text-warning">Loading staff list...</div>
                ) : staffs.length === 0 ? (
                    <div className="text-center text-danger">No staff found.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Total Tasks</th>
                                    <th>Completed</th>
                                    <th>Ongoing</th>
                                    <th>Overdue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffs.map((s, idx) => (
                                    <tr key={idx} className={s.overdue > 0 ? 'overdue' : ''}>
                                        <td>{s.name}</td>
                                        <td>{s.total}</td>
                                        <td>{s.completed}</td>
                                        <td>{s.ongoing}</td>
                                        <td>{s.overdue}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---------------- Render the Staff Performance ---------------- */
ReactDOM.createRoot(document.getElementById('staff-performance-root')).render(<StaffPerformance />);
