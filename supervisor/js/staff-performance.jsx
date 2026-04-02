/* ---------------- Staff Performance ---------------- */
function StaffPerformance() {
    const [staffs, setStaffs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    function extractArray(payload, keys = []) {
        if (Array.isArray(payload)) return payload;

        for (const key of keys) {
            if (Array.isArray(payload?.[key])) return payload[key];
        }

        return [];
    }

    React.useEffect(() => {
        async function loadStaffPerformance() {
            try {
                setLoading(true);
                setError("");

                const res = await fetch("php/get_staff_performance.php", {
                    headers: { Accept: "application/json" }
                });

                const json = await res.json().catch(() => []);
                const safeStaffs = extractArray(json, ["staffs", "data", "results"]);

                setStaffs(safeStaffs);

                if (!res.ok) {
                    setError("Failed to load staff performance.");
                }
            } catch (err) {
                console.error("Failed to load staff performance", err);
                setStaffs([]);
                setError("Failed to load staff performance.");
            } finally {
                setLoading(false);
            }
        }

        loadStaffPerformance();
    }, []);

    return (
        <>
            {error && (
                <div className="alert alert-warning" role="alert">
                    {error}
                </div>
            )}

            <div className="card p-3" style={{ borderColor: "#ffb366" }}>
                <h5>Staff Performance</h5>

                <div
                    style={{
                        minHeight: "300px",
                        background: "#fff3e0",
                        borderRadius: "8px",
                        padding: "20px"
                    }}
                >
                    {loading ? (
                        <div className="text-center text-warning">
                            Loading staff performance...
                        </div>
                    ) : staffs.length === 0 ? (
                        <div className="text-center text-danger">
                            No staff found.
                        </div>
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
                                    {staffs.map((s) => (
                                        <tr
                                            key={s.id || s.email || s.name}
                                            className={(s.overdue || 0) > 0 ? "overdue" : ""}
                                        >
                                            <td>{s.name || "-"}</td>
                                            <td>{s.total ?? 0}</td>
                                            <td>{s.completed ?? 0}</td>
                                            <td>{s.ongoing ?? 0}</td>
                                            <td>{s.overdue ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

/* ---------------- Render the Staff Performance ---------------- */
const staffPerformanceRoot = document.getElementById("staff-performance-root");

if (staffPerformanceRoot) {
    ReactDOM.createRoot(staffPerformanceRoot).render(<StaffPerformance />);
} else {
    console.error("staff-performance-root not found");
}