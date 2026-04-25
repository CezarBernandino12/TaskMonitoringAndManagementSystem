const { useState, useEffect, useRef } = React;

const ADMIN_COLORS = {
    completed: "#16a34a",
    ongoing: "#d97706",
    overdue: "#e11d48",
    blue: "#2563eb",
    purple: "#7c3aed",
    teal: "#0891b2",
    orange: "#ea580c"
};

function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function percent(part, total) {
    if (!total) return 0;
    return Math.round((safeNumber(part) / safeNumber(total)) * 100);
}

function getChartTheme() {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const dark = root.getAttribute("data-theme") === "dark";

    return {
        dark,
        text: styles.getPropertyValue("--dash-text").trim() || (dark ? "#f3f4f6" : "#111827"),
        muted: styles.getPropertyValue("--dash-muted").trim() || (dark ? "#9ca3af" : "#6b7280"),
        panel: styles.getPropertyValue("--dash-surface").trim() || (dark ? "#18212f" : "#ffffff"),
        surfaceSoft:
            styles.getPropertyValue("--dash-surface-soft").trim() ||
            (dark ? "#1d2736" : "#fafbfc"),
        grid: dark ? "rgba(255,255,255,0.08)" : "#eceff3",
        tooltipBg: dark ? "rgba(15,23,42,0.96)" : "rgba(17,24,39,0.92)"
    };
}

function useThemeVersion() {
    const [themeVersion, setThemeVersion] = useState(0);

    useEffect(() => {
        const root = document.documentElement;

        const observer = new MutationObserver(() => {
            setThemeVersion((prev) => prev + 1);
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ["data-theme"]
        });

        return () => observer.disconnect();
    }, []);

    return themeVersion;
}

function titleCase(value) {
    return String(value || "")
        .replace(/_/g, " ")
        .replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
}

function timeAgo(dateStr) {
    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) return "Unknown";

    const diff = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";

    return Math.floor(diff / 86400) + "d ago";
}

function roleBadge(role) {
    const normalized = String(role || "staff").toLowerCase();

    const cls = {
        admin: "role-admin",
        supervisor: "role-supervisor",
        staff: "role-staff",
        president: "role-president"
    }[normalized] || "role-staff";

    return <span className={`role-badge ${cls}`}>{titleCase(normalized)}</span>;
}

function StatusDot({ active }) {
    return (
        <span className="dash-user-status">
            <span className={`active-dot ${active ? "dot-active" : "dot-inactive"}`}></span>
            <span>{active ? "Active" : "Inactive"}</span>
        </span>
    );
}

function AdminStatCard({ label, value, icon, tone }) {
    return (
        <div className={`dash-admin-stat tone-${tone}`}>
            <div className="dash-admin-stat-icon">
                <i className={`bi ${icon}`}></i>
            </div>

            <div className="dash-admin-stat-copy">
                <div className="dash-admin-stat-label">{label}</div>
                <div className="dash-admin-stat-value">{safeNumber(value)}</div>
            </div>
        </div>
    );
}

