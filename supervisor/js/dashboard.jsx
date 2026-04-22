const SUPERVISOR_PERIOD_OPTIONS = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" }
];

const SUPERVISOR_DEFAULT_PERIOD = "week";
const MANILA_TZ = "Asia/Manila";

const TASK_STATUS_COLOR_MAP = {
    Overdue: "#ef5a5a",
    Ongoing: "#7a8dff",
    Completed: "#4f73ff",
    Review: "#6c63ff",
    Scheduled: "#4a90c2",
    Other: "#f5a0a0",
    Extra: "#b8c9ff"
};

function supervisorGetTodayYMD() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MANILA_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    return [
        parts.find((p) => p.type === "year")?.value,
        parts.find((p) => p.type === "month")?.value,
        parts.find((p) => p.type === "day")?.value
    ].join("-");
}

function supervisorGetPeriodRange(periodKey) {
    const todayYMD = supervisorGetTodayYMD();
    const [ty, tm, td] = todayYMD.split("-").map(Number);
    const today = new Date(Date.UTC(ty, tm - 1, td));

    if (periodKey === "today") {
        return { start: todayYMD, end: todayYMD };
    }

    if (periodKey === "week") {
        const dow = today.getUTCDay();
        const diffToMon = dow === 0 ? -6 : 1 - dow;

        const monday = new Date(today);
        monday.setUTCDate(today.getUTCDate() + diffToMon);

        const sunday = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);

        return {
            start: monday.toISOString().slice(0, 10),
            end: sunday.toISOString().slice(0, 10)
        };
    }

    if (periodKey === "month") {
        const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
        const pad = (n) => String(n).padStart(2, "0");

        return {
            start: `${ty}-${pad(tm)}-01`,
            end: `${ty}-${pad(tm)}-${pad(lastDay)}`
        };
    }

    return { start: null, end: null };
}

function supervisorIsTaskInPeriod(task, periodKey) {
    if (periodKey === "all") return true;

    const todayYMD = supervisorGetTodayYMD();
    const deadlineYMD = String(task?.deadline || "").slice(0, 10);
    const rawStatus = String(task?.status || "").trim().toLowerCase();

    const isOverdue =
        Boolean(task?.is_overdue) ||
        rawStatus === "overdue" ||
        (deadlineYMD && deadlineYMD < todayYMD && rawStatus !== "completed");

    if (isOverdue) return true;
    if (!deadlineYMD) return false;

    const { start, end } = supervisorGetPeriodRange(periodKey);
    return deadlineYMD >= start && deadlineYMD <= end;
}

function extractArray(payload, keys = []) {
    if (Array.isArray(payload)) return payload;

    for (const key of keys) {
        if (Array.isArray(payload?.[key])) return payload[key];
    }

    return [];
}

function parseYMDToUTC(dateStr) {
    const [y, m, d] = String(dateStr || "").slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return NaN;
    return Date.UTC(y, m - 1, d);
}

function formatMonthDayUTC(value) {
    if (!Number.isFinite(value)) return "–";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: MANILA_TZ,
        month: "short",
        day: "numeric"
    }).format(new Date(value));
}

function formatTaskOverviewDate(dateStr) {
    const utcMs = parseYMDToUTC(dateStr);
    if (!Number.isFinite(utcMs)) return "–";

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: MANILA_TZ,
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(utcMs));
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

function normalizeStatus(status = "") {
    const s = String(status).trim().toLowerCase();

    if (!s) return "Other";
    if (["ongoing", "in progress", "in-progress", "active"].includes(s)) return "Ongoing";
    if (["completed", "complete", "done"].includes(s)) return "Completed";
    if (["overdue", "late", "past due", "past-due"].includes(s)) return "Overdue";
    if (["review", "for review", "under review"].includes(s)) return "Review";
    if (["scheduled"].includes(s)) return "Scheduled";
    if (["extra"].includes(s)) return "Extra";

    return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizePriority(priority = "") {
    const p = String(priority).trim().toLowerCase();

    if (!p) return "Other";
    if (["high", "urgent", "critical"].includes(p)) return "High";
    if (["medium", "normal", "moderate"].includes(p)) return "Medium";
    if (["low", "minor"].includes(p)) return "Low";

    return p.charAt(0).toUpperCase() + p.slice(1);
}

function getDisplayStatus(status = "") {
    const s = String(status || "").trim();
    if (!s) return "Other";

    return s
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function getTokenClass(value = "") {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "other";
}

function buildAvatarFallbackUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
    )}&background=f7c4d4&color=222&size=80`;
}

function TaskAssigneeAvatar({ task }) {
    const [imageFailed, setImageFailed] = React.useState(false);

    React.useEffect(() => {
        setImageFailed(false);
    }, [task?.assigned_profile_image_url]);

    const displayName = task?.assigned_name || "Unassigned";
    const uploadedAvatarUrl =
        task?.assigned_profile_image_url && !imageFailed
            ? task.assigned_profile_image_url
            : "";

    if (uploadedAvatarUrl) {
        return (
            <img
                src={uploadedAvatarUrl}
                alt={`${displayName} Profile`}
                className="db-task-person-avatar"
                onError={() => setImageFailed(true)}
            />
        );
    }

    return (
        <img
            src={buildAvatarFallbackUrl(displayName)}
            alt={`${displayName} Profile`}
            className="db-task-person-avatar"
        />
    );
}

function getCurrentThemeMode() {
    return document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
}

function SupervisorDashboard() {
    const [tasks, setTasks] = React.useState([]);
    const [search, setSearch] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [period, setPeriod] = React.useState(SUPERVISOR_DEFAULT_PERIOD);

    const donutChartRef = React.useRef(null);
    const ganttChartRef = React.useRef(null);

    const [themeMode, setThemeMode] = React.useState(getCurrentThemeMode);
    const fetchDashboardData = React.useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const tasksRes = await fetch("php/get_department_tasks.php", {
                headers: { Accept: "application/json" }
            });

            const tasksJson = await tasksRes.json().catch(() => []);
            setTasks(extractArray(tasksJson, ["tasks", "data", "results"]));

            if (!tasksRes.ok) {
                setError("Some dashboard data could not be loaded.");
            }
        } catch (err) {
            console.error("Failed to load dashboard data", err);
            setTasks([]);
            setError("Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    React.useEffect(() => {
        const root = document.documentElement;

        const observer = new MutationObserver(() => {
            setThemeMode(getCurrentThemeMode());
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ["data-theme"]
        });

        return () => observer.disconnect();
    }, []);

    const scopedTasks = React.useMemo(
        () => (Array.isArray(tasks) ? tasks.filter((task) => supervisorIsTaskInPeriod(task, period)) : []),
        [tasks, period]
    );

    const filteredTasks = React.useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return scopedTasks;

        return scopedTasks.filter((task) => {
            const title = String(task?.title || "").toLowerCase();
            const assigned = String(task?.assigned_name || "").toLowerCase();
            return title.includes(term) || assigned.includes(term);
        });
    }, [scopedTasks, search]);

    const taskStatusData = React.useMemo(() => {
        const order = ["Overdue", "Ongoing", "Completed", "Review", "Scheduled", "Other", "Extra"];
        const counts = {};

        scopedTasks.forEach((task) => {
            const name = normalizeStatus(task?.status);
            counts[name] = (counts[name] || 0) + 1;
        });

        const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

        return order
            .filter((name) => counts[name] > 0)
            .map((name) => ({
                name,
                value: counts[name],
                percent: total ? Math.round((counts[name] / total) * 100) : 0,
                color: TASK_STATUS_COLOR_MAP[name] || "#9fb4ff"
            }));
    }, [scopedTasks]);

    const ganttReportData = React.useMemo(() => {
        const baseRows = scopedTasks
            .filter((task) => task?.title && task?.start_date && task?.deadline)
            .map((task, index) => {
                const startMs = parseYMDToUTC(task.start_date);
                const endMs = parseYMDToUTC(task.deadline);

                if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

                const safeEndMs = Math.max(startMs, endMs);
                const duration = Math.max(1, Math.round((safeEndMs - startMs) / 864e5) + 1);

                return {
                    rowKey: `${task?.id || "task"}-${task.title}-${startMs}-${index}`,
                    title: task.title,
                    status: normalizeStatus(task?.status),
                    startMs,
                    endMs: safeEndMs,
                    duration,
                    startLabel: formatMonthDayUTC(startMs),
                    endLabel: formatMonthDayUTC(safeEndMs)
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.startMs - b.startMs || a.title.localeCompare(b.title));

        if (!baseRows.length) return null;

        const featured = baseRows.reduce((best, row) => {
            if (!best) return row;
            return row.duration > best.duration ? row : best;
        }, null);

        const rows = baseRows.map((row) => ({
            ...row,
            isFeatured: row.rowKey === featured?.rowKey
        }));

        const minDate = Math.min(...rows.map((row) => row.startMs));
        const maxDate = Math.max(...rows.map((row) => row.endMs));

        return {
            rows,
            minDate: minDate - 864e5,
            maxDate: maxDate + 864e5 * 2
        };
    }, [scopedTasks]);

    React.useEffect(() => {
        if (!window.echarts || !donutChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(donutChartRef.current) ||
            window.echarts.init(donutChartRef.current);

        if (!taskStatusData.length) {
            chart.clear();
            return () => chart.dispose();
        }

        const donutSeparatorColor =
            themeMode === "dark" ? "#141b2d" : "#ffffff";

        chart.setOption({
            animation: true,
            tooltip: {
                trigger: "item",
                formatter: (params) => `${params.name}: ${params.value} (${params.percent}%)`
            },
            series: [
                {
                    type: "pie",
                    radius: ["62%", "85%"],
                    center: ["50%", "50%"],
                    startAngle: 92,
                    clockwise: true,
                    avoidLabelOverlap: true,
                    minAngle: 1,
                    selectedMode: false,
                    hoverAnimation: true,
                    emphasis: {
                        scale: true,
                        scaleSize: 10,
                        itemStyle: {
                            borderColor: donutSeparatorColor,
                            borderWidth: 5,
                            borderRadius: 9
                        }
                    },
                    itemStyle: {
                        borderColor: donutSeparatorColor,
                        borderWidth: 3.5,
                        borderRadius: 6
                    },
                    label: { show: false },
                    labelLine: { show: false },
                    data: taskStatusData.map((item) => ({
                        value: item.value,
                        name: item.name,
                        itemStyle: { color: item.color }
                    }))
                }
            ]
        });

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [taskStatusData, themeMode]);

    React.useEffect(() => {
        if (!window.echarts || !ganttChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(ganttChartRef.current) ||
            window.echarts.init(ganttChartRef.current);

        if (!ganttReportData?.rows?.length) {
            chart.clear();
            return () => chart.dispose();
        }

        const graphic = window.echarts.graphic;
        const { rows, minDate, maxDate } = ganttReportData;

        const seriesData = rows.map((row, idx) => ({
            value: [idx, row.startMs, row.endMs, row.duration, row.isFeatured ? 1 : 0],
            title: row.title,
            status: row.status,
            duration: row.duration,
            startLabel: row.startLabel,
            endLabel: row.endLabel,
            isFeatured: row.isFeatured
        }));

        const renderItem = (params, api) => {
            const taskIndex = api.value(0);
            const start = api.coord([taskIndex, api.value(1)]);
            const end = api.coord([taskIndex, api.value(2)]);
            const columnWidth = Math.min(34, api.size([1, 0])[0] * 0.56);

            const rectShape = graphic.clipRectByRect(
                {
                    x: start[0] - columnWidth / 2,
                    y: Math.min(start[1], end[1]),
                    width: columnWidth,
                    height: Math.max(12, Math.abs(end[1] - start[1])),
                    r: 8
                },
                {
                    x: params.coordSys.x,
                    y: params.coordSys.y,
                    width: params.coordSys.width,
                    height: params.coordSys.height
                }
            );

            if (!rectShape) return null;

            const isFeatured = api.value(4) === 1;
            const fill = isFeatured ? "#F2A541" : "#6C7FF0";
            const shadow = isFeatured
                ? "rgba(242,165,65,0.22)"
                : "rgba(108,127,240,0.18)";

            return {
                type: "rect",
                shape: rectShape,
                style: {
                    fill,
                    stroke: "rgba(255,255,255,0.96)",
                    lineWidth: 1.5,
                    shadowBlur: 16,
                    shadowOffsetY: 8,
                    shadowColor: shadow
                }
            };
        };

        const tooltipFormatter = (params) => {
            const row = params.data;
            if (!row) return "";

            const accent = row.isFeatured ? "#F2A541" : "#6C7FF0";
            const badge = row.isFeatured ? "Featured task" : row.status;

            return `
                <div style="font-family:Nunito,sans-serif;min-width:210px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="width:10px;height:10px;border-radius:2px;background:${accent};display:inline-block;"></span>
                        <span style="font-size:12px;font-weight:800;color:#7B8797;">${escapeHtml(badge)}</span>
                    </div>

                    <div style="font-size:15px;font-weight:900;color:#18263F;margin-bottom:8px;">
                        ${escapeHtml(row.title)}
                    </div>

                    <div style="font-size:12px;font-weight:700;color:#7B8797;">
                        ${escapeHtml(row.startLabel)} - ${escapeHtml(row.endLabel)}
                    </div>

                    <div style="margin-top:12px;font-size:12px;font-weight:700;color:#A0AABA;">
                        Duration
                    </div>

                    <div style="font-size:28px;line-height:1;font-weight:900;color:#18263F;">
                        ${row.duration}
                        <span style="font-size:13px;font-weight:800;color:#4AAE74;margin-left:4px;">days</span>
                    </div>
                </div>
            `;
        };

        chart.setOption(
            {
                animationDuration: 650,
                animationEasing: "cubicOut",
                grid: {
                    top: 26,
                    right: 18,
                    bottom: 88,
                    left: 76,
                    containLabel: false
                },
                tooltip: {
                    trigger: "item",
                    backgroundColor: "#ffffff",
                    borderColor: "#E7ECF3",
                    borderWidth: 1,
                    padding: [12, 14],
                    textStyle: {
                        color: "#1F3551",
                        fontFamily: "Nunito, sans-serif"
                    },
                    extraCssText:
                        "box-shadow:0 18px 40px rgba(15,23,42,0.12); border-radius:18px;",
                    formatter: tooltipFormatter
                },
                xAxis: {
                    type: "category",
                    data: rows.map((row) => row.title),
                    boundaryGap: true,
                    axisLine: {
                        lineStyle: { color: "#DCE4EF" }
                    },
                    axisTick: { show: false },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: "rgba(220,228,239,0.65)",
                            width: 1
                        }
                    },
                    axisLabel: {
                        interval: 0,
                        rotate: 28,
                        margin: 16,
                        color: "#5F6B7A",
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800,
                        width: 110,
                        overflow: "truncate"
                    }
                },
                yAxis: {
                    type: "time",
                    min: minDate,
                    max: maxDate,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitNumber: 6,
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: "#E8EEF6",
                            width: 1
                        }
                    },
                    axisLabel: {
                        margin: 14,
                        color: "#8A97AA",
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800,
                        formatter: (value) => formatMonthDayUTC(value)
                    }
                },
                series: [
                    {
                        name: "Task timeline",
                        type: "custom",
                        renderItem,
                        data: seriesData,
                        z: 3
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
    }, [ganttReportData]);

    const todayYMD = supervisorGetTodayYMD();
    const totalTasks = scopedTasks.length;
    const completedTasks = scopedTasks.filter((task) => normalizeStatus(task?.status) === "Completed").length;
    const ongoingTasks = scopedTasks.filter((task) => normalizeStatus(task?.status) === "Ongoing").length;
    const overdueTasks = scopedTasks.filter((task) => {
        const normalized = normalizeStatus(task?.status);
        const deadlineYMD = String(task?.deadline || "").slice(0, 10);

        return (
            Boolean(task?.is_overdue) ||
            normalized === "Overdue" ||
            (deadlineYMD && deadlineYMD < todayYMD && normalized !== "Completed")
        );
    }).length;

    const periodLabel =
        SUPERVISOR_PERIOD_OPTIONS.find((option) => option.key === period)?.label || "This Week";

    const renderTaskOverviewRow = (task, index) => {
        const statusText = getDisplayStatus(task?.status);
        const statusClass = getTokenClass(statusText);
        const priorityText = normalizePriority(task?.priority);
        const priorityClass = getTokenClass(priorityText);

        return (
            <tr
                key={task?.id || `${task?.title || "task"}-${task?.deadline || "no-date"}-${index}`}
                className="db-task-overview-row"
            >
                <td className="db-task-overview-index">{index + 1}</td>

                <td className="db-task-overview-name">
                    {task?.title || "–"}
                </td>

                <td className="db-task-overview-assignee-cell">
                    <div className="db-task-person">
                        <TaskAssigneeAvatar task={task} />
                        <span className="db-task-person-name">
                            {task?.assigned_name || "Unassigned"}
                        </span>
                    </div>
                </td>

                <td className="db-task-overview-date">
                    {formatTaskOverviewDate(task?.deadline)}
                </td>

                <td className="db-task-overview-priority-cell">
                    <span className={`db-priority-inline ${priorityClass}`}>
                        <i className="bi bi-flag-fill" aria-hidden="true"></i>
                        <span>{priorityText}</span>
                    </span>
                </td>

                <td className="db-task-overview-status-cell">
                    <span className={`db-task-pill ${statusClass}`}>
                        {statusText}
                    </span>
                </td>
            </tr>
        );
    };

    return (
        <div className="container-fluid py-4 db-dashboard-wrap">
            {error && (
                <div className="alert alert-warning" role="alert">
                    {error}
                </div>
            )}

            <div className="db-period-wrap">
                <div className="db-period-bar" aria-label="Supervisor dashboard period">
                    {SUPERVISOR_PERIOD_OPTIONS.map((option) => {
                        const isActive = period === option.key;

                        return (
                            <button
                                key={option.key}
                                type="button"
                                className={`db-period-tab ${isActive ? "is-active" : ""}`}
                                onClick={() => setPeriod(option.key)}
                                aria-pressed={isActive}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="db-metrics-row db-metrics-row--four mb-4">
                {[
                    {
                        label: "Total Tasks",
                        value: totalTasks,
                        sub: periodLabel,
                        icon: "bi-list-task",
                        tone: "teal",
                        trend: "up"
                    },
                    {
                        label: "Ongoing",
                        value: ongoingTasks,
                        sub: "active",
                        icon: "bi-arrow-repeat",
                        tone: "blue",
                        trend: "up"
                    },
                    {
                        label: "Completed",
                        value: completedTasks,
                        sub: "done",
                        icon: "bi-check2-circle",
                        tone: "green",
                        trend: "up"
                    },
                    {
                        label: "Overdue",
                        value: overdueTasks,
                        sub: "past due",
                        icon: "bi-exclamation-circle",
                        tone: "red",
                        trend: "down"
                    }
                ].map((card) => (
                    <div className="db-stat-card" key={card.label}>
                        <div className="db-stat-card-top">
                            <div className={`db-stat-icon-wrap ${card.tone}`}>
                                <i className={`bi ${card.icon}`}></i>
                            </div>

                            <span className={`db-stat-top-text ${card.trend}`}>
                                {card.sub}
                            </span>
                        </div>

                        <div className="db-stat-main">
                            <h3 className="db-stat-value">{loading ? "…" : card.value}</h3>
                            <p className="db-stat-label">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12 d-flex">
                    <div className="db-gantt-report-card w-100">
                        <div className="db-gantt-report-head">
                            <h5 className="db-gantt-report-title">Task Timeline</h5>
                            <span className="db-gantt-report-range">{periodLabel}</span>
                        </div>

                        {!loading && !ganttReportData?.rows?.length ? (
                            <div className="db-gantt-report-empty">
                                No tasks with date ranges for this period
                            </div>
                        ) : (
                            <div ref={ganttChartRef} className="db-gantt-report-chart"></div>
                        )}
                    </div>
                </div>
            </div>

            <div className="db-task-panels-layout mb-4">
                <div className="db-task-overview-main">
                    <div className="db-task-overview-card">
                        <div className="db-task-overview-head">
                            <h5 className="db-task-overview-title">Task Overview</h5>

                            <div className="db-task-overview-search">
                                <i className="bi bi-search" aria-hidden="true"></i>
                                <input
                                    type="text"
                                    className="db-task-overview-search-input"
                                    placeholder="Search name or task..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Search task overview"
                                />
                            </div>
                        </div>

                        <div className="db-task-overview-shell">
                            <div className="db-task-overview-scroll">
                                <table className="db-task-overview-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "56px" }}>#</th>
                                            <th>Task Name</th>
                                            <th style={{ width: "250px" }}>Assignee</th>
                                            <th style={{ width: "150px" }}>Due Date</th>
                                            <th style={{ width: "120px" }}>Priority</th>
                                            <th style={{ width: "138px" }}>Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="db-task-overview-empty">
                                                    Loading tasks…
                                                </td>
                                            </tr>
                                        ) : filteredTasks.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="db-task-overview-empty">
                                                    No tasks found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTasks.map((task, index) => renderTaskOverviewRow(task, index))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="db-task-overview-side">
                    <div className="db-donut-card db-donut-card--side">
                        <div className="db-donut-card-head">
                            <h5 className="db-donut-title">Task Status Distribution</h5>
                            <small className="db-donut-period">{periodLabel}</small>
                        </div>

                        {loading ? (
                            <div className="db-donut-empty">Loading chart…</div>
                        ) : taskStatusData.length === 0 ? (
                            <div className="db-donut-empty">No tasks for this period</div>
                        ) : (
                            <div className="db-donut-stack">
                                <div className="db-donut-visual">
                                    <div ref={donutChartRef} className="db-donut-chart"></div>

                                    <div className="db-donut-center">
                                        <span className="db-donut-center-kicker">Total</span>

                                        <div className="db-donut-center-count">
                                            <strong className="db-donut-center-value">{totalTasks}</strong>
                                            <span className="db-donut-center-unit">
                                                task{totalTasks !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="db-donut-legend db-donut-legend--side">
                                    {taskStatusData.map((item) => (
                                        <div className="db-donut-legend-row" key={item.name}>
                                            <span
                                                className="db-donut-dot-ring"
                                                style={{ borderColor: item.color }}
                                            ></span>

                                            <div className="db-donut-legend-copy">
                                                <span className="db-donut-legend-label">{item.name}</span>
                                                <span className="db-donut-legend-meta">
                                                    {item.value} task{item.value !== 1 ? "s" : ""} · {item.percent}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const dashboardRoot = document.getElementById("supervisor-dashboard-root");

if (dashboardRoot) {
    ReactDOM.createRoot(dashboardRoot).render(<SupervisorDashboard />);
}