const { useEffect, useMemo, useRef, useState } = React;

const QUARTER_LABELS = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };
const QUARTER_RANGES = { 1: "Jan – Mar", 2: "Apr – Jun", 3: "Jul – Sep", 4: "Oct – Dec" };

function getThemeMode() {
    return document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
}

function getCurrentQuarter() {
    return Math.ceil((new Date().getMonth() + 1) / 3);
}

function formatQuarterDisplay(year, quarter) {
    return `${QUARTER_LABELS[quarter]} ${year} (${QUARTER_RANGES[quarter]})`;
}

function buildAvatarFallbackUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
    )}&background=f7c4d4&color=222&size=80`;
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
        return <span className="qr-empty-inline">No tasks yet</span>;
    }

    if (rate === 0) {
        return <span className="qr-rate-danger">0% — None completed</span>;
    }

    return (
        <div className="qr-progress-clean">
            <div className="qr-progress-clean-track">
                <div
                    className="qr-progress-clean-fill"
                    style={{ width: `${rate}%` }}
                ></div>
            </div>
            <span className="qr-progress-clean-value">{rate}%</span>
        </div>
    );
}

function SummaryCard({ icon, title, value, tone, sub }) {
    return (
        <div className="qr-summary-card">
            <div className="qr-summary-top">
                <div className={`qr-summary-icon ${tone}`}>
                    <i className={`bi ${icon}`}></i>
                </div>
                <span className={`qr-summary-chip ${tone}`}>{sub}</span>
            </div>

            <div className="qr-summary-title">{title}</div>
            <div className={`qr-summary-value ${tone}`}>{value}</div>
        </div>
    );
}

function EmployeeTaskModal({ emp, quarterStart, quarterEnd, onClose }) {
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

        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}&week_start=${quarterStart}&week_end=${quarterEnd}`)
            .then((r) => {
                if (!r.ok) throw new Error(`Server returned ${r.status}`);
                return r.json();
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
    }, [emp.id, quarterStart, quarterEnd]);

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

    const quarterLabel = `${quarterStart} — ${quarterEnd}`;

    return (
        <div className="qr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="qr-modal-card">
                <div className="qr-modal-head">
                    <div className="qr-modal-person">
                        <img
                            src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                            alt={`${emp.name} Profile`}
                            className="qr-modal-avatar"
                        />
                        <div>
                            <h5 className="qr-modal-title">{emp.name}</h5>
                            <div className="qr-modal-subtitle">
                                {emp.department} · {quarterLabel}
                            </div>
                        </div>
                    </div>

                    <button className="qr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="qr-modal-toolbar">
                    <div className="qr-pill-row">
                        {[
                            { key: "all", label: "All", count: counts.all, tone: "neutral" },
                            { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                            { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                            { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`qr-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                                <span className="qr-pill-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="qr-search-box">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="qr-modal-body">
                    {loading ? (
                        <div className="qr-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="qr-empty-state">No matching tasks found for this quarter.</div>
                    ) : (
                        <div className="qr-task-list">
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
                                    <div className="qr-task-item" key={task.id ?? idx}>
                                        <div className="qr-task-main">
                                            <div className="qr-task-title">{task.title}</div>
                                            {task.description && (
                                                <div className="qr-task-desc">{task.description}</div>
                                            )}
                                            <div className="qr-task-meta">{deadlineText}</div>
                                        </div>

                                        <div className="qr-task-side">
                                            <span className={`qr-status-inline ${statusTone(status)}`}>{status}</span>
                                            <span className={`qr-priority-inline ${priorityTone(priority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                <span>{priority}</span>
                                            </span>
                                            <div className="qr-progress-mini">{task.progress ?? 0}%</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="qr-modal-foot">
                    <button className="qr-ghost-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function SupervisorQuarterlyReportPage() {
    const now = new Date();

    const [summary, setSummary] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        overdue: 0,
        completion_rate: 0
    });
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [department, setDepartment] = useState(null);
    const [supervisor, setSupervisor] = useState(null);
    const [year, setYear] = useState(now.getFullYear());
    const [quarter, setQuarter] = useState(getCurrentQuarter());
    const [modalEmp, setModalEmp] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const monthlyBarRef = useRef(null);
    const donutRef = useRef(null);
    const hBarRef = useRef(null);

    const qMonthStart = (quarter - 1) * 3 + 1;
    const qMonthEnd = qMonthStart + 2;
    const quarterStart = `${year}-${String(qMonthStart).padStart(2, "0")}-01`;
    const lastDay = new Date(year, qMonthEnd, 0).getDate();
    const quarterEnd = `${year}-${String(qMonthEnd).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

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
        setLoadError(null);

        fetch(`php/get_supervisor_quarterly_report.php?year=${year}&quarter=${quarter}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setLoadError(data.error);
                    return;
                }
                setSummary(data.summary ?? {
                    total: 0,
                    completed: 0,
                    ongoing: 0,
                    overdue: 0,
                    completion_rate: 0
                });
                setMonthlyTrend(data.monthly_trend ?? []);
                setEmployees(data.employees ?? []);
                setDepartment(data.department ?? null);
                setSupervisor(data.supervisor ?? null);
            })
            .catch((err) => setLoadError(err.message));
    }, [year, quarter]);

    const monthNames = useMemo(() => monthlyTrend.map((m) => m.month_name), [monthlyTrend]);
    const trendCompleted = useMemo(() => monthlyTrend.map((m) => m.completed), [monthlyTrend]);
    const trendOngoing = useMemo(() => monthlyTrend.map((m) => m.ongoing), [monthlyTrend]);
    const trendOverdue = useMemo(() => monthlyTrend.map((m) => m.overdue), [monthlyTrend]);

    const donutData = useMemo(
        () => [
            { label: "Completed", value: summary.completed, color: "#16a34a" },
            { label: "Ongoing", value: summary.ongoing, color: "#f59e0b" },
            { label: "Overdue", value: summary.overdue, color: "#ec4899" }
        ].map((item) => ({
            ...item,
            percent: summary.total > 0 ? Math.round((item.value / summary.total) * 100) : 0
        })),
        [summary]
    );

    const empSorted = useMemo(
        () => [...employees].sort((a, b) => b.completion_rate - a.completion_rate),
        [employees]
    );
    const empNames = useMemo(() => empSorted.map((e) => e.name), [empSorted]);
    const empCompleted = useMemo(() => empSorted.map((e) => e.completed), [empSorted]);
    const empOverdue = useMemo(() => empSorted.map((e) => e.overdue), [empSorted]);

    useEffect(() => {
        if (!window.echarts || !monthlyBarRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(monthlyBarRef.current) ||
            window.echarts.init(monthlyBarRef.current);

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
                    top: 34,
                    left: 20,
                    right: 18,
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
                        const comp = trendCompleted[idx] || 0;
                        const tot = comp + (trendOngoing[idx] || 0) + (trendOverdue[idx] || 0);
                        const lines = params.map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
                        lines.push(`Completion rate: ${tot > 0 ? Math.round((comp / tot) * 100) : 0}%`);
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
                    data: monthNames,
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
                        stack: "quarter",
                        barMaxWidth: 30,
                        itemStyle: { borderRadius: [0, 0, 8, 8] },
                        data: trendCompleted
                    },
                    {
                        name: "Ongoing",
                        type: "bar",
                        stack: "quarter",
                        barMaxWidth: 30,
                        itemStyle: { borderRadius: [0, 0, 0, 0] },
                        data: trendOngoing
                    },
                    {
                        name: "Overdue",
                        type: "bar",
                        stack: "quarter",
                        barMaxWidth: 30,
                        itemStyle: { borderRadius: [8, 8, 0, 0] },
                        data: trendOverdue
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
    }, [monthNames, trendCompleted, trendOngoing, trendOverdue, themeMode]);

    useEffect(() => {
        if (!window.echarts || !donutRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(donutRef.current) ||
            window.echarts.init(donutRef.current);

        const isDark = themeMode === "dark";
        const separator = isDark ? "#141b2d" : "#ffffff";

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
                        label: { show: false },
                        labelLine: { show: false },
                        emphasis: {
                            scale: true,
                            scaleSize: 8,
                            itemStyle: {
                                borderColor: separator,
                                borderWidth: 5,
                                borderRadius: 10
                            }
                        },
                        itemStyle: {
                            borderColor: separator,
                            borderWidth: 4,
                            borderRadius: 10
                        },
                        data: donutData.map((item) => ({
                            value: item.value,
                            name: item.label,
                            itemStyle: { color: item.color }
                        }))
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
    }, [donutData, themeMode]);

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
                    top: 34,
                    left: 92,
                    right: 20,
                    bottom: 20,
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

    const isCurrentQuarter = year === now.getFullYear() && quarter === getCurrentQuarter();

    const goToPrevQuarter = () => {
        if (quarter === 1) {
            setYear((y) => y - 1);
            setQuarter(4);
        } else {
            setQuarter((q) => q - 1);
        }
    };

    const goToNextQuarter = () => {
        if (quarter === 4) {
            setYear((y) => y + 1);
            setQuarter(1);
        } else {
            setQuarter((q) => q + 1);
        }
    };

    const goToCurrent = () => {
        setYear(now.getFullYear());
        setQuarter(getCurrentQuarter());
    };

    const summaryRate = summary.completion_rate ?? 0;

    return (
        <div className="qr-page">
            <div className="qr-page-head">
                <div>
                    <h2 className="qr-page-title">Quarterly Report</h2>
                    <div className="qr-page-meta">
                        {department && <span className="qr-filter-pill">{department.name}</span>}
                        {supervisor && <span className="qr-page-sub">Supervisor: {supervisor.name}</span>}
                    </div>
                </div>

                <div className="qr-quarter-nav">
                    <button className="qr-ghost-btn" onClick={goToPrevQuarter}>
                        <i className="bi bi-chevron-left"></i>
                        Prev
                    </button>

                    <div className="qr-quarter-range">{formatQuarterDisplay(year, quarter)}</div>

                    <button
                        className="qr-ghost-btn"
                        onClick={goToNextQuarter}
                        disabled={isCurrentQuarter}
                    >
                        Next
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {!isCurrentQuarter && (
                        <button className="qr-ghost-btn qr-ghost-btn--primary" onClick={goToCurrent}>
                            This Quarter
                        </button>
                    )}
                </div>
            </div>

            {loadError && (
                <div className="alert alert-danger mb-4">
                    <strong>Error:</strong> {loadError}
                </div>
            )}

            <div className="qr-summary-grid">
                <SummaryCard
                    icon="bi-list-task"
                    title="Total Tasks"
                    value={summary.total}
                    tone="primary"
                    sub="Quarter scope"
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
                <SummaryCard
                    icon="bi-graph-up"
                    title="Completion Rate"
                    value={`${summaryRate}%`}
                    tone="primary"
                    sub="Quarter result"
                />
            </div>

            <div className="qr-top-grid">
                <div className="qr-card qr-card--monthly">
                    <div className="qr-card-head">
                        <div>
                            <h5 className="qr-card-title">Monthly Breakdown</h5>
                            <div className="qr-card-subtitle">
                                Task volume and composition across the 3 months of {QUARTER_LABELS[quarter]} {year}
                            </div>
                        </div>
                    </div>
                    <div ref={monthlyBarRef} className="qr-monthly-chart"></div>
                </div>

                <div className="qr-card qr-card--donut">
                    <div className="qr-card-head">
                        <div>
                            <h5 className="qr-card-title">Quarter Status Mix</h5>
                            <div className="qr-card-subtitle">
                                Overall share of completed, ongoing, and overdue tasks
                            </div>
                        </div>
                    </div>

                    <div className="qr-donut-stack">
                        <div className="qr-donut-shell">
                            <div ref={donutRef} className="qr-donut-chart"></div>

                            <div className="qr-donut-center">
                                <span className="qr-donut-center-kicker">Total</span>
                                <div className="qr-donut-center-line">
                                    <strong className="qr-donut-center-value">{summary.total}</strong>
                                    <span className="qr-donut-center-unit">tasks</span>
                                </div>
                            </div>
                        </div>

                        <div className="qr-donut-legend">
                            {donutData.map((item) => (
                                <div className="qr-donut-legend-item" key={item.label}>
                                    <span className="qr-donut-dot" style={{ borderColor: item.color }}></span>
                                    <div className="qr-donut-legend-copy">
                                        <div className="qr-donut-legend-label">{item.label}</div>
                                        <div className="qr-donut-legend-meta">
                                            {item.value} task{item.value !== 1 ? "s" : ""} · {item.percent}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="qr-card qr-card--staff-chart">
                <div className="qr-card-head">
                    <div>
                        <h5 className="qr-card-title">Staff Performance</h5>
                        <div className="qr-card-subtitle">
                            Sorted by completion rate
                        </div>
                    </div>
                </div>

                <div
                    ref={hBarRef}
                    className="qr-hbar-chart"
                    style={{ height: `${Math.max(240, empSorted.length * 38)}px` }}
                ></div>
            </div>

            <div className="qr-card qr-card--table">
                <div className="qr-card-head">
                    <div>
                        <h5 className="qr-card-title">
                            Staff Details
                            {department && (
                                <span className="qr-card-title-sub"> — {department.name}</span>
                            )}
                        </h5>
                        <div className="qr-card-subtitle">Quarterly staff activity</div>
                    </div>
                </div>

                <div className="qr-table-shell">
                    <table className="qr-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th style={{ width: "110px" }}>Completed</th>
                                <th style={{ width: "100px" }}>Ongoing</th>
                                <th style={{ width: "100px" }}>Overdue</th>
                                <th style={{ width: "180px" }}>Completion Rate</th>
                                <th style={{ width: "72px", textAlign: "center" }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="qr-table-empty">
                                        No staff activity found for this quarter.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => {
                                    const rate = emp.completion_rate;
                                    const total = emp.total;

                                    return (
                                        <tr key={emp.id}>
                                            <td>
                                                <div className="qr-assignee">
                                                    <img
                                                        src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                                                        alt={`${emp.name} Profile`}
                                                        className="qr-assignee-avatar"
                                                    />
                                                    <div className="qr-assignee-copy">
                                                        <span className="qr-assignee-name">{emp.name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{emp.completed}</td>
                                            <td>{emp.ongoing}</td>
                                            <td className="qr-overdue-cell">{emp.overdue}</td>
                                            <td>{renderCleanProgress(rate, total)}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    className="qr-eye-btn"
                                                    title={`View ${emp.name}'s tasks this quarter`}
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
                                })
                            )}
                        </tbody>
                    </table>
                </div>
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

const root = ReactDOM.createRoot(document.getElementById("supervisorQuarterlyRoot"));
root.render(<SupervisorQuarterlyReportPage />);