function AdminTaskRing({ completed, ongoing, overdue, rate }) {
    const ref = useRef(null);
    const chartRef = useRef(null);
    const themeVersion = useThemeVersion();

    const completedValue = safeNumber(completed);
    const ongoingValue = safeNumber(ongoing);
    const overdueValue = safeNumber(overdue);
    const total = completedValue + ongoingValue + overdueValue;

    const legendItems = [
        {
            label: "Completed",
            value: completedValue,
            percent: percent(completedValue, total),
            color: ADMIN_COLORS.completed
        },
        {
            label: "Ongoing",
            value: ongoingValue,
            percent: percent(ongoingValue, total),
            color: ADMIN_COLORS.ongoing
        },
        {
            label: "Overdue",
            value: overdueValue,
            percent: percent(overdueValue, total),
            color: ADMIN_COLORS.overdue
        }
    ];

    useEffect(() => {
        if (!ref.current) return;

        chartRef.current = echarts.init(ref.current);

        const handleResize = () => {
            if (chartRef.current) chartRef.current.resize();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);

            if (chartRef.current) {
                chartRef.current.dispose();
                chartRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;

        const theme = getChartTheme();

        const data = legendItems
            .filter((item) => item.value > 0)
            .map((item) => ({
                value: item.value,
                name: item.label,
                itemStyle: { color: item.color }
            }));

        chartRef.current.setOption(
            {
                animationDuration: 350,
                animationEasing: "cubicOut",
                tooltip: {
                    trigger: "item",
                    backgroundColor: theme.tooltipBg,
                    borderWidth: 0,
                    padding: [8, 10],
                    textStyle: {
                        color: "#fff",
                        fontSize: 12
                    },
                    formatter: ({ name, value }) => `${name}: ${value}`
                },
                series: [
                    {
                        type: "pie",
                        radius: ["57%", "82%"],
                        center: ["50%", "50%"],
                        startAngle: 90,
                        clockwise: true,
                        padAngle: 2,
                        minAngle: 4,
                        avoidLabelOverlap: true,
                        label: { show: false },
                        labelLine: { show: false },
                        emphasis: { scale: false },
                        itemStyle: {
                            borderColor: theme.panel,
                            borderWidth: 5,
                            borderRadius: 9
                        },
                        data:
                            data.length > 0
                                ? data
                                : [
                                      {
                                          value: 1,
                                          name: "No data",
                                          itemStyle: {
                                              color: theme.dark ? "#334155" : "#e5e7eb"
                                          }
                                      }
                                  ]
                    }
                ]
            },
            true
        );
    }, [completed, ongoing, overdue, themeVersion]);

    return (
        <div className="dash-ring-block">
            <div className="dash-ring-shell">
                <div className="dash-ring">
                    <div ref={ref} className="dash-ring-canvas"></div>

                    <div className="dash-ring-center">
                        <div className="dash-ring-kicker">Completion</div>
                        <div className="dash-ring-value">{safeNumber(rate)}%</div>
                        <div className="dash-ring-sub">all tasks</div>
                    </div>
                </div>
            </div>

            <div className="dash-ring-legend">
                {legendItems.map((item) => (
                    <div className="dash-ring-legend-item" key={item.label}>
                        <span
                            className="dash-ring-legend-dot"
                            style={{ color: item.color }}
                        ></span>

                        <div className="dash-ring-legend-copy">
                            <div className="dash-ring-legend-title">{item.label}</div>
                            <div className="dash-ring-legend-meta">
                                Tasks <strong>{item.value}</strong> · {item.percent}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RolePie({ roles }) {
    const ref = useRef(null);
    const chartRef = useRef(null);
    const themeVersion = useThemeVersion();

    const safeRoles = Array.isArray(roles) ? roles : [];

    const colors = [
        ADMIN_COLORS.orange,
        ADMIN_COLORS.blue,
        ADMIN_COLORS.completed,
        ADMIN_COLORS.purple,
        ADMIN_COLORS.teal
    ];

    const legendItems = safeRoles.map((role, index) => ({
        label: titleCase(role.role),
        value: safeNumber(role.count),
        color: colors[index % colors.length]
    }));

    useEffect(() => {
        if (!ref.current) return;

        chartRef.current = echarts.init(ref.current);

        const handleResize = () => {
            if (chartRef.current) chartRef.current.resize();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);

            if (chartRef.current) {
                chartRef.current.dispose();
                chartRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;

        const theme = getChartTheme();

        if (!safeRoles.length) {
            chartRef.current.clear();
            return;
        }

        chartRef.current.setOption(
            {
                animationDuration: 450,
                animationEasing: "cubicOut",
                color: colors,
                tooltip: {
                    trigger: "item",
                    backgroundColor: theme.tooltipBg,
                    borderWidth: 0,
                    padding: [8, 10],
                    textStyle: {
                        color: "#fff",
                        fontSize: 12
                    },
                    formatter: ({ name, value, percent }) =>
                        `${name}: ${value} (${percent}%)`
                },
                legend: {
                    show: false
                },
                series: [
                    {
                        type: "pie",
                        radius: ["52%", "80%"],
                        center: ["50%", "50%"],
                        avoidLabelOverlap: true,
                        label: { show: false },
                        labelLine: { show: false },
                        emphasis: { scale: false },
                        itemStyle: {
                            borderColor: theme.panel,
                            borderWidth: 5,
                            borderRadius: 8
                        },
                        data: safeRoles.map((role) => ({
                            name: titleCase(role.role),
                            value: safeNumber(role.count)
                        }))
                    }
                ]
            },
            true
        );
    }, [roles, themeVersion]);

    if (!safeRoles.length) {
        return <div className="dash-empty-box">No role data available.</div>;
    }

    return (
        <div className="dash-role-balance-block">
            <div className="dash-role-chart-shell">
                <div className="dash-role-chart-ring">
                    <div ref={ref} className="dash-admin-role-chart"></div>
                </div>
            </div>

            <div className="dash-ring-legend">
                {legendItems.map((item) => (
                    <div className="dash-ring-legend-item" key={item.label}>
                        <span
                            className="dash-ring-legend-dot"
                            style={{ color: item.color }}
                        ></span>

                        <div className="dash-ring-legend-copy">
                            <div className="dash-ring-legend-title">{item.label}</div>
                            <div className="dash-ring-legend-meta">
                                Users <strong>{item.value}</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
function DepartmentSummary({ rows }) {
    const departments = Array.isArray(rows) ? rows : [];

    return (
        <div className="dash-table-wrap">
            <table className="dash-table">
                <thead>
                    <tr>
                        <th>Department</th>
                        <th>Staff</th>
                        <th>Total Tasks</th>
                        <th>Completed</th>
                        <th>Overdue</th>
                        <th>Completion Rate</th>
                    </tr>
                </thead>

                <tbody>
                    {!departments.length ? (
                        <tr>
                            <td colSpan="6">
                                <div className="dash-empty-box">No departments found.</div>
                            </td>
                        </tr>
                    ) : (
                        departments.map((dept) => {
                            const rate = clamp(safeNumber(dept.completion_rate), 0, 100);

                            return (
                                <tr key={dept.id || dept.department}>
                                    <td>
                                        <strong>{dept.department || "Unassigned"}</strong>
                                    </td>
                                    <td>{safeNumber(dept.staff_count)}</td>
                                    <td>{safeNumber(dept.total_tasks)}</td>
                                    <td>{safeNumber(dept.completed)}</td>
                                    <td className={safeNumber(dept.overdue) > 0 ? "dash-danger-text" : ""}>
                                        {safeNumber(dept.overdue)}
                                    </td>
                                    <td>
                                        {safeNumber(dept.total_tasks) === 0 ? (
                                            <span className="dash-muted-text">No tasks yet</span>
                                        ) : (
                                            <div className="dash-rate-cell">
                                                <span>{rate}%</span>
                                                <div className="dash-mini-progress">
                                                    <div
                                                        className="dash-mini-progress-fill"
                                                        style={{ width: `${rate}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}

function RecentUsers({ rows }) {
    const users = Array.isArray(rows) ? rows : [];

    return (
        <div className="dash-table-wrap">
            <table className="dash-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Registered</th>
                    </tr>
                </thead>

                <tbody>
                    {!users.length ? (
                        <tr>
                            <td colSpan="6">
                                <div className="dash-empty-box">No users found.</div>
                            </td>
                        </tr>
                    ) : (
                        users.map((user) => (
                            <tr key={user.id || user.email}>
                                <td>
                                    <strong>{user.name || "Unnamed User"}</strong>
                                </td>
                                <td className="dash-muted-text">{user.email || "No email"}</td>
                                <td>{roleBadge(user.role)}</td>
                                <td>{user.department || "Unassigned"}</td>
                                <td>
                                    <StatusDot active={Boolean(user.is_active)} />
                                </td>
                                <td className="dash-muted-text">{timeAgo(user.created_at)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        fetch("php/get_admin_dashboard.php", { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || `HTTP ${response.status}`);
                }

                return response.json();
            })
            .then((payload) => {
                if (payload?.error) throw new Error(payload.error);
                setData(payload);
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setError(err.message || "Unable to load admin dashboard data.");
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, []);

    if (loading) {
        return (
            <div className="dash-page dash-loading">
                <div className="text-center text-muted">
                    <div className="spinner-border mb-3" role="status"></div>
                    <div>Loading dashboard...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dash-page">
                <div className="alert alert-danger mb-0">Error: {error}</div>
            </div>
        );
    }

    const overview = data?.overview ?? {};
    const taskSnapshot = data?.task_snapshot ?? {};
    const recentUsers = Array.isArray(data?.recent_users) ? data.recent_users : [];
    const departments = Array.isArray(data?.departments) ? data.departments : [];
    const roles = Array.isArray(data?.roles) ? data.roles : [];

    const todayLabel = new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    const stats = [
        {
            label: "Active Users",
            value: overview.total_active_users,
            icon: "bi-person-check",
            tone: "blue"
        },
        {
            label: "Inactive Users",
            value: overview.total_inactive_users,
            icon: "bi-person-x",
            tone: "red"
        },
        {
            label: "Staff",
            value: overview.total_staff,
            icon: "bi-people",
            tone: "green"
        },
        {
            label: "Supervisors",
            value: overview.total_supervisors,
            icon: "bi-person-badge",
            tone: "purple"
        },
        {
            label: "Departments",
            value: overview.total_departments,
            icon: "bi-diagram-3",
            tone: "teal"
        },
        {
            label: "Total Tasks",
            value: overview.total_tasks,
            icon: "bi-list-task",
            tone: "orange"
        }
    ];

    return (
        <div className="dash-page">
            <div className="dash-shell">
                <section className="dash-admin-stat-grid">
                    {stats.map((stat) => (
                        <AdminStatCard
                            key={stat.label}
                            label={stat.label}
                            value={stat.value}
                            icon={stat.icon}
                            tone={stat.tone}
                        />
                    ))}
                </section>

                <div className="dash-admin-grid">
                    <section className="dash-card dash-admin-chart-card">
                        <div className="dash-section-head">
                            <div>
                                <div className="dash-card-title">Task Status</div>
                                <div className="dash-card-subtitle">
                                    All-time task completion, ongoing, and overdue distribution.
                                </div>
                            </div>
                            <div className="dash-pill">All Time</div>
                        </div>

                        <div className="dash-admin-chart-body">
                            <AdminTaskRing
                                completed={taskSnapshot.completed}
                                ongoing={taskSnapshot.ongoing}
                                overdue={taskSnapshot.overdue}
                                rate={taskSnapshot.overall_rate}
                            />
                        </div>
                    </section>

                    <section className="dash-card dash-admin-chart-card">
                        <div className="dash-section-head">
                            <div>
                                <div className="dash-card-title">User Roles</div>
                                <div className="dash-card-subtitle">
                                    Active account distribution by role.
                                </div>
                            </div>
                            <div className="dash-pill">Active Only</div>
                        </div>

                        <div className="dash-admin-chart-body">
                            <RolePie roles={roles} />
                        </div>
                    </section>
                </div>

                <section className="dash-card dash-admin-table-card">
                    <div className="dash-section-head">
                        <div>
                            <div className="dash-card-title">Department Summary</div>
                            <div className="dash-card-subtitle">
                                Compare task completion and overdue work by department.
                            </div>
                        </div>

                        <a href="departments.html" className="dash-action-link">
                            Manage Departments
                        </a>
                    </div>

                    <DepartmentSummary rows={departments} />
                </section>

                <section className="dash-card dash-admin-table-card">
                    <div className="dash-section-head">
                        <div>
                            <div className="dash-card-title">Recently Registered Users</div>
                            <div className="dash-card-subtitle">
                                Latest accounts created in the system.
                            </div>
                        </div>

                        <a href="users.html" className="dash-action-link">
                            View All Users
                        </a>
                    </div>

                    <RecentUsers rows={recentUsers} />
                </section>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminDashboard />);