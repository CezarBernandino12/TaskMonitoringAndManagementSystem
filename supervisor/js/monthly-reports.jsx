const { useEffect, useMemo, useRef, useState } = React;

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getThemeMode() {
    return document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
}

function buildAvatarFallbackUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
    )}&background=f7c4d4&color=222&size=80`;
}

function formatMonthDisplay(year, month) {
    return `${MONTH_NAMES[month - 1]} ${year}`;
}

function statusTone(status) {
    return (
        {
            Completed: "completed",
            Ongoing: "ongoing",
            Overdue: "overdue"
        }[status] || "other"
    );
}

function priorityTone(priority) {
    return (
        {
            High: "high",
            Medium: "medium",
            Low: "low"
        }[priority] || "other"
    );
}

function renderCleanProgress(rate, total) {
    if (total === 0) {
        return <span className="mr-empty-inline">No tasks yet</span>;
    }

    if (rate === 0) {
        return <span className="mr-rate-danger">0% — None completed</span>;
    }

    return (
        <div className="mr-progress-clean">
            <div className="mr-progress-clean-track">
                <div
                    className="mr-progress-clean-fill"
                    style={{ width: `${rate}%` }}
                ></div>
            </div>
            <span className="mr-progress-clean-value">{rate}%</span>
        </div>
    );
}

function SummaryCard({ icon, title, value, tone, sub }) {
    return (
        <div className="mr-summary-card">
            <div className="mr-summary-top">
                <div className={`mr-summary-icon ${tone}`}>
                    <i className={`bi ${icon}`}></i>
                </div>
                <span className={`mr-summary-chip ${tone}`}>{sub}</span>
            </div>

            <div className="mr-summary-title">{title}</div>
            <div className={`mr-summary-value ${tone}`}>{value}</div>
        </div>
    );
}

function EmployeeTaskModal({ emp, monthStart, monthEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [query, setQuery] = useState("");

    useEffect(() => {
        setLoading(true);
        setError("");
        setTasks([]);
        setActiveTab("all");
        setQuery("");

        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}&week_start=${monthStart}&week_end=${monthEnd}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setTasks(Array.isArray(data.tasks) ? data.tasks : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Could not load tasks: ${err.message}`);
                setLoading(false);
            });
    }, [emp.id, monthStart, monthEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const annotated = useMemo(
        () =>
            tasks.map((t) => ({
                ...t,
                derivedStatus: t.derived_status ?? t.status
            })),
        [tasks]
    );

    const counts = useMemo(
        () => ({
            all: annotated.length,
            Completed: annotated.filter((t) => t.derivedStatus === "Completed").length,
            Ongoing: annotated.filter((t) => t.derivedStatus === "Ongoing").length,
            Overdue: annotated.filter((t) => t.derivedStatus === "Overdue").length
        }),
        [annotated]
    );

    const filtered = useMemo(() => {
        let base =
            activeTab === "all"
                ? annotated
                : annotated.filter((t) => t.derivedStatus === activeTab);

        const term = query.trim().toLowerCase();
        if (!term) return base;

        return base.filter((task) => {
            const title = String(task.title || "").toLowerCase();
            const desc = String(task.description || "").toLowerCase();
            const status = String(task.derivedStatus || "").toLowerCase();
            const priority = String(task.priority || "").toLowerCase();
            return (
                title.includes(term) ||
                desc.includes(term) ||
                status.includes(term) ||
                priority.includes(term)
            );
        });
    }, [annotated, activeTab, query]);

    const monthLabel = new Date(`${monthStart}T00:00:00`).toLocaleDateString("en-PH", {
        month: "long",
        year: "numeric"
    });

    return (
        <div className="mr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="mr-modal-card">
                <div className="mr-modal-head">
                    <div className="mr-modal-person">
                        <img
                            src={buildAvatarFallbackUrl(emp.name)}
                            alt={`${emp.name} Profile`}
                            className="mr-modal-avatar"
                        />
                        <div>
                            <h5 className="mr-modal-title">{emp.name}</h5>
                            <div className="mr-modal-subtitle">
                                {emp.department} · {monthLabel}
                            </div>
                        </div>
                    </div>

                    <button className="mr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="mr-modal-toolbar">
                    <div className="mr-pill-row">
                        {[
                            { key: "all", label: "All", count: counts.all, tone: "neutral" },
                            { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                            { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                            { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`mr-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                                <span className="mr-pill-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mr-search-box">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mr-modal-body">
                    {loading ? (
                        <div className="mr-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="mr-empty-state">No matching tasks found for this month.</div>
                    ) : (
                        <div className="mr-task-list">
                            {filtered.map((task, idx) => {
                                const status = task.derivedStatus || "Other";
                                const priority = task.priority || "Other";
                                const days = task.days_until_deadline;

                                let deadlineText = task.deadline
                                    ? new Date(task.deadline).toLocaleDateString("en-PH", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric"
                                      })
                                    : "No deadline";

                                if (status === "Overdue" && days !== null && days !== undefined) {
                                    deadlineText += ` · ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
                                } else if (status === "Ongoing" && days !== null && days !== undefined) {
                                    deadlineText += days === 0
                                        ? " · Due today"
                                        : ` · ${days} day${days !== 1 ? "s" : ""} left`;
                                } else if (status === "Completed" && task.completed_at) {
                                    deadlineText += ` · Done ${new Date(task.completed_at).toLocaleDateString("en-PH", {
                                        month: "short",
                                        day: "numeric"
                                    })}`;
                                }

                                return (
                                    <div className="mr-task-item" key={task.id ?? idx}>
                                        <div className="mr-task-main">
                                            <div className="mr-task-title">{task.title}</div>
                                            {task.description && (
                                                <div className="mr-task-desc">{task.description}</div>
                                            )}
                                            <div className="mr-task-meta">{deadlineText}</div>
                                        </div>

                                        <div className="mr-task-side">
                                            <span className={`mr-status-inline ${statusTone(status)}`}>{status}</span>
                                            <span className={`mr-priority-inline ${priorityTone(priority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                <span>{priority}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mr-modal-foot">
                    <button className="mr-ghost-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function DepartmentTaskModal({ dept, monthStart, monthEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [query, setQuery] = useState("");

    useEffect(() => {
        setLoading(true);
        setError("");
        setTasks([]);
        setActiveTab("all");
        setQuery("");

        fetch(`php/get_department_tasks_report.php?department_id=${dept.department_id}&week_start=${monthStart}&week_end=${monthEnd}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setTasks(Array.isArray(data.tasks) ? data.tasks : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Could not load tasks: ${err.message}`);
                setLoading(false);
            });
    }, [dept.department_id, monthStart, monthEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const annotated = useMemo(
        () =>
            tasks.map((t) => ({
                ...t,
                derivedStatus: t.derived_status ?? t.status
            })),
        [tasks]
    );

    const counts = useMemo(
        () => ({
            all: annotated.length,
            Completed: annotated.filter((t) => t.derivedStatus === "Completed").length,
            Ongoing: annotated.filter((t) => t.derivedStatus === "Ongoing").length,
            Overdue: annotated.filter((t) => t.derivedStatus === "Overdue").length
        }),
        [annotated]
    );

    const filtered = useMemo(() => {
        let base =
            activeTab === "all"
                ? annotated
                : annotated.filter((t) => t.derivedStatus === activeTab);

        const term = query.trim().toLowerCase();
        if (!term) return base;

        return base.filter((task) => {
            const title = String(task.title || "").toLowerCase();
            const desc = String(task.description || "").toLowerCase();
            const assigned = String(task.assigned_to_name || "").toLowerCase();
            const status = String(task.derivedStatus || "").toLowerCase();
            return (
                title.includes(term) ||
                desc.includes(term) ||
                assigned.includes(term) ||
                status.includes(term)
            );
        });
    }, [annotated, activeTab, query]);

    const monthLabel = new Date(`${monthStart}T00:00:00`).toLocaleDateString("en-PH", {
        month: "long",
        year: "numeric"
    });

    return (
        <div className="mr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="mr-modal-card mr-modal-card--wide">
                <div className="mr-modal-head">
                    <div className="mr-modal-person">
                        <div className="mr-modal-avatar mr-modal-avatar--dept">
                            <i className="bi bi-buildings"></i>
                        </div>
                        <div>
                            <h5 className="mr-modal-title">{dept.department}</h5>
                            <div className="mr-modal-subtitle">Department tasks · {monthLabel}</div>
                        </div>
                    </div>

                    <button className="mr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="mr-modal-toolbar">
                    <div className="mr-pill-row">
                        {[
                            { key: "all", label: "All", count: counts.all, tone: "neutral" },
                            { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                            { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                            { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`mr-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                                <span className="mr-pill-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mr-search-box">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mr-modal-body">
                    {loading ? (
                        <div className="mr-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="mr-empty-state">No matching department tasks found for this month.</div>
                    ) : (
                        <div className="mr-task-list">
                            {filtered.map((task, idx) => {
                                const status = task.derivedStatus || "Other";
                                const priority = task.priority || "Other";
                                const days = task.days_until_deadline;

                                let deadlineText = task.deadline
                                    ? new Date(task.deadline).toLocaleDateString("en-PH", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric"
                                      })
                                    : "No deadline";

                                if (status === "Overdue" && days !== null && days !== undefined) {
                                    deadlineText += ` · ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
                                } else if (status === "Ongoing" && days !== null && days !== undefined) {
                                    deadlineText += days === 0
                                        ? " · Due today"
                                        : ` · ${days} day${days !== 1 ? "s" : ""} left`;
                                } else if (status === "Completed" && task.completed_at) {
                                    deadlineText += ` · Done ${new Date(task.completed_at).toLocaleDateString("en-PH", {
                                        month: "short",
                                        day: "numeric"
                                    })}`;
                                }

                                return (
                                    <div className="mr-task-item" key={task.id ?? idx}>
                                        <div className="mr-task-main">
                                            <div className="mr-task-title">{task.title}</div>
                                            {task.description && (
                                                <div className="mr-task-desc">{task.description}</div>
                                            )}
                                            <div className="mr-task-meta">
                                                {task.assigned_to_name ? `Assigned to ${task.assigned_to_name} · ` : ""}
                                                {deadlineText}
                                            </div>
                                        </div>

                                        <div className="mr-task-side">
                                            <span className={`mr-status-inline ${statusTone(status)}`}>{status}</span>
                                            <span className={`mr-priority-inline ${priorityTone(priority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                <span>{priority}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mr-modal-foot">
                    <button className="mr-ghost-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function MonthlyReportPage() {
    const now = new Date();

    const [summary, setSummary] = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [departments, setDepartments] = useState([]);
    const [dailyTrend, setDailyTrend] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [deptName, setDeptName] = useState("");
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [modalEmp, setModalEmp] = useState(null);
    const [modalDept, setModalDept] = useState(null);
    const [authError, setAuthError] = useState(null);
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const groupedBarRef = useRef(null);
    const lineRef = useRef(null);
    const hBarRef = useRef(null);

    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            setThemeMode(getThemeMode());
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ["data-theme"]
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        setModalEmp(null);
        setModalDept(null);

        fetch(`php/get_monthly_report_supervisor.php?year=${year}&month=${month}`)
            .then((res) => {
                if (res.status === 401 || res.status === 403) {
                    return res.json().then((d) => {
                        throw new Error(d.error ?? "Access denied");
                    });
                }
                return res.json();
            })
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setDepartments(data.departments ?? []);
                setDailyTrend(data.daily_trend ?? []);
                setEmployees(data.employees ?? []);
                setDeptName(data.supervisor_department_name ?? "");
                setAuthError(null);
            })
            .catch((err) => {
                console.error(err);
                setAuthError(err.message);
            });
    }, [year, month]);

    const deptLabels = useMemo(() => departments.map((d) => d.department), [departments]);
    const deptCompleted = useMemo(() => departments.map((d) => d.completed), [departments]);
    const deptOngoing = useMemo(() => departments.map((d) => d.ongoing), [departments]);
    const deptOverdue = useMemo(() => departments.map((d) => d.overdue), [departments]);

    const dayLabels = useMemo(
        () => dailyTrend.map((d) => new Date(`${d.date}T00:00:00`).getDate()),
        [dailyTrend]
    );
    const lineCompleted = useMemo(() => dailyTrend.map((d) => d.completed), [dailyTrend]);
    const lineOngoing = useMemo(() => dailyTrend.map((d) => d.ongoing), [dailyTrend]);
    const lineOverdue = useMemo(() => dailyTrend.map((d) => d.overdue), [dailyTrend]);

    const empSorted = useMemo(
        () => [...employees].sort((a, b) => b.completion_rate - a.completion_rate),
        [employees]
    );
    const empNames = useMemo(() => empSorted.map((e) => e.name), [empSorted]);
    const empCompleted = useMemo(() => empSorted.map((e) => e.completed), [empSorted]);
    const empOverdue = useMemo(() => empSorted.map((e) => e.overdue), [empSorted]);

    useEffect(() => {
        if (!window.echarts || !groupedBarRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(groupedBarRef.current) ||
            window.echarts.init(groupedBarRef.current);

        const isDark = themeMode === "dark";
        const axisColor = isDark ? "#9aa5b8" : "#7b8794";
        const splitLine = isDark ? "rgba(255,255,255,0.08)" : "#edf1f7";
        const tooltipBg = isDark ? "#182133" : "#ffffff";
        const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5ebf4";
        const tooltipText = isDark ? "#f8fafc" : "#18263f";

        chart.setOption(
            {
                animationDuration: 650,
                animationEasing: "cubicOut",
                color: ["#16a34a", "#f59e0b", "#ec4899"],
                grid: {
                    top: 26,
                    left: 20,
                    right: 18,
                    bottom: 32,
                    containLabel: true
                },
                tooltip: {
                    trigger: "axis",
                    axisPointer: { type: "shadow" },
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    textStyle: {
                        color: tooltipText,
                        fontFamily: "Nunito, sans-serif"
                    },
                    extraCssText:
                        "box-shadow:0 18px 40px rgba(15,23,42,0.12); border-radius:16px;",
                    formatter: (params) => {
                        if (!params.length) return "";
                        const idx = params[0].dataIndex;
                        const dept = departments[idx];
                        const lines = params.map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
                        if (dept) {
                            lines.push(`Completion rate: ${dept.completion_rate}%`);
                        }
                        return [`<strong>${params[0].axisValue}</strong>`, ...lines].join("<br/>");
                    }
                },
                legend: {
                    top: 0,
                    icon: "roundRect",
                    itemWidth: 12,
                    itemHeight: 12,
                    textStyle: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800
                    },
                    data: ["Completed", "Ongoing", "Overdue"]
                },
                xAxis: {
                    type: "category",
                    data: deptLabels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800
                    }
                },
                yAxis: {
                    type: "value",
                    min: 0,
                    minInterval: 1,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 700
                    },
                    splitLine: {
                        lineStyle: { color: splitLine }
                    }
                },
                series: [
                    {
                        name: "Completed",
                        type: "bar",
                        barMaxWidth: 28,
                        itemStyle: { borderRadius: [8, 8, 0, 0] },
                        data: deptCompleted
                    },
                    {
                        name: "Ongoing",
                        type: "bar",
                        barMaxWidth: 28,
                        itemStyle: { borderRadius: [8, 8, 0, 0] },
                        data: deptOngoing
                    },
                    {
                        name: "Overdue",
                        type: "bar",
                        barMaxWidth: 28,
                        itemStyle: { borderRadius: [8, 8, 0, 0] },
                        data: deptOverdue
                    }
                ]
            },
            true
        );

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [deptLabels, deptCompleted, deptOngoing, deptOverdue, departments, themeMode]);

    useEffect(() => {
        if (!window.echarts || !lineRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(lineRef.current) ||
            window.echarts.init(lineRef.current);

        const isDark = themeMode === "dark";
        const axisColor = isDark ? "#9aa5b8" : "#7b8794";
        const splitLine = isDark ? "rgba(255,255,255,0.08)" : "#edf1f7";
        const tooltipBg = isDark ? "#182133" : "#ffffff";
        const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5ebf4";
        const tooltipText = isDark ? "#f8fafc" : "#18263f";

        chart.setOption(
            {
                animationDuration: 650,
                animationEasing: "cubicOut",
                color: ["#16a34a", "#f59e0b", "#ec4899"],
                grid: {
                    top: 26,
                    left: 20,
                    right: 18,
                    bottom: 48,
                    containLabel: true
                },
                tooltip: {
                    trigger: "axis",
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    textStyle: {
                        color: tooltipText,
                        fontFamily: "Nunito, sans-serif"
                    },
                    extraCssText:
                        "box-shadow:0 18px 40px rgba(15,23,42,0.12); border-radius:16px;"
                },
                legend: {
                    bottom: 0,
                    icon: "circle",
                    itemWidth: 10,
                    itemHeight: 10,
                    textStyle: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800
                    },
                    data: ["Completed", "Ongoing", "Overdue"]
                },
                xAxis: {
                    type: "category",
                    boundaryGap: false,
                    data: dayLabels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800,
                        margin: 12
                    },
                    name: `Day of ${MONTH_NAMES[month - 1]}`,
                    nameTextStyle: {
                        color: axisColor,
                        fontWeight: 800,
                        fontFamily: "Nunito, sans-serif"
                    }
                },
                yAxis: {
                    type: "value",
                    min: 0,
                    minInterval: 1,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 700
                    },
                    splitLine: {
                        lineStyle: { color: splitLine }
                    }
                },
                series: [
                    {
                        name: "Completed",
                        type: "line",
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 6,
                        lineStyle: { width: 2 },
                        itemStyle: { borderWidth: 2, borderColor: isDark ? "#141b2d" : "#ffffff" },
                        areaStyle: {
                            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: "rgba(22,163,74,0.18)" },
                                { offset: 1, color: "rgba(22,163,74,0.02)" }
                            ])
                        },
                        data: lineCompleted
                    },
                    {
                        name: "Ongoing",
                        type: "line",
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 5,
                        lineStyle: { width: 1.8 },
                        itemStyle: { borderWidth: 2, borderColor: isDark ? "#141b2d" : "#ffffff" },
                        areaStyle: {
                            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: "rgba(245,158,11,0.12)" },
                                { offset: 1, color: "rgba(245,158,11,0.01)" }
                            ])
                        },
                        data: lineOngoing
                    },
                    {
                        name: "Overdue",
                        type: "line",
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 5,
                        lineStyle: { width: 1.8 },
                        itemStyle: { borderWidth: 2, borderColor: isDark ? "#141b2d" : "#ffffff" },
                        areaStyle: {
                            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: "rgba(236,72,153,0.12)" },
                                { offset: 1, color: "rgba(236,72,153,0.01)" }
                            ])
                        },
                        data: lineOverdue
                    }
                ]
            },
            true
        );

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [dayLabels, lineCompleted, lineOngoing, lineOverdue, month, themeMode]);

    useEffect(() => {
        if (!window.echarts || !hBarRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(hBarRef.current) ||
            window.echarts.init(hBarRef.current);

        const isDark = themeMode === "dark";
        const axisColor = isDark ? "#9aa5b8" : "#7b8794";
        const splitLine = isDark ? "rgba(255,255,255,0.08)" : "#edf1f7";
        const tooltipBg = isDark ? "#182133" : "#ffffff";
        const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5ebf4";
        const tooltipText = isDark ? "#f8fafc" : "#18263f";

        chart.setOption(
            {
                animationDuration: 650,
                animationEasing: "cubicOut",
                color: ["#16a34a", "#ec4899"],
                grid: {
                    top: 26,
                    left: 92,
                    right: 20,
                    bottom: 26,
                    containLabel: true
                },
                tooltip: {
                    trigger: "axis",
                    axisPointer: { type: "shadow" },
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    textStyle: {
                        color: tooltipText,
                        fontFamily: "Nunito, sans-serif"
                    },
                    extraCssText:
                        "box-shadow:0 18px 40px rgba(15,23,42,0.12); border-radius:16px;",
                    formatter: (params) => {
                        if (!params.length) return "";
                        const idx = params[0].dataIndex;
                        const emp = empSorted[idx];
                        const lines = params.map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
                        if (emp) {
                            lines.push(`Completion rate: ${emp.completion_rate}%`);
                        }
                        return [`<strong>${params[0].axisValue}</strong>`, ...lines].join("<br/>");
                    }
                },
                legend: {
                    top: 0,
                    icon: "roundRect",
                    itemWidth: 12,
                    itemHeight: 12,
                    textStyle: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800
                    },
                    data: ["Completed", "Overdue"]
                },
                xAxis: {
                    type: "value",
                    min: 0,
                    minInterval: 1,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 700
                    },
                    splitLine: {
                        lineStyle: { color: splitLine }
                    }
                },
                yAxis: {
                    type: "category",
                    data: empNames,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800
                    }
                },
                series: [
                    {
                        name: "Completed",
                        type: "bar",
                        barMaxWidth: 18,
                        itemStyle: { borderRadius: [0, 8, 8, 0] },
                        data: empCompleted
                    },
                    {
                        name: "Overdue",
                        type: "bar",
                        barMaxWidth: 18,
                        itemStyle: { borderRadius: [0, 8, 8, 0] },
                        data: empOverdue
                    }
                ]
            },
            true
        );

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [empNames, empCompleted, empOverdue, empSorted, themeMode]);

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    const goToPrevMonth = () => {
        if (month === 1) {
            setYear((y) => y - 1);
            setMonth(12);
        } else {
            setMonth((m) => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (month === 12) {
            setYear((y) => y + 1);
            setMonth(1);
        } else {
            setMonth((m) => m + 1);
        }
    };

    const goToCurrentMonth = () => {
        setYear(now.getFullYear());
        setMonth(now.getMonth() + 1);
    };

    if (authError) {
        return (
            <div className="mr-page">
                <div className="mr-error-card">
                    <h5>Access Denied</h5>
                    <p>{authError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mr-page">
            <div className="mr-page-head">
                <div>
                    <h2 className="mr-page-title">Monthly Task Report</h2>
                    <div className="mr-page-meta">
                        {deptName && <span className="mr-filter-pill">{deptName}</span>}
                        <span className="mr-page-sub">{formatMonthDisplay(year, month)}</span>
                    </div>
                </div>

                <div className="mr-month-nav">
                    <button className="mr-ghost-btn" onClick={goToPrevMonth}>
                        <i className="bi bi-chevron-left"></i>
                        Prev
                    </button>

                    <div className="mr-month-range">{formatMonthDisplay(year, month)}</div>

                    <button
                        className="mr-ghost-btn"
                        onClick={goToNextMonth}
                        disabled={isCurrentMonth}
                    >
                        Next
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {!isCurrentMonth && (
                        <button className="mr-ghost-btn mr-ghost-btn--primary" onClick={goToCurrentMonth}>
                            This Month
                        </button>
                    )}
                </div>
            </div>

            <div className="mr-summary-grid">
                <SummaryCard
                    icon="bi-list-task"
                    title="Total Tasks"
                    value={summary.total}
                    tone="primary"
                    sub="Monthly scope"
                />
                <SummaryCard
                    icon="bi-check2-circle"
                    title="Completed"
                    value={summary.completed}
                    tone="success"
                    sub="Finished"
                />
                <SummaryCard
                    icon="bi-arrow-repeat"
                    title="Ongoing"
                    value={summary.ongoing}
                    tone="warning"
                    sub="Still active"
                />
                <SummaryCard
                    icon="bi-exclamation-circle"
                    title="Overdue"
                    value={summary.overdue}
                    tone="danger"
                    sub="Past deadline"
                />
            </div>

            <div className="mr-card mr-card--trend">
                <div className="mr-card-head">
                    <div>
                        <h5 className="mr-card-title">Daily Task Activity</h5>
                        <div className="mr-card-subtitle">{formatMonthDisplay(year, month)}</div>
                    </div>
                </div>
                <div ref={lineRef} className="mr-line-chart"></div>
            </div>

            <div className="mr-two-grid">
                <div className="mr-card mr-card--dept">
                    <div className="mr-card-head">
                        <div>
                            <h5 className="mr-card-title">Department Task Overview</h5>
                            <div className="mr-card-subtitle">Completed, Ongoing, and Overdue</div>
                        </div>
                    </div>
                    <div ref={groupedBarRef} className="mr-bar-chart"></div>
                </div>

                <div className="mr-card mr-card--employee-chart">
                    <div className="mr-card-head">
                        <div>
                            <h5 className="mr-card-title">Employee Performance</h5>
                            <div className="mr-card-subtitle">
                                Sorted by most tasks completed
                            </div>
                        </div>
                    </div>
                    <div
                        ref={hBarRef}
                        className="mr-hbar-chart"
                        style={{ height: `${Math.max(260, empSorted.length * 42)}px` }}
                    ></div>
                </div>
            </div>

            <div className="mr-card mr-card--table">
                <div className="mr-card-head">
                    <div>
                        <h5 className="mr-card-title">Employee Details</h5>
                        <div className="mr-card-subtitle">Employee-level monthly activity</div>
                    </div>
                </div>

                <div className="mr-table-shell">
                    <table className="mr-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th style={{ width: "110px" }}>Completed</th>
                                <th style={{ width: "100px" }}>Ongoing</th>
                                <th style={{ width: "100px" }}>Overdue</th>
                                <th style={{ width: "180px" }}>Completion Rate</th>
                                <th style={{ width: "72px", textAlign: "center" }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp) => {
                                const rate = emp.completion_rate;
                                const total = emp.total;

                                return (
                                    <tr key={emp.id}>
                                        <td>
                                            <div className="mr-assignee">
                                                <img
                                                    src={buildAvatarFallbackUrl(emp.name)}
                                                    alt={`${emp.name} Profile`}
                                                    className="mr-assignee-avatar"
                                                />
                                                <div className="mr-assignee-copy">
                                                    <span className="mr-assignee-name">{emp.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{emp.department}</td>
                                        <td>{emp.completed}</td>
                                        <td>{emp.ongoing}</td>
                                        <td className="mr-overdue-cell">{emp.overdue}</td>
                                        <td>{renderCleanProgress(rate, total)}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <button
                                                className="mr-eye-btn"
                                                title={`View ${emp.name}'s tasks this month`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalEmp(emp);
                                                }}
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

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

const root = ReactDOM.createRoot(document.getElementById("monthlyReportRoot"));
root.render(<MonthlyReportPage />);