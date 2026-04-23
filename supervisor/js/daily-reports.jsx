const { useEffect, useMemo, useRef, useState } = React;

const MANILA_TZ = "Asia/Manila";

function getThemeMode() {
    return document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
}

function safeNum(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function pct(part, total) {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

function buildAvatarFallbackUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
    )}&background=f7c4d4&color=222&size=80`;
}

function formatDatePH(dateStr, withYear = true) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-PH", {
        timeZone: MANILA_TZ,
        month: "short",
        day: "numeric",
        ...(withYear ? { year: "numeric" } : {})
    }).format(date);
}

function getDerivedStatus(task) {
    return task?.derived_status ?? task?.status ?? "Other";
}

function getStatusClass(status) {
    const s = String(status || "").trim().toLowerCase();
    if (s === "completed") return "completed";
    if (s === "ongoing" || s === "in progress") return "ongoing";
    if (s === "overdue") return "overdue";
    return "other";
}

function getPriorityClass(priority) {
    const p = String(priority || "").trim().toLowerCase();
    if (["high", "urgent", "critical"].includes(p)) return "high";
    if (["medium", "normal", "moderate"].includes(p)) return "medium";
    if (["low", "minor"].includes(p)) return "low";
    return "other";
}

function EmployeeTaskModal({ emp, onClose, themeMode }) {
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

        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}`)
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
    }, [emp.id]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const annotatedTasks = useMemo(
        () =>
            tasks.map((task) => ({
                ...task,
                derivedStatus: getDerivedStatus(task)
            })),
        [tasks]
    );

    const filteredTasks = useMemo(() => {
        let base =
            activeTab === "all"
                ? annotatedTasks
                : annotatedTasks.filter((task) => task.derivedStatus === activeTab);

        const term = query.trim().toLowerCase();
        if (!term) return base;

        return base.filter((task) => {
            const title = String(task?.title || "").toLowerCase();
            const description = String(task?.description || "").toLowerCase();
            const priority = String(task?.priority || "").toLowerCase();
            const status = String(task?.derivedStatus || "").toLowerCase();
            return (
                title.includes(term) ||
                description.includes(term) ||
                priority.includes(term) ||
                status.includes(term)
            );
        });
    }, [annotatedTasks, activeTab, query]);

    const countFor = (status) =>
        annotatedTasks.filter((task) => task.derivedStatus === status).length;

    const totalTasks = annotatedTasks.length;

    return (
        <div className="dr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="dr-modal-card" role="dialog" aria-modal="true" aria-label={`${emp.name} tasks`}>
                <div className="dr-modal-head">
                    <div className="dr-modal-person">
                        <img
                            src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                            alt={`${emp.name} Profile`}
                            className="dr-modal-avatar"
                        />
                        <div>
                            <h5 className="dr-modal-title">{emp.name}</h5>
                            <div className="dr-modal-subtitle">{emp.department}</div>
                        </div>
                    </div>

                    <button className="dr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="dr-modal-toolbar">
                    <div className="dr-pill-row">
                        {[
                            { key: "all", label: "All", count: totalTasks, tone: "neutral" },
                            { key: "Completed", label: "Completed", count: countFor("Completed"), tone: "success" },
                            { key: "Ongoing", label: "Ongoing", count: countFor("Ongoing"), tone: "warning" },
                            { key: "Overdue", label: "Overdue", count: countFor("Overdue"), tone: "danger" }
                        ].map((tab) => {
                            const active = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`dr-pill-tab ${tab.tone} ${active ? "is-active" : ""}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {tab.label}
                                    <span className="dr-pill-tab-count">{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="dr-search-box dr-search-box--modal">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="dr-modal-body">
                    {loading ? (
                        <div className="dr-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="dr-empty-state">No matching tasks found.</div>
                    ) : (
                        <div className="dr-task-list">
                            {filteredTasks.map((task, idx) => {
                                const status = task.derivedStatus;
                                const statusClass = getStatusClass(status);
                                const priorityText = task.priority || "Other";
                                const priorityClass = getPriorityClass(priorityText);

                                let deadlineMeta = "No deadline";
                                if (task.deadline) {
                                    deadlineMeta = formatDatePH(task.deadline, true);
                                    if (task.days_until_deadline !== null && task.days_until_deadline !== undefined) {
                                        if (status === "Overdue") {
                                            deadlineMeta += ` · ${Math.abs(task.days_until_deadline)} day${Math.abs(task.days_until_deadline) !== 1 ? "s" : ""} overdue`;
                                        } else if (status === "Ongoing") {
                                            deadlineMeta += task.days_until_deadline === 0
                                                ? " · Due today"
                                                : ` · ${task.days_until_deadline} day${task.days_until_deadline !== 1 ? "s" : ""} left`;
                                        }
                                    }
                                }

                                return (
                                    <div className="dr-task-item" key={task.id ?? idx}>
                                        <div className="dr-task-item-main">
                                            <div className="dr-task-item-title">{task.title || "Untitled Task"}</div>
                                            {task.description && (
                                                <div className="dr-task-item-desc">{task.description}</div>
                                            )}
                                            <div className="dr-task-item-meta">{deadlineMeta}</div>
                                        </div>

                                        <div className="dr-task-item-side">
                                            <span className={`dr-status-inline ${statusClass}`}>{status}</span>
                                            <span className={`dr-priority-inline ${priorityClass}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                <span>{priorityText}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="dr-modal-foot">
                    <button className="dr-ghost-btn" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon, label, value, subtext, tone, meta }) {
    return (
        <div className="dr-summary-card">
            <div className="dr-summary-head">
                <div className={`dr-summary-icon ${tone}`}>
                    <i className={`bi ${icon}`}></i>
                </div>
                <span className={`dr-summary-chip ${tone}`}>{meta}</span>
            </div>

            <div className="dr-summary-label">{label}</div>

            <div className="dr-summary-value-line">
                <span className="dr-summary-value">{value}</span>
            </div>

            <div className="dr-summary-subtext">{subtext}</div>
        </div>
    );
}

function SupervisorDailyReportPage() {
    const [supervisor, setSupervisor] = useState(null);
    const [summary, setSummary] = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const trendChartRef = useRef(null);
    const donutChartRef = useRef(null);
    const trendChart = useRef(null);
    const donutChart = useRef(null);

    useEffect(() => {
        fetch("php/get_current_user.php")
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setError("Could not load your profile. Please log in again.");
                    setLoading(false);
                    return;
                }

                if (data.role !== "supervisor") {
                    setError("Access denied. This page is for supervisors only.");
                    setLoading(false);
                    return;
                }

                setSupervisor(data);
            })
            .catch(() => {
                setError("Failed to connect to the server.");
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!supervisor) return;

        setLoading(true);
        setSelectedEmp(null);

        fetch("php/get_supervisor_daily_report.php")
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setEmployees(Array.isArray(data.employees) ? data.employees : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Failed to load report: ${err.message}`);
                setLoading(false);
            });
    }, [supervisor]);

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

    const scopedSummary = useMemo(() => {
        if (!selectedEmp) return summary;

        const completed = safeNum(selectedEmp.completed);
        const ongoing = safeNum(selectedEmp.ongoing);
        const overdue = safeNum(selectedEmp.overdue);

        return {
            total: completed + ongoing + overdue,
            completed,
            ongoing,
            overdue
        };
    }, [selectedEmp, summary]);

    const employeeRows = useMemo(
        () =>
            employees.map((emp) => {
                const completed = safeNum(emp.completed);
                const ongoing = safeNum(emp.ongoing);
                const overdue = safeNum(emp.overdue);
                const total = completed + ongoing + overdue;

                return {
                    ...emp,
                    completed,
                    ongoing,
                    overdue,
                    total,
                    completionRate: pct(completed, total)
                };
            }),
        [employees]
    );

    const chartLabels = useMemo(() => {
        if (selectedEmp) return [selectedEmp.name];
        return employeeRows.map((emp) => emp.name);
    }, [employeeRows, selectedEmp]);

    const completedSeries = useMemo(() => {
        if (selectedEmp) return [safeNum(selectedEmp.completed)];
        return employeeRows.map((emp) => emp.completed);
    }, [employeeRows, selectedEmp]);

    const ongoingSeries = useMemo(() => {
        if (selectedEmp) return [safeNum(selectedEmp.ongoing)];
        return employeeRows.map((emp) => emp.ongoing);
    }, [employeeRows, selectedEmp]);

    const overdueSeries = useMemo(() => {
        if (selectedEmp) return [safeNum(selectedEmp.overdue)];
        return employeeRows.map((emp) => emp.overdue);
    }, [employeeRows, selectedEmp]);

    const donutLegendData = useMemo(() => {
        const total = scopedSummary.total || 0;
        return [
            {
                label: "Completed",
                value: scopedSummary.completed,
                color: "#16a34a"
            },
            {
                label: "Ongoing",
                value: scopedSummary.ongoing,
                color: "#f59e0b"
            },
            {
                label: "Overdue",
                value: scopedSummary.overdue,
                color: "#ec4899"
            }
        ].map((item) => ({
            ...item,
            percent: pct(item.value, total)
        }));
    }, [scopedSummary]);

    React.useEffect(() => {
        if (!window.echarts || !trendChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(trendChartRef.current) ||
            window.echarts.init(trendChartRef.current);

        trendChart.current = chart;

        const isDark = themeMode === "dark";
        const axisColor = isDark ? "#98a2b3" : "#7b8794";
        const splitLine = isDark ? "rgba(255,255,255,0.08)" : "#edf1f7";
        const textColor = isDark ? "#f8fafc" : "#18263f";
        const tooltipBg = isDark ? "#182133" : "#ffffff";
        const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5ebf4";

        chart.setOption(
            {
                animationDuration: 650,
                animationEasing: "cubicOut",
                color: ["#5b57d9", "#9c82df", "#c8b8ee"],
                grid: {
                    top: 26,
                    left: 22,
                    right: 18,
                    bottom: 42,
                    containLabel: true
                },
                tooltip: {
                    trigger: "axis",
                    axisPointer: {
                        type: "shadow"
                    },
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    textStyle: {
                        color: textColor,
                        fontFamily: "Nunito, sans-serif"
                    },
                    extraCssText:
                        "box-shadow:0 18px 40px rgba(15,23,42,0.12); border-radius:16px;"
                },
                legend: {
                    show: false
                },
                xAxis: {
                    type: "category",
                    data: chartLabels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800,
                        margin: 10
                    }
                },
                yAxis: {
                    type: "value",
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
                        lineStyle: {
                            color: splitLine,
                            type: "dashed"
                        }
                    }
                },
                series: [
                    {
                        name: "Task Completed",
                        type: "bar",
                        stack: "tasks",
                        barWidth: 28,
                        itemStyle: {
                            borderRadius: [0, 0, 8, 8]
                        },
                        data: completedSeries
                    },
                    {
                        name: "Task Ongoing",
                        type: "bar",
                        stack: "tasks",
                        barWidth: 28,
                        itemStyle: {
                            borderRadius: [0, 0, 0, 0]
                        },
                        data: ongoingSeries
                    },
                    {
                        name: "Task Overdue",
                        type: "bar",
                        stack: "tasks",
                        barWidth: 28,
                        itemStyle: {
                            borderRadius: [8, 8, 0, 0]
                        },
                        data: overdueSeries
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
    }, [chartLabels, completedSeries, ongoingSeries, overdueSeries, themeMode]);

    useEffect(() => {
        if (!window.echarts || !donutChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(donutChartRef.current) ||
            window.echarts.init(donutChartRef.current);

        donutChart.current = chart;

        const isDark = themeMode === "dark";
        const separatorColor = isDark ? "#12192b" : "#ffffff";

        const seriesData = [
            { value: scopedSummary.completed, name: "Completed", itemStyle: { color: "#16a34a" } },
            { value: scopedSummary.ongoing, name: "Ongoing", itemStyle: { color: "#f59e0b" } },
            { value: scopedSummary.overdue, name: "Overdue", itemStyle: { color: "#ec4899" } }
        ];

        chart.setOption(
            {
                animation: true,
                tooltip: {
                    trigger: "item",
                    formatter: (params) => `${params.name}: ${params.value} (${params.percent}%)`,
                    backgroundColor: isDark ? "#182133" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5ebf4",
                    borderWidth: 1,
                    textStyle: {
                        color: isDark ? "#f8fafc" : "#18263f",
                        fontFamily: "Nunito, sans-serif"
                    }
                },
                series: [
                    {
                        type: "pie",
                        radius: ["63%", "84%"],
                        center: ["50%", "50%"],
                        startAngle: 90,
                        clockwise: true,
                        minAngle: 1,
                        avoidLabelOverlap: true,
                        label: { show: false },
                        labelLine: { show: false },
                        emphasis: {
                            scale: true,
                            scaleSize: 8,
                            itemStyle: {
                                borderColor: separatorColor,
                                borderWidth: 5,
                                borderRadius: 10
                            }
                        },
                        itemStyle: {
                            borderColor: separatorColor,
                            borderWidth: 4,
                            borderRadius: 10
                        },
                        data: seriesData
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
    }, [scopedSummary, themeMode]);

    if (error) {
        return (
            <div className="dr-page">
                <div className="dr-error-card">
                    <h5>Access Error</h5>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading || !supervisor) {
        return (
            <div className="dr-page">
                <div className="dr-loading-card">
                    <div className="spinner-border me-2" role="status"></div>
                    <span>Loading report…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dr-page">

            <div className="dr-summary-grid">
                <SummaryCard
                    icon="bi-check2-circle"
                    label="Completed Tasks"
                    value={scopedSummary.completed}
                    subtext="Finished tasks in scope"
                    tone="success"
                    meta={`${pct(scopedSummary.completed, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-arrow-repeat"
                    label="In Progress Tasks"
                    value={scopedSummary.ongoing}
                    subtext="Active tasks being worked on"
                    tone="warning"
                    meta={`${pct(scopedSummary.ongoing, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-exclamation-circle"
                    label="Overdue Tasks"
                    value={scopedSummary.overdue}
                    subtext="Tasks past the deadline"
                    tone="danger"
                    meta={`${pct(scopedSummary.overdue, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-list-task"
                    label="Total Tasks"
                    value={scopedSummary.total}
                    subtext="All tasks in current view"
                    tone="primary"
                    meta={`${employeeRows.length} staff member${employeeRows.length !== 1 ? "s" : ""}`}
                />
            </div>

            <div className="dr-top-grid">
                <div className="dr-card dr-card--trend">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Task Status Trend</h5>
                            <div className="dr-card-subtitle">
                                {selectedEmp ? `${selectedEmp.name} task counts` : "Department-wide staff task distribution"}
                            </div>
                        </div>

                        {selectedEmp ? (
                            <button className="dr-filter-pill dr-filter-pill--button" onClick={() => setSelectedEmp(null)}>
                                Clear Selection
                            </button>
                        ) : (
                            <div className="dr-filter-pill">This Week</div>
                        )}
                    </div>

                    <div ref={trendChartRef} className="dr-trend-chart"></div>
                </div>

                <div className="dr-card dr-card--donut">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Task Status Distribution</h5>
                            <div className="dr-card-subtitle">
                                {selectedEmp ? `${selectedEmp.name} summary` : "Department task summary"}
                            </div>
                        </div>

                        <div className="dr-filter-pill">
                            {selectedEmp ? "Selected Staff" : "All Staff"}
                        </div>
                    </div>

                    <div className="dr-donut-stack">
                        <div className="dr-donut-shell">
                            <div ref={donutChartRef} className="dr-donut-chart"></div>

                            <div className="dr-donut-center">
                                <span className="dr-donut-center-kicker">Total</span>
                                <div className="dr-donut-center-line">
                                    <strong className="dr-donut-center-value">{scopedSummary.total}</strong>
                                    <span className="dr-donut-center-unit">task{scopedSummary.total !== 1 ? "s" : ""}</span>
                                </div>
                            </div>
                        </div>

                        <div className="dr-donut-legend">
                            {donutLegendData.map((item) => (
                                <div className="dr-donut-legend-item" key={item.label}>
                                    <span
                                        className="dr-donut-dot"
                                        style={{ borderColor: item.color }}
                                    ></span>

                                    <div className="dr-donut-legend-copy">
                                        <div className="dr-donut-legend-label">{item.label}</div>
                                        <div className="dr-donut-legend-meta">
                                            {item.value} task{item.value !== 1 ? "s" : ""} · {item.percent}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="dr-card dr-card--table dr-card--table-full">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Task Assignee Overview</h5>
                        <div className="dr-card-subtitle">
                            Click a row to focus the charts · click the eye icon to inspect tasks
                        </div>
                    </div>

                    <div className="dr-filter-pill">{employeeRows.length} assignee{employeeRows.length !== 1 ? "s" : ""}</div>
                </div>

                <div className="dr-table-shell">
                    <table className="dr-table">
                        <thead>
                            <tr>
                                <th style={{ width: "52px" }}>#</th>
                                <th>Assignee</th>
                                <th style={{ width: "110px" }}>Completed</th>
                                <th style={{ width: "110px" }}>On Progress</th>
                                <th style={{ width: "98px" }}>Overdue</th>
                                <th style={{ width: "140px" }}>Completion Rate</th>
                                <th style={{ width: "70px", textAlign: "center" }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employeeRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="dr-table-empty">
                                        No staff members found in this department.
                                    </td>
                                </tr>
                            ) : (
                                employeeRows.map((emp, index) => {
                                    const active = selectedEmp?.id === emp.id;

                                    return (
                                        <tr
                                            key={emp.id}
                                            className={active ? "is-active" : ""}
                                            onClick={() =>
                                                setSelectedEmp((prev) =>
                                                    prev?.id === emp.id ? null : emp
                                                )
                                            }
                                        >
                                            <td>{index + 1}</td>

                                            <td>
                                                <div className="dr-assignee">
                                                    <img
                                                        src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                                                        alt={`${emp.name} Profile`}
                                                        className="dr-assignee-avatar"
                                                    />
                                                    <div className="dr-assignee-copy">
                                                        <span className="dr-assignee-name">{emp.name}</span>
                                                        <span className="dr-assignee-sub">{emp.department}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{emp.completed}</td>
                                            <td>{emp.ongoing}</td>
                                            <td className="dr-overdue-cell">{emp.overdue}</td>
                                            <td>
                                                {emp.total === 0 ? (
                                                    <span className="dr-empty-inline">No tasks yet</span>
                                                ) : emp.completionRate === 0 ? (
                                                    <span className="dr-rate-danger">0% — None completed</span>
                                                ) : (
                                                    <div className="dr-progress">
                                                        <div
                                                            className="dr-progress-bar"
                                                            style={{ width: `${emp.completionRate}%` }}
                                                        >
                                                            {emp.completionRate}%
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            <td
                                                style={{ textAlign: "center" }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalEmp(emp);
                                                }}
                                            >
                                                <button className="dr-eye-btn" title={`View ${emp.name}'s tasks`}>
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    onClose={() => setModalEmp(null)}
                    themeMode={themeMode}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("supervisorDailyReportRoot"));
root.render(<SupervisorDailyReportPage />);