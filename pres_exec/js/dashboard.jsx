const { useState, useEffect, useRef } = React;

const CHART_COLORS = {
    completed: "#16a34a",
    ongoing: "#d97706",
    overdue: "#e11d48"
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




function HealthRing({ ongoing, overdue, completedToday, totalActive }) {
    const ref = useRef(null);
    const chartRef = useRef(null);
    const [themeVersion, setThemeVersion] = useState(0);    

    const legendItems = [
        {
            label: "Completed today",
            value: safeNumber(completedToday),
            percent: percent(completedToday, totalActive),
            color: CHART_COLORS.completed
        },
        {
            label: "Ongoing",
            value: safeNumber(ongoing),
            percent: percent(ongoing, totalActive),
            color: CHART_COLORS.ongoing
        },
        {
            label: "Overdue",
            value: safeNumber(overdue),
            percent: percent(overdue, totalActive),
            color: CHART_COLORS.overdue
        }
    ];

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
                radius: ["62%", "79%"],
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
    }, [ongoing, overdue, completedToday, totalActive, themeVersion]);

    return (
        <div className="dash-ring-block">
            <div className="dash-ring-shell">
                <div className="dash-ring">
                    <div ref={ref} className="dash-ring-canvas"></div>

                    <div className="dash-ring-center">
                        <div className="dash-ring-kicker">Total</div>
                        <div className="dash-ring-value">{safeNumber(totalActive)}</div>
                        <div className="dash-ring-sub">
                            task{safeNumber(totalActive) !== 1 ? "s" : ""}
                        </div>
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

function TrendChart({ seriesMap, periodLabel = "This week" }) {
    const ref = useRef(null);
    const chartRef = useRef(null);

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

        const firstNonEmpty = [
            seriesMap.completed,
            seriesMap.ongoing,
            seriesMap.overdue
        ].find((arr) => Array.isArray(arr) && arr.length > 0);

        const labels = firstNonEmpty ? firstNonEmpty.map((item) => item.label) : [];

        const buildSeries = (name, color, data, topFill) => ({
            name,
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 5,
            showSymbol: true,
            data: data.map((item) => safeNumber(item.count)),
            lineStyle: {
                width: 2,
                color
            },
            itemStyle: {
                color,
                borderWidth: 0
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: topFill },
                    { offset: 1, color: "rgba(255,255,255,0)" }
                ])
            }
        });

        const series = [
            Array.isArray(seriesMap.completed) && seriesMap.completed.length
                ? buildSeries(
                      "Task Completed",
                      "#22c55e",
                      seriesMap.completed,
                      "rgba(34,197,94,0.14)"
                  )
                : null,
            Array.isArray(seriesMap.ongoing) && seriesMap.ongoing.length
                ? buildSeries(
                      "Task Ongoing",
                      "#f59e0b",
                      seriesMap.ongoing,
                      "rgba(245,158,11,0.10)"
                  )
                : null,
            Array.isArray(seriesMap.overdue) && seriesMap.overdue.length
                ? buildSeries(
                      "Task Overdue",
                      "#ec4899",
                      seriesMap.overdue,
                      "rgba(236,72,153,0.08)"
                  )
                : null
        ].filter(Boolean);

        if (!labels.length || !series.length) {
            chartRef.current.clear();
            return;
        }

        chartRef.current.setOption(
            {
                animationDuration: 500,
                animationEasing: "cubicOut",
                tooltip: {
                    trigger: "axis",
                    backgroundColor: theme.tooltipBg,
                    borderWidth: 0,
                    textStyle: { color: "#fff" },
                    axisPointer: {
                        type: "line",
                        lineStyle: {
                            color: "rgba(148,163,184,0.24)",
                            width: 1
                        }
                    }
                },
                legend: {
                    show: true,
                    right: 0,
                    bottom: 0,
                    icon: "circle",
                    itemWidth: 10,
                    itemHeight: 10,
                    itemGap: 18,
                    textStyle: {
                        color: theme.muted,
                        fontSize: 12,
                        fontWeight: 500
                    },
                    data: ["Task Completed", "Task Ongoing", "Task Overdue"]
                },
                grid: {
                    top: 16,
                    right: 8,
                    bottom: 42,
                    left: 18,
                    containLabel: true
                },
                xAxis: {
                    type: "category",
                    boundaryGap: false,
                    data: labels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: theme.muted,
                        fontSize: 11,
                        margin: 12
                    },
                    splitLine: { show: false }
                },
                yAxis: {
                    type: "value",
                    min: 0,
                    minInterval: 1,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: theme.muted,
                        fontSize: 11,
                        margin: 10
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: theme.grid,
                            width: 1,
                            type: "solid"
                        }
                    }
                },
                series
            },
            true
        );
    }, [seriesMap]);

    const hasSeries =
        (Array.isArray(seriesMap.completed) && seriesMap.completed.length > 0) ||
        (Array.isArray(seriesMap.ongoing) && seriesMap.ongoing.length > 0) ||
        (Array.isArray(seriesMap.overdue) && seriesMap.overdue.length > 0);

    return (
        <div>
            <div className="dash-chart-head">
                <div className="dash-card-title">Task Status Trend</div>
                <div className="dash-pill">{periodLabel}</div>
            </div>

            {hasSeries ? (
                <div className="dash-chart-wrap">
                    <div ref={ref} className="dash-chart"></div>
                </div>
            ) : (
                <div className="dash-empty">No trend data available.</div>
            )}
        </div>
    );
}

