/* ---------------- Staff Performance ---------------- */

function StaffPerformance() {
    const [staffs, setStaffs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    function extractArray(payload, keys = []) {
        if (Array.isArray(payload)) return payload;

        for (const key of keys) {
            if (Array.isArray(payload?.[key])) {
                return payload[key];
            }
        }

        return [];
    }

    function toNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function getTotalTasks(staff) {
        const givenTotal = toNumber(staff.total);

        const calculatedTotal =
            toNumber(staff.completed) +
            toNumber(staff.ongoing) +
            toNumber(staff.overdue);

        return givenTotal > 0 ? givenTotal : calculatedTotal;
    }

    function getPerformancePercentage(staff) {
        const total = getTotalTasks(staff);
        const completed = toNumber(staff.completed);

        if (total <= 0) return 0;

        const percentage = Math.round((completed / total) * 100);

        return Math.min(100, Math.max(0, percentage));
    }

    function getInitials(name) {
        if (!name) return "?";

        return name
            .trim()
            .split(/\s+/)
            .map((word) => word.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();
    }

    function getAvatarSource(staff) {
        return (
            staff.avatar ||
            staff.image ||
            staff.photo ||
            staff.profile_image ||
            staff.profileImage ||
            staff.avatar_url ||
            ""
        );
    }

    React.useEffect(() => {
        async function loadStaffPerformance() {
            try {
                setLoading(true);
                setError("");

                const res = await fetch("php/get_staff_performance.php", {
                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!res.ok) {
                    throw new Error("Failed to load staff performance.");
                }

                const json = await res.json();
                const safeStaffs = extractArray(json, ["staffs", "data", "results"]);

                setStaffs(safeStaffs);
            } catch (err) {
                console.error("Failed to load staff performance:", err);
                setStaffs([]);
                setError("Failed to load staff performance.");
            } finally {
                setLoading(false);
            }
        }

        loadStaffPerformance();
    }, []);

    return (
        <section className="staff-performance-page">
            <div className="staff-performance-title-wrap">
                <h3>Staff Performance</h3>
            </div>

            {error && (
                <div className="staff-performance-alert" role="alert">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <span>{error}</span>
                </div>
            )}

            <div className="staff-performance-table-card">
                {loading ? (
                    <div className="staff-performance-state">
                        Loading staff performance...
                    </div>
                ) : staffs.length === 0 ? (
                    <div className="staff-performance-state text-danger">
                        No staff found.
                    </div>
                ) : (
                    <div className="staff-performance-table-scroll">
                        <table className="staff-performance-table">
                            <thead>
                                <tr>
                                    <th>Staff member</th>
                                    <th>Total Tasks</th>
                                    <th>Completed</th>
                                    <th>Ongoing</th>
                                    <th>Overdue</th>
                                    <th>Performance</th>
                                </tr>
                            </thead>

                            <tbody>
                                {staffs.map((staff, index) => {
                                    const avatarSource = getAvatarSource(staff);
                                    const total = getTotalTasks(staff);
                                    const completed = toNumber(staff.completed);
                                    const ongoing = toNumber(staff.ongoing);
                                    const overdue = toNumber(staff.overdue);
                                    const performance = getPerformancePercentage(staff);

                                    return (
                                        <tr
                                            key={staff.id || staff.email || `${staff.name || "staff"}-${index}`}
                                            className={overdue > 0 ? "staff-row-overdue" : ""}
                                        >

                                            <td>
                                                <div className="staff-member">
                                                    {avatarSource ? (
                                                        <img
                                                            src={avatarSource}
                                                            alt={staff.name || "Staff"}
                                                            className="staff-avatar"
                                                        />
                                                    ) : (
                                                        <div className="staff-avatar staff-avatar-fallback">
                                                            {getInitials(staff.name)}
                                                        </div>
                                                    )}

                                                    <span className="staff-name">
                                                        {staff.name || "-"}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>{total}</td>
                                            <td>{completed}</td>
                                            <td>{ongoing}</td>
                                            <td>{overdue}</td>

                                            <td>
                                                <div className="staff-performance-bar-wrap">
                                                    <div className="staff-performance-track">
                                                        <div
                                                            className="staff-performance-fill"
                                                            style={{ width: `${performance}%` }}
                                                        ></div>
                                                    </div>

                                                    <span className="staff-performance-percent">
                                                        {performance}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ---------------- Render Staff Performance ---------------- */

const staffPerformanceRoot = document.getElementById("staff-performance-root");

if (staffPerformanceRoot) {
    ReactDOM.createRoot(staffPerformanceRoot).render(<StaffPerformance />);
} else {
    console.error("staff-performance-root not found");
}