function RiskList({ rows }) {
    if (!rows.length) {
        return <div className="dash-empty-box">No departments at risk right now.</div>;
    }

    return (
        <div className="dash-risk-list">
            {rows.map((dept) => {
                const rate = clamp(safeNumber(dept.overdue_rate), 0, 100);
                const riskClass = rate >= 50 ? "is-high" : "is-mid";

                return (
                    <div key={dept.department} className="dash-risk-item">
                        <div className="dash-risk-row">
                            <div className="dash-risk-name">{dept.department}</div>
                            <div className="dash-risk-rate">{rate}% overdue</div>
                        </div>

                        <div className="dash-risk-bar">
                            <div
                                className={`dash-risk-bar-fill ${riskClass}`}
                                style={{ width: `${rate}%` }}
                            ></div>
                        </div>

                        <div className="dash-risk-meta">
                            {safeNumber(dept.overdue)} of {safeNumber(dept.total)} tasks overdue
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function getInitials(name) {
    const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) return "U";

    return parts
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}


function TopPerformersTable({ rows, monthLabel }) {
    const visibleRows = Array.isArray(rows) ? rows.slice(0, 5) : [];

    if (!visibleRows.length) {
        return (
            <div className="dash-empty-box">
                No completions recorded for {monthLabel || "this month"} yet.
            </div>
        );
    }

    return (
        <div className="dash-leaderboard">
            <div className="dash-leaderboard-head">
                <div>Rank</div>
                <div>User</div>
                <div>Completed</div>
                <div>Department</div>
            </div>

            <div className="dash-leaderboard-body">
                {visibleRows.map((person, index) => {
                    const rank = index + 1;

                    return (
                        <div
                            className={`dash-leader-row ${rank <= 3 ? "is-top" : ""}`}
                            key={`${person.id || person.name}-${rank}`}
                        >
                            <div className="dash-leader-rank">{rank}</div>

                            <div className="dash-leader-user">
                                <div className="dash-leader-avatar-wrap">
                                    {person.profile_image_url ? (
                                        <img
                                            src={person.profile_image_url}
                                            alt={person.name}
                                            className="dash-leader-avatar"
                                        />
                                    ) : (
                                        <div className="dash-leader-avatar dash-leader-avatar-fallback">
                                            {person.initials || getInitials(person.name)}
                                        </div>
                                    )}

                                    {rank <= 3 ? (
                                        <span className={`dash-leader-avatar-badge rank-${rank}`}>
                                            {rank}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="dash-leader-user-copy">
                                    <div className="dash-leader-name">{person.name}</div>
                                    <div className="dash-leader-sub">{person.department}</div>
                                </div>
                            </div>

                            <div className="dash-leader-completed">
                                <strong>{safeNumber(person.completed_this_month)}</strong> tasks
                            </div>

                            <div className="dash-leader-department">{person.department}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}   

function SnapshotLinks({ snapshots }) {
    if (!snapshots.length) {
        return <div className="dash-empty-box">No report snapshots available.</div>;
    }

    return (
        <div className="dash-snapshot-list">
            {snapshots.map((snap) => {
                const total = safeNumber(snap?.data?.total);
                const completed = safeNumber(snap?.data?.completed);
                const overdue = safeNumber(snap?.data?.overdue);
                const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                    <a key={snap.label} href={snap.href} className="dash-snapshot-card">
                        <div className="dash-snapshot-top">
                            <div>
                                <div className="dash-snapshot-title">{snap.label}</div>
                                <div className="dash-snapshot-sub">{snap.sub}</div>
                            </div>

                            <div className="dash-snapshot-score">
                                <div className="dash-snapshot-rate">{rate}%</div>
                                <div className="dash-snapshot-rate-label">completion</div>
                            </div>
                        </div>

                        <div className="dash-snapshot-meta">
                            <span>
                                <strong>{total}</strong> total
                            </span>
                            <span>
                                <strong>{completed}</strong> completed
                            </span>
                            <span>
                                <strong>{overdue}</strong> overdue
                            </span>
                        </div>
                    </a>
                );
            })}
        </div>
    );
}

function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        fetch("php/get_dashboard.php", { signal: controller.signal })
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
                    setError(err.message || "Unable to load dashboard data.");
                }
            })
            .finally(() => setLoading(false));

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

    const orgHealth = data?.org_health ?? {
        ongoing: 0,
        overdue: 0,
        completed_today: 0,
        overall_rate: 0,
        total_active: 0
    };

    const taskStatusTrend = data?.task_status_trend ?? {};
    const overdueFallback = Array.isArray(data?.overdue_trend) ? data.overdue_trend : [];

    const seriesMap = {
        completed: Array.isArray(taskStatusTrend.completed) ? taskStatusTrend.completed : [],
        ongoing: Array.isArray(taskStatusTrend.ongoing) ? taskStatusTrend.ongoing : [],
        overdue:
            Array.isArray(taskStatusTrend.overdue) && taskStatusTrend.overdue.length
                ? taskStatusTrend.overdue
                : overdueFallback
    };

    const atRisk = Array.isArray(data?.at_risk) ? data.at_risk : [];
    const topPerformers = Array.isArray(data?.top_performers) ? data.top_performers : [];
    const snapshots = Array.isArray(data?.snapshots) ? data.snapshots : [];
    const monthLabel = data?.month_label ?? "This month";

    const totalActive = safeNumber(orgHealth.total_active);
    const completedToday = safeNumber(orgHealth.completed_today);
    const ongoing = safeNumber(orgHealth.ongoing);
    const overdue = safeNumber(orgHealth.overdue);
    const overallRate = safeNumber(orgHealth.overall_rate);

    return (
        <div className="dash-page">
            <div className="dash-shell">
                <section className="dash-card dash-chart-card">
                    <TrendChart seriesMap={seriesMap} periodLabel="This week" />
                </section>

                <div className="dash-grid">
                    <section className="dash-card">
                        <div className="dash-section-head">
                            <div>
                                <div className="dash-card-title">Organization Health</div>
                                <div className="dash-card-subtitle">
                                    A cleaner overview of the same live task metrics.
                                </div>
                            </div>
                            <div className="dash-pill">{overallRate}% rate</div>
                        </div>

                        <div className="dash-health-layout">
                            <HealthRing
                                ongoing={ongoing}
                                overdue={overdue}
                                completedToday={completedToday}
                                totalActive={totalActive}
                            />
                        </div>

                        <div className="dash-divider"></div>

                        <div className="dash-section-head dash-section-head-tight">
                            <div>
                                <div className="dash-card-title">Departments at Risk</div>
                                <div className="dash-card-subtitle">
                                    Ranked by overdue rate for fair comparison.
                                </div>
                            </div>
                        </div>

                        <RiskList rows={atRisk} />
                    </section>

                    <section className="dash-card">
                        <div className="dash-section-head">
                            <div>
                            <div className="dash-card-title">Top Performers</div>
                            <div className="dash-card-subtitle">
                                Staff with the most completed tasks for {monthLabel}.
                            </div>
                            </div>
                            <div className="dash-pill">{monthLabel}</div>
                        </div>

                        <TopPerformersTable rows={topPerformers} monthLabel={monthLabel} />

                        <div className="dash-divider"></div>

                        <div className="dash-section-head dash-section-head-tight">
                            <div>
                                <div className="dash-card-title">Report Snapshots</div>
                                <div className="dash-card-subtitle">
                                    Monitor completion status and access full reports.
                                </div>
                            </div>
                        </div>

                        <SnapshotLinks snapshots={snapshots} />
                    </section>
                </div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);