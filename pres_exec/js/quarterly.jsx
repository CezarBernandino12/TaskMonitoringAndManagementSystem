const { useEffect, useMemo, useRef, useState } = React;

const MANILA_TZ = "Asia/Manila";
const QUARTER_LABELS = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };
const QUARTER_RANGES = {
    1: "Jan – Mar",
    2: "Apr – Jun",
    3: "Jul – Sep",
    4: "Oct – Dec"
};


const STATUS_COLORS = {
    Completed: "#16a34a",
    Ongoing: "#2563eb",
    Overdue: "#f43f5e"
};

function hexToRgba(hex, alpha) {
    const clean = String(hex).replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function chartAreaGradient(context, color, topAlpha = 0.16, bottomAlpha = 0.02) {
    const chart = context.chart;
    const { ctx, chartArea } = chart;

    if (!chartArea) {
        return hexToRgba(color, topAlpha);
    }

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hexToRgba(color, topAlpha));
    gradient.addColorStop(0.62, hexToRgba(color, topAlpha * 0.36));
    gradient.addColorStop(1, hexToRgba(color, bottomAlpha));

    return gradient;
}

function barGradient(context, color) {
    const chart = context.chart;
    const { ctx, chartArea } = chart;

    if (!chartArea) {
        return color;
    }

    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, hexToRgba(color, 0.84));
    gradient.addColorStop(1, hexToRgba(color, 1));

    return gradient;
}

function chartTheme(themeMode) {
    const isDark = themeMode === "dark";

    return {
        isDark,
        axisColor: isDark ? "#a8b3c7" : "#7f8a9b",
        gridColor: isDark ? "rgba(255,255,255,0.08)" : "#edf1f7",
        cardBg: isDark ? "#131c2f" : "#ffffff",
        tooltipBg: isDark ? "#182235" : "#ffffff",
        tooltipBorder: isDark ? "rgba(255,255,255,0.10)" : "#e6ebf3",
        tooltipText: isDark ? "#f8fafc" : "#18263f"
    };
}

function chartDefaults(themeMode) {
    const theme = chartTheme(themeMode);

    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 8,
                right: 12,
                bottom: 2,
                left: 4
            }
        },
        interaction: {
            mode: "index",
            intersect: false
        },
        plugins: {
            legend: {
                position: "bottom",
                align: "center",
                labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    color: theme.axisColor,
                    padding: 22,
                    boxWidth: 8,
                    boxHeight: 8,
                    font: {
                        family: "Nunito, sans-serif",
                        size: 13,
                        weight: "800"
                    }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: theme.tooltipBg,
                borderColor: theme.tooltipBorder,
                borderWidth: 1,
                titleColor: theme.tooltipText,
                bodyColor: theme.tooltipText,
                footerColor: theme.tooltipText,
                padding: 12,
                cornerRadius: 14,
                displayColors: true,
                usePointStyle: true,
                titleFont: {
                    family: "Nunito, sans-serif",
                    size: 13,
                    weight: "900"
                },
                bodyFont: {
                    family: "Nunito, sans-serif",
                    size: 12,
                    weight: "800"
                },
                footerFont: {
                    family: "Nunito, sans-serif",
                    size: 11,
                    weight: "800"
                }
            }
        },
        elements: {
            line: {
                borderWidth: 2.2,
                tension: 0.42,
                capBezierPoints: true
            },
            point: {
                radius: 3,
                hoverRadius: 5,
                hitRadius: 10,
                borderWidth: 2
            },
            bar: {
                borderSkipped: false,
                borderRadius: 10
            }
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    drawBorder: false
                },
                border: {
                    display: false
                },
                ticks: {
                    color: theme.axisColor,
                    padding: 10,
                    maxRotation: 0,
                    autoSkip: true,
                    font: {
                        family: "Nunito, sans-serif",
                        size: 13,
                        weight: "850"
                    }
                }
            },
            y: {
                beginAtZero: true,
                grace: "6%",
                border: {
                    display: false
                },
                grid: {
                    color: theme.gridColor,
                    drawBorder: false,
                    lineWidth: 1
                },
                ticks: {
                    stepSize: 1,
                    padding: 10,
                    color: theme.axisColor,
                    font: {
                        family: "Nunito, sans-serif",
                        size: 13,
                        weight: "750"
                    },
                    callback: (value) => Number.isInteger(value) ? value : ""
                }
            }
        }
    };
}

function makeBarDataset(label, data, color, maxBarThickness = 28) {
    return {
        label,
        data,
        backgroundColor: (context) => barGradient(context, color),
        borderColor: color,
        borderWidth: 0,
        borderRadius: 10,
        borderSkipped: "bottom",
        maxBarThickness,
        categoryPercentage: 0.6,
        barPercentage: 0.72
    };
}

function getStackedRadius(datasetIndex, dataIndex, stackValues) {
    const value = safeNum(stackValues[datasetIndex]?.[dataIndex]);

    if (value <= 0) return 0;

    const hasAbove = stackValues
        .slice(datasetIndex + 1)
        .some((series) => safeNum(series?.[dataIndex]) > 0);

    const hasBelow = stackValues
        .slice(0, datasetIndex)
        .some((series) => safeNum(series?.[dataIndex]) > 0);

    return {
        topLeft: hasAbove ? 0 : 14,
        topRight: hasAbove ? 0 : 14,
        bottomLeft: hasBelow ? 0 : 4,
        bottomRight: hasBelow ? 0 : 4
    };
}

function makeStackedBarDataset(label, data, color, stackValues, datasetIndex, maxBarThickness = 28) {
    return {
        label,
        data,
        backgroundColor: (context) => barGradient(context, color),
        borderColor: color,
        borderWidth: 0,
        borderSkipped: false,
        borderRadius: (context) =>
            getStackedRadius(datasetIndex, context.dataIndex, stackValues),
        maxBarThickness,
        categoryPercentage: 0.58,
        barPercentage: 0.58
    };
}

function loadChartJs() {
    if (window.Chart) {
        return Promise.resolve(window.Chart);
    }

    if (window.__quarterlyChartJsPromise) {
        return window.__quarterlyChartJsPromise;
    }

    window.__quarterlyChartJsPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="chart.js"]');

        if (existing) {
            existing.addEventListener("load", () => resolve(window.Chart));
            existing.addEventListener("error", reject);
            if (window.Chart) resolve(window.Chart);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.async = true;
        script.onload = () => resolve(window.Chart);
        script.onerror = reject;
        document.head.appendChild(script);
    });

    return window.__quarterlyChartJsPromise;
}

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

function formatDateTimePH(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";

    return (
        new Intl.DateTimeFormat("en-PH", {
            timeZone: MANILA_TZ,
            month: "short",
            day: "numeric"
        }).format(date) +
        ", " +
        new Intl.DateTimeFormat("en-PH", {
            timeZone: MANILA_TZ,
            hour: "numeric",
            minute: "2-digit"
        }).format(date)
    );
}

function formatQuarterDisplay(year, quarter) {
    return `${QUARTER_LABELS[quarter]} ${year} (${QUARTER_RANGES[quarter]})`;
}

function getCurrentQuarter() {
    return Math.ceil((new Date().getMonth() + 1) / 3);
}

function getQuarterRange(year, quarter) {
    const qMonthStart = (quarter - 1) * 3 + 1;
    const qMonthEnd = qMonthStart + 2;
    const quarterStart = `${year}-${String(qMonthStart).padStart(2, "0")}-01`;
    const lastDay = new Date(year, qMonthEnd, 0).getDate();
    const quarterEnd = `${year}-${String(qMonthEnd).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    return { quarterStart, quarterEnd };
}

function getDerivedStatus(task) {
    if (task?.completed_at) return "Completed";
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

function initials(name) {
    return name
        ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
        : "?";
}

function avatarColor(name) {
    const hue = name
        ? [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
        : 220;
    return `hsl(${hue}, 55%, 86%)`;
}

function avatarTextColor(name) {
    const hue = name
        ? [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
        : 220;
    return `hsl(${hue}, 45%, 30%)`;
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

function TaskCommentModal({ task, recipientId, currentUserId, onClose }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [text, setText] = useState("");
    const [files, setFiles] = useState([]);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const fileRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        setLoading(true);
        setError("");

        fetch(`php/get_task_messages.php?task_id=${task.id}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setMessages(Array.isArray(data.messages) ? data.messages : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Could not load comments: ${err.message}`);
                setLoading(false);
            });
    }, [task.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    function handleSend() {
        const trimmed = text.trim();
        if (!trimmed && files.length === 0) return;

        setSending(true);
        setSendError("");

        const fd = new FormData();
        fd.append("task_id", task.id);
        fd.append("recipient_id", recipientId);
        fd.append("message", trimmed);

        files.forEach((file) => fd.append("attachments[]", file));

        fetch("php/send_task_message.php", {
            method: "POST",
            body: fd
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setMessages((prev) => [...prev, data.message]);
                setText("");
                setFiles([]);
                setSending(false);
            })
            .catch((err) => {
                setSendError(err.message || "Failed to send comment.");
                setSending(false);
            });
    }

    function handleFileChange(e) {
        const picked = Array.from(e.target.files || []);
        setFiles((prev) => {
            const existing = new Set(prev.map((f) => `${f.name}|${f.size}`));
            const fresh = picked.filter((f) => !existing.has(`${f.name}|${f.size}`));
            return [...prev, ...fresh];
        });
        e.target.value = "";
    }

    function removeFile(index) {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    }

    function fmtSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    const canSend = !sending && (text.trim().length > 0 || files.length > 0);

    return (
        <div
            className="dr-modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="dr-modal-card dr-comment-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Comments for ${task.title}`}
            >
                <div className="dr-modal-head">
                    <div>
                        <h5 className="dr-modal-title">
                            <i className="bi bi-chat-dots me-2"></i>
                            {task.title || "Task Comments"}
                        </h5>
                        <div className="dr-modal-subtitle">
                            {messages.length} comment{messages.length !== 1 ? "s" : ""}
                        </div>
                    </div>

                    <button className="dr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="dr-modal-body">
                    {loading ? (
                        <div className="dr-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading comments...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : messages.length === 0 ? (
                        <div className="dr-empty-state dr-chat-empty-state">
                            <div className="dr-chat-empty-icon">
                                <i className="bi bi-chat-quote-fill"></i>
                            </div>

                            <div className="dr-chat-empty-title">No comments yet</div>

                            <div className="dr-chat-empty-subtitle">
                                No comments yet. Be the first to reply.
                            </div>
                        </div>
                    ) : (
                        <div className="dr-comment-stream">
                            {messages.map((msg) => {
                                const isOwn = safeNum(msg.sender_id) === safeNum(currentUserId);

                                return (
                                    <div
                                        key={msg.id}
                                        className={`dr-comment-row ${isOwn ? "is-own" : ""}`}
                                    >
                                        <div
                                            className="dr-comment-avatar"
                                            style={{
                                                background: avatarColor(msg.sender_name),
                                                color: avatarTextColor(msg.sender_name)
                                            }}
                                        >
                                            {initials(msg.sender_name)}
                                        </div>

                                        <div className="dr-comment-bubble-wrap">
                                            <div className="dr-comment-meta">
                                                <span className="dr-comment-author">
                                                    {isOwn ? "You" : msg.sender_name}
                                                </span>
                                                <span className="dr-comment-time">
                                                    {formatDateTimePH(msg.time_sent)}
                                                </span>
                                            </div>

                                            {msg.message ? (
                                                <div className="dr-comment-bubble">
                                                    {msg.message}
                                                </div>
                                            ) : null}

                                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                                                <div className="dr-comment-attachments">
                                                    {msg.attachments.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={att.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="dr-file-chip"
                                                        >
                                                            <i className="bi bi-paperclip"></i>
                                                            <span>{att.file_name}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef}></div>
                        </div>
                    )}
                </div>

                <div className="dr-modal-foot dr-comment-foot">
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />

                    <div className="dr-comment-compose">
                        {sendError ? <div className="dr-comment-error">{sendError}</div> : null}

                        {files.length > 0 ? (
                            <div className="dr-file-chip-row">
                                {files.map((file, index) => (
                                    <div className="dr-file-chip is-staged" key={`${file.name}-${index}`}>
                                        <i className="bi bi-paperclip"></i>
                                        <span className="dr-file-chip-name">{file.name}</span>
                                        <span className="dr-file-chip-size">{fmtSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className="dr-file-chip-remove"
                                            onClick={() => removeFile(index)}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="dr-comment-compose-row">
                            <button
                                type="button"
                                className="dr-icon-btn"
                                onClick={() => fileRef.current?.click()}
                                disabled={sending}
                                title="Attach files"
                            >
                                <i className="bi bi-paperclip"></i>
                            </button>

                            <textarea
                                className="dr-compose-textarea"
                                rows="2"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Write a comment... (Ctrl+Enter to send)"
                            />

                            <button
                                type="button"
                                className="dr-ghost-btn dr-send-btn"
                                onClick={handleSend}
                                disabled={!canSend}
                            >
                                <i className="bi bi-send-fill"></i>
                                <span>{sending ? "Sending..." : "Send"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmployeeTaskModal({ emp, quarterStart, quarterEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [query, setQuery] = useState("");
    const [commentTask, setCommentTask] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        fetch("php/get_current_user.php")
            .then((res) => res.json())
            .then((data) => {
                if (data.id) setCurrentUserId(data.id);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        setError("");
        setTasks([]);
        setActiveTab("all");
        setQuery("");

        fetch(
            `php/get_employee_tasks_quarterly.php?employee_id=${emp.id}&week_start=${quarterStart}&week_end=${quarterEnd}`
        )
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
    }, [emp.id, quarterStart, quarterEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const quarterLabel = `${quarterStart} – ${quarterEnd}`;

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

    return (
        <>
            <div
                className="dr-modal-backdrop"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div
                    className="dr-modal-card dr-employee-task-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${emp.name} quarterly tasks`}
                >
                    <div className="dr-modal-head">
                        <div className="dr-modal-person">
                            <img
                                src={buildAvatarFallbackUrl(emp.name)}
                                alt={`${emp.name} Profile`}
                                className="dr-modal-avatar"
                            />
                            <div>
                                <h5 className="dr-modal-title">{emp.name}</h5>
                                <div className="dr-modal-subtitle">
                                    {emp.department} · {quarterLabel}
                                </div>
                            </div>
                        </div>

                        <button className="dr-icon-btn" onClick={onClose} aria-label="Close">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="dr-modal-toolbar dr-modal-toolbar--badges-only">
                        <div className="dr-pill-row dr-pill-row--clean">
                            {[
                                { key: "all", label: "All", count: annotatedTasks.length, tone: "neutral" },
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
                                        <span className="dr-pill-tab-label">{tab.label}</span>
                                        <span className="dr-pill-tab-count">{tab.count}</span>
                                    </button>
                                );
                            })}
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
                            <div className="dr-empty-state">No matching tasks found for this quarter.</div>
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

                                        if (
                                            task.days_until_deadline !== null &&
                                            task.days_until_deadline !== undefined
                                        ) {
                                            if (status === "Overdue") {
                                                deadlineMeta += ` · ${Math.abs(
                                                    task.days_until_deadline
                                                )} day${Math.abs(task.days_until_deadline) !== 1 ? "s" : ""} overdue`;
                                            } else if (status === "Ongoing") {
                                                deadlineMeta +=
                                                    task.days_until_deadline === 0
                                                        ? " · Due today"
                                                        : ` · ${task.days_until_deadline} day${
                                                              task.days_until_deadline !== 1 ? "s" : ""
                                                          } left`;
                                            } else if (status === "Completed" && task.completed_at) {
                                                deadlineMeta += ` · Done ${formatDatePH(
                                                    task.completed_at,
                                                    false
                                                )}`;
                                            }
                                        }
                                    }

                                    return (
                                        <div className="dr-task-item" key={task.id ?? idx}>
                                            <div className="dr-task-item-main">
                                                <div className="dr-task-item-title">
                                                    {task.title || "Untitled Task"}
                                                </div>

                                                {task.description ? (
                                                    <div className="dr-task-item-desc">
                                                        {task.description}
                                                    </div>
                                                ) : null}

                                                <div className="dr-task-item-meta">{deadlineMeta}</div>
                                            </div>

                                            <div className="dr-task-item-side">
                                                <span className={`dr-status-inline ${statusClass}`}>
                                                    {status}
                                                </span>

                                                <span className={`dr-priority-inline ${priorityClass}`}>
                                                    <i className="bi bi-flag-fill"></i>
                                                    <span>{priorityText}</span>
                                                </span>

                                                <button
                                                    type="button"
                                                    className="dr-ghost-btn dr-comment-open-btn"
                                                    onClick={() => setCommentTask(task)}
                                                >
                                                    <i className="bi bi-chat-dots"></i>
                                                    <span>Comments</span>
                                                </button>
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

            {commentTask ? (
                <TaskCommentModal
                    task={commentTask}
                    recipientId={emp.id}
                    currentUserId={currentUserId}
                    onClose={() => setCommentTask(null)}
                />
            ) : null}
        </>
    );
}

function DepartmentTaskModal({ dept, quarterStart, quarterEnd, onClose }) {
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

        fetch(
            `php/get_department_tasks_report.php?department_id=${dept.department_id}&week_start=${quarterStart}&week_end=${quarterEnd}`
        )
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
    }, [dept.department_id, quarterStart, quarterEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const quarterLabel = `${quarterStart} – ${quarterEnd}`;

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
            const assignee = String(task?.assigned_to_name || "").toLowerCase();
            const priority = String(task?.priority || "").toLowerCase();
            const status = String(task?.derivedStatus || "").toLowerCase();

            return (
                title.includes(term) ||
                description.includes(term) ||
                assignee.includes(term) ||
                priority.includes(term) ||
                status.includes(term)
            );
        });
    }, [annotatedTasks, activeTab, query]);

    const countFor = (status) =>
        annotatedTasks.filter((task) => task.derivedStatus === status).length;

    return (
        <div
            className="dr-modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="dr-modal-card dr-employee-task-modal dr-department-task-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${dept.department} quarterly tasks`}
            >
                <div className="dr-modal-head">
                    <div>
                        <h5 className="dr-modal-title">{dept.department}</h5>
                        <div className="dr-modal-subtitle">
                            Department tasks · {quarterLabel}
                        </div>
                    </div>

                    <button className="dr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="dr-modal-toolbar dr-modal-toolbar--badges-only">
                    <div className="dr-pill-row dr-pill-row--clean">
                        {[
                            { key: "all", label: "All", count: annotatedTasks.length, tone: "neutral" },
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
                                    <span className="dr-pill-tab-label">{tab.label}</span>
                                    <span className="dr-pill-tab-count">{tab.count}</span>
                                </button>
                            );
                        })}
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
                        <div className="dr-empty-state">No matching department tasks found.</div>
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

                                    if (
                                        task.days_until_deadline !== null &&
                                        task.days_until_deadline !== undefined
                                    ) {
                                        if (status === "Overdue") {
                                            deadlineMeta += ` · ${Math.abs(
                                                task.days_until_deadline
                                            )} day${Math.abs(task.days_until_deadline) !== 1 ? "s" : ""} overdue`;
                                        } else if (status === "Ongoing") {
                                            deadlineMeta +=
                                                task.days_until_deadline === 0
                                                    ? " · Due today"
                                                    : ` · ${task.days_until_deadline} day${
                                                          task.days_until_deadline !== 1 ? "s" : ""
                                                      } left`;
                                        } else if (status === "Completed" && task.completed_at) {
                                            deadlineMeta += ` · Done ${formatDatePH(
                                                task.completed_at,
                                                false
                                            )}`;
                                        }
                                    }
                                }

                                return (
                                    <div className="dr-task-item" key={task.id ?? idx}>
                                        <div className="dr-task-item-main">
                                            <div className="dr-task-item-title">
                                                {task.title || "Untitled Task"}
                                            </div>

                                            {task.description ? (
                                                <div className="dr-task-item-desc">
                                                    {task.description}
                                                </div>
                                            ) : null}

                                            <div className="qr-task-assignee">
                                                <i className="bi bi-person"></i>
                                                <span>{task.assigned_to_name || "Unassigned"}</span>
                                            </div>

                                            <div className="dr-task-item-meta">{deadlineMeta}</div>
                                        </div>

                                        <div className="dr-task-item-side">
                                            <span className={`dr-status-inline ${statusClass}`}>
                                                {status}
                                            </span>

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

function QuarterlyReportPage() {
    const now = new Date();

    const [summary, setSummary] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        overdue: 0
    });
    const [departments, setDepartments] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [year, setYear] = useState(now.getFullYear());
    const [quarter, setQuarter] = useState(getCurrentQuarter());
    const [selectedDept, setSelectedDept] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [modalDept, setModalDept] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const deptChartRef = useRef(null);
    const monthlyChartRef = useRef(null);
    const donutChartRef = useRef(null);
    const employeeChartRef = useRef(null);

    const deptChart = useRef(null);
    const monthlyChart = useRef(null);
    const donutChart = useRef(null);
    const employeeChart = useRef(null);

    const { quarterStart, quarterEnd } = useMemo(
        () => getQuarterRange(year, quarter),
        [year, quarter]
    );

    const quarterLabel = formatQuarterDisplay(year, quarter);

    useEffect(() => {
        fetch("php/get_departments.php")
            .then((res) => res.json())
            .then((data) => setAllDepartments(Array.isArray(data) ? data : []))
            .catch(() => setAllDepartments([]));
    }, []);

    useEffect(() => {
        setSelectedDept(null);
        setModalEmp(null);
        setModalDept(null);
        setLoading(true);
        setError("");

        fetch(
            `php/get_quarterly_report.php?year=${year}&quarter=${quarter}&department=${departmentFilter}`
        )
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setDepartments(Array.isArray(data.departments) ? data.departments : []);
                setMonthlyTrend(Array.isArray(data.monthly_trend) ? data.monthly_trend : []);
                setEmployees(Array.isArray(data.employees) ? data.employees : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Failed to load report: ${err.message}`);
                setLoading(false);
            });
    }, [year, quarter, departmentFilter]);

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

    const departmentFilterLabel = useMemo(() => {
        if (departmentFilter === "all") return "All Departments";
        const found = allDepartments.find((dep) => String(dep.id) === String(departmentFilter));
        return found?.name || "Selected Department";
    }, [departmentFilter, allDepartments]);

    const departmentRows = useMemo(
        () =>
            departments.map((dept) => ({
                ...dept,
                total: safeNum(dept.total),
                completed: safeNum(dept.completed),
                ongoing: safeNum(dept.ongoing),
                overdue: safeNum(dept.overdue),
                completion_rate: safeNum(dept.completion_rate)
            })),
        [departments]
    );

    const employeesInScope = useMemo(() => {
        if (!selectedDept) return employees;
        return employees.filter((emp) => String(emp.department) === String(selectedDept.department));
    }, [employees, selectedDept]);

    const employeeRows = useMemo(
        () =>
            employeesInScope.map((emp) => {
                const completed = safeNum(emp.completed);
                const ongoing = safeNum(emp.ongoing);
                const overdue = safeNum(emp.overdue);
                const total = safeNum(emp.total) || completed + ongoing + overdue;

                return {
                    ...emp,
                    completed,
                    ongoing,
                    overdue,
                    total,
                    completion_rate: safeNum(emp.completion_rate) || pct(completed, total)
                };
            }),
        [employeesInScope]
    );

    const scopedSummary = useMemo(() => {
        if (!selectedDept) {
            return {
                total: safeNum(summary.total),
                completed: safeNum(summary.completed),
                ongoing: safeNum(summary.ongoing),
                overdue: safeNum(summary.overdue)
            };
        }

        return {
            total: safeNum(selectedDept.total),
            completed: safeNum(selectedDept.completed),
            ongoing: safeNum(selectedDept.ongoing),
            overdue: safeNum(selectedDept.overdue)
        };
    }, [summary, selectedDept]);

    const scopedCompletionRate = useMemo(
        () => pct(scopedSummary.completed, scopedSummary.total),
        [scopedSummary]
    );

    const deptChartRows = useMemo(() => {
        return selectedDept
            ? departmentRows.filter((d) => d.department_id === selectedDept.department_id)
            : departmentRows;
    }, [departmentRows, selectedDept]);

    const deptLabels = useMemo(() => deptChartRows.map((d) => d.department), [deptChartRows]);
    const deptCompleted = useMemo(() => deptChartRows.map((d) => d.completed), [deptChartRows]);
    const deptOngoing = useMemo(() => deptChartRows.map((d) => d.ongoing), [deptChartRows]);
    const deptOverdue = useMemo(() => deptChartRows.map((d) => d.overdue), [deptChartRows]);

    const monthNames = useMemo(() => monthlyTrend.map((m) => m.month_name), [monthlyTrend]);
    const trendCompleted = useMemo(() => monthlyTrend.map((m) => safeNum(m.completed)), [monthlyTrend]);
    const trendOngoing = useMemo(() => monthlyTrend.map((m) => safeNum(m.ongoing)), [monthlyTrend]);
    const trendOverdue = useMemo(() => monthlyTrend.map((m) => safeNum(m.overdue)), [monthlyTrend]);

    const donutLegendData = useMemo(() => {
        const total = scopedSummary.total || 0;

        return [
            { label: "Completed", value: scopedSummary.completed, color: STATUS_COLORS.Completed },
            { label: "Ongoing", value: scopedSummary.ongoing, color: STATUS_COLORS.Ongoing },
            { label: "Overdue", value: scopedSummary.overdue, color: STATUS_COLORS.Overdue }
        ].map((item) => ({
            ...item,
            percent: pct(item.value, total)
        }));
    }, [scopedSummary]);

    const employeePerformanceRows = useMemo(
        () => [...employeeRows].sort((a, b) => b.completion_rate - a.completion_rate),
        [employeeRows]
    );

    const empNames = useMemo(() => employeePerformanceRows.map((e) => e.name), [employeePerformanceRows]);
    const empCompleted = useMemo(() => employeePerformanceRows.map((e) => e.completed), [employeePerformanceRows]);
    const empOverdue = useMemo(() => employeePerformanceRows.map((e) => e.overdue), [employeePerformanceRows]);

    useEffect(() => {
        let cancelled = false;

        loadChartJs().then(() => {
            if (cancelled || !deptChartRef.current || !window.Chart) return;

            if (deptChart.current) deptChart.current.destroy();

            const defaults = chartDefaults(themeMode);
            deptChart.current = new Chart(deptChartRef.current, {
                type: "bar",
                data: {
                    labels: deptLabels,
                    datasets: [
                        makeBarDataset("Completed", deptCompleted, STATUS_COLORS.Completed, 24),
                        makeBarDataset("Ongoing", deptOngoing, STATUS_COLORS.Ongoing, 24),
                        makeBarDataset("Overdue", deptOverdue, STATUS_COLORS.Overdue, 24)
                    ]
                },
                options: {
                    ...defaults,
                    onClick: (_event, elements) => {
                        if (!elements.length) return;

                        const clicked = deptChartRows[elements[0].index];
                        if (!clicked) return;

                        setSelectedDept((prev) =>
                            prev?.department_id === clicked.department_id ? null : clicked
                        );
                    },
                    plugins: {
                        ...defaults.plugins,
                        legend: { ...defaults.plugins.legend, position: "bottom" },
                        tooltip: {
                            ...defaults.plugins.tooltip,
                            callbacks: {
                                afterLabel: (ctx) => {
                                    const dept = deptChartRows[ctx.dataIndex];
                                    return dept ? `Completion rate: ${dept.completion_rate}%` : "";
                                }
                            }
                        }
                    },
                    scales: defaults.scales
                }
            });
        }).catch((err) => console.error("Chart.js failed to load:", err));

        return () => {
            cancelled = true;
            if (deptChart.current) {
                deptChart.current.destroy();
                deptChart.current = null;
            }
        };
    }, [deptLabels, deptCompleted, deptOngoing, deptOverdue, deptChartRows, themeMode]);

    useEffect(() => {
        let cancelled = false;

        loadChartJs().then(() => {
            if (cancelled || !monthlyChartRef.current || !window.Chart) return;

            if (monthlyChart.current) monthlyChart.current.destroy();

            const defaults = chartDefaults(themeMode);
            const monthlyStackValues = [trendCompleted, trendOngoing, trendOverdue];

            monthlyChart.current = new Chart(monthlyChartRef.current, {
                type: "bar",
                data: {
                    labels: monthNames,
                    datasets: [
                        makeStackedBarDataset(
                            "Completed",
                            trendCompleted,
                            STATUS_COLORS.Completed,
                            monthlyStackValues,
                            0,
                            28
                        ),
                        makeStackedBarDataset(
                            "Ongoing",
                            trendOngoing,
                            STATUS_COLORS.Ongoing,
                            monthlyStackValues,
                            1,
                            28
                        ),
                        makeStackedBarDataset(
                            "Overdue",
                            trendOverdue,
                            STATUS_COLORS.Overdue,
                            monthlyStackValues,
                            2,
                            28
                        )
                    ]
                },
                options: {
                    ...defaults,
                    plugins: {
                        ...defaults.plugins,
                        legend: { ...defaults.plugins.legend, position: "bottom" },
                        tooltip: {
                            ...defaults.plugins.tooltip,
                            callbacks: {
                                footer: (items) => {
                                    if (!items.length) return "";
                                    const idx = items[0].dataIndex;
                                    const completed = trendCompleted[idx] || 0;
                                    const total =
                                        completed +
                                        (trendOngoing[idx] || 0) +
                                        (trendOverdue[idx] || 0);

                                    return `Completion rate: ${pct(completed, total)}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ...defaults.scales.x,
                            stacked: true
                        },
                        y: {
                            ...defaults.scales.y,
                            stacked: true,
                            grace: "12%"
                        }
                    }
                }
            });
        }).catch((err) => console.error("Chart.js failed to load:", err));

        return () => {
            cancelled = true;
            if (monthlyChart.current) {
                monthlyChart.current.destroy();
                monthlyChart.current = null;
            }
        };
    }, [monthNames, trendCompleted, trendOngoing, trendOverdue, themeMode]);

    useEffect(() => {
        let cancelled = false;

        loadChartJs().then(() => {
            if (cancelled || !donutChartRef.current || !window.Chart) return;

            if (donutChart.current) donutChart.current.destroy();

            const theme = chartTheme(themeMode);
            donutChart.current = new Chart(donutChartRef.current, {
                type: "doughnut",
                data: {
                    labels: ["Completed", "Ongoing", "Overdue"],
                    datasets: [
                        {
                            data: [
                                safeNum(scopedSummary.completed),
                                safeNum(scopedSummary.ongoing),
                                safeNum(scopedSummary.overdue)
                            ],
                            backgroundColor: [
                                STATUS_COLORS.Completed,
                                STATUS_COLORS.Ongoing,
                                STATUS_COLORS.Overdue
                            ],
                            borderWidth: 5,
                            borderColor: theme.cardBg,
                            hoverOffset: 6,
                            borderRadius: 10
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "74%",
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...chartDefaults(themeMode).plugins.tooltip,
                            callbacks: {
                                label: (ctx) => {
                                    const val = safeNum(ctx.raw);
                                    return ` ${ctx.label}: ${val} (${pct(val, scopedSummary.total)}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }).catch((err) => console.error("Chart.js failed to load:", err));

        return () => {
            cancelled = true;
            if (donutChart.current) {
                donutChart.current.destroy();
                donutChart.current = null;
            }
        };
    }, [scopedSummary, themeMode]);

    useEffect(() => {
        let cancelled = false;

        loadChartJs().then(() => {
            if (cancelled || !employeeChartRef.current || !window.Chart) return;

            if (employeeChart.current) employeeChart.current.destroy();

            const defaults = chartDefaults(themeMode);
            employeeChart.current = new Chart(employeeChartRef.current, {
                type: "bar",
                data: {
                    labels: empNames,
                    datasets: [
                        makeBarDataset("Completed", empCompleted, STATUS_COLORS.Completed, 18),
                        makeBarDataset("Overdue", empOverdue, STATUS_COLORS.Overdue, 18)
                    ]
                },
                options: {
                    ...defaults,
                    indexAxis: "y",
                    plugins: {
                        ...defaults.plugins,
                        legend: { ...defaults.plugins.legend, position: "bottom" },
                        tooltip: {
                            ...defaults.plugins.tooltip,
                            callbacks: {
                                afterLabel: (ctx) => {
                                    const emp = employeePerformanceRows[ctx.dataIndex];
                                    return emp ? `Completion rate: ${emp.completion_rate}%` : "";
                                }
                            }
                        }
                    },
                    scales: {
                        x: defaults.scales.y,
                        y: defaults.scales.x
                    }
                }
            });
        }).catch((err) => console.error("Chart.js failed to load:", err));

        return () => {
            cancelled = true;
            if (employeeChart.current) {
                employeeChart.current.destroy();
                employeeChart.current = null;
            }
        };
    }, [empNames, empCompleted, empOverdue, employeePerformanceRows, themeMode]);

    const isCurrentQuarter =
        year === now.getFullYear() && quarter === getCurrentQuarter();

    function goToPrevQuarter() {
        if (quarter === 1) {
            setYear((y) => y - 1);
            setQuarter(4);
        } else {
            setQuarter((q) => q - 1);
        }
    }

    function goToNextQuarter() {
        if (quarter === 4) {
            setYear((y) => y + 1);
            setQuarter(1);
        } else {
            setQuarter((q) => q + 1);
        }
    }

    function goToCurrentQuarter() {
        setYear(now.getFullYear());
        setQuarter(getCurrentQuarter());
    }

    if (error) {
        return (
            <div className="dr-page">
                <div className="dr-error-card">
                    <h5>Report Error</h5>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="dr-page">
                <div className="dr-loading-card">
                    <div className="spinner-border me-2" role="status"></div>
                    <span>Loading quarterly report…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dr-page">
            <div className="dr-card qr-toolbar-card">
                <div className="dr-card-head qr-toolbar-row">
                    <div>
                        <h5 className="dr-card-title">Quarterly Task Report</h5>
                    </div>

                    <div className="qr-toolbar-actions">
                        <div className="qr-period-nav">
                            <button className="dr-ghost-btn" onClick={goToPrevQuarter}>
                                <i className="bi bi-chevron-left"></i>
                                <span>Prev</span>
                            </button>

                            <div className="qr-period-label">{quarterLabel}</div>

                            <button
                                className="dr-ghost-btn"
                                onClick={goToNextQuarter}
                                disabled={isCurrentQuarter}
                            >
                                <span>Next</span>
                                <i className="bi bi-chevron-right"></i>
                            </button>

                            {!isCurrentQuarter ? (
                                <button className="dr-filter-pill dr-filter-pill--button" onClick={goToCurrentQuarter}>
                                    This Quarter
                                </button>
                            ) : null}
                        </div>

                        <div className="dr-search-box dr-search-box--select qr-select-shell">
                            <i className="bi bi-buildings"></i>
                            <select
                                className="dr-select"
                                value={departmentFilter}
                                onChange={(e) => {
                                    setDepartmentFilter(e.target.value);
                                    setSelectedDept(null);
                                }}
                            >
                                <option value="all">All Departments</option>
                                {allDepartments.map((dep) => (
                                    <option key={dep.id} value={dep.id}>
                                        {dep.name}
                                    </option>
                                ))}
                            </select>
                            <i className="bi bi-chevron-down dr-select-chevron"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dr-summary-grid qr-summary-grid">
                <SummaryCard
                    icon="bi-check2-circle"
                    label="Completed Tasks"
                    value={scopedSummary.completed}
                    subtext="Finished tasks during the selected quarter"
                    tone="success"
                    meta={`${pct(scopedSummary.completed, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-arrow-repeat"
                    label="In Progress Tasks"
                    value={scopedSummary.ongoing}
                    subtext="Active tasks still underway"
                    tone="warning"
                    meta={`${pct(scopedSummary.ongoing, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-exclamation-circle"
                    label="Overdue Tasks"
                    value={scopedSummary.overdue}
                    subtext="Tasks that missed their deadline"
                    tone="danger"
                    meta={`${pct(scopedSummary.overdue, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-list-task"
                    label="Total Tasks"
                    value={scopedSummary.total}
                    subtext={selectedDept ? selectedDept.department : departmentFilterLabel}
                    tone="primary"
                    meta={quarterLabel}
                />
                <SummaryCard
                    icon="bi-graph-up-arrow"
                    label="Completion Rate"
                    value={`${scopedCompletionRate}%`}
                    subtext="Completed versus total tasks"
                    tone={scopedCompletionRate >= 70 ? "success" : scopedCompletionRate >= 40 ? "warning" : "danger"}
                    meta={selectedDept ? "Focused Department" : "Quarter Scope"}
                />
            </div>

            <div className="dr-card qr-block-gap">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Department Task Comparison</h5>
                        <div className="dr-card-subtitle">
                            Click a department bar or table row to focus the report
                        </div>
                    </div>

                    {selectedDept ? (
                        <button
                            className="dr-filter-pill dr-filter-pill--button"
                            onClick={() => setSelectedDept(null)}
                        >
                            Clear Selection
                        </button>
                    ) : (
                        <div className="dr-filter-pill">{departmentFilterLabel}</div>
                    )}
                </div>

                <div className="ar-chart-wrap qr-chart-lg"><canvas ref={deptChartRef}></canvas></div>
            </div>

            <div className="qr-split-grid">
                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Monthly Breakdown</h5>
                            <div className="dr-card-subtitle">
                                Task composition across the three months of {quarterLabel}
                            </div>
                        </div>

                        <div className="dr-filter-pill">{quarterLabel}</div>
                    </div>

                    <div className="ar-chart-wrap qr-chart-md"><canvas ref={monthlyChartRef}></canvas></div>
                </div>

                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Quarter Status Mix</h5>
                            <div className="dr-card-subtitle">
                                {selectedDept ? `${selectedDept.department} summary` : "Overall share of completed, ongoing, and overdue tasks"}
                            </div>
                        </div>

                        <div className="dr-filter-pill">
                            {selectedDept ? "Selected Department" : "All Departments"}
                        </div>
                    </div>

                    <div className="dr-donut-stack">
                        <div className="dr-donut-shell">
                            <canvas ref={donutChartRef} className="dr-donut-chart"></canvas>

                            <div className="dr-donut-center">
                                <span className="dr-donut-center-kicker">Total</span>
                                <div className="dr-donut-center-line">
                                    <strong className="dr-donut-center-value">
                                        {scopedSummary.total}
                                    </strong>
                                    <span className="dr-donut-center-unit">
                                        task{scopedSummary.total !== 1 ? "s" : ""}
                                    </span>
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

            <div className="dr-card qr-block-gap">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Employee Performance</h5>
                        <div className="dr-card-subtitle">
                            Sorted by completion rate
                            {selectedDept ? ` · ${selectedDept.department}` : ""}
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {employeePerformanceRows.length} employee{employeePerformanceRows.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div
                    className="ar-chart-wrap qr-chart-hbar"
                    style={{
                        height: `${Math.max(260, employeePerformanceRows.length * 42)}px`
                    }}
                >
                    <canvas ref={employeeChartRef}></canvas>
                </div>
            </div>

            <div className="dr-card dr-card--table dr-card--table-full qr-block-gap">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Department Details</h5>
                        <div className="dr-card-subtitle">
                            Click a row to focus the report · click the eye icon to inspect department tasks
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {departmentRows.length} department{departmentRows.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div className="dr-table-shell">
                    <table className="dr-table">
                        <thead>
                            <tr>
                                <th style={{ width: "52px" }}>#</th>
                                <th>Department</th>
                                <th style={{ width: "100px" }}>Total</th>
                                <th style={{ width: "110px" }}>Completed</th>
                                <th style={{ width: "110px" }}>Ongoing</th>
                                <th style={{ width: "98px" }}>Overdue</th>
                                <th style={{ width: "140px" }}>Completion Rate</th>
                                <th style={{ width: "70px", textAlign: "center" }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departmentRows.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="dr-table-empty">
                                        No departments found for this quarter.
                                    </td>
                                </tr>
                            ) : (
                                departmentRows.map((dept, index) => {
                                    const active = selectedDept?.department_id === dept.department_id;

                                    return (
                                        <tr
                                            key={dept.department_id}
                                            className={active ? "is-active" : ""}
                                            onClick={() =>
                                                setSelectedDept((prev) =>
                                                    prev?.department_id === dept.department_id ? null : dept
                                                )
                                            }
                                        >
                                            <td>{index + 1}</td>
                                            <td>
                                                <span className="qr-dept-name">{dept.department}</span>
                                            </td>
                                            <td>{dept.total}</td>
                                            <td>{dept.completed}</td>
                                            <td>{dept.ongoing}</td>
                                            <td className="dr-overdue-cell">{dept.overdue}</td>
                                            <td>
                                                {dept.total === 0 ? (
                                                    <span className="dr-empty-inline">No tasks yet</span>
                                                ) : (
                                                    <div className="dr-performance-cell">
                                                        <div className="dr-progress">
                                                            <div
                                                                className="dr-progress-bar"
                                                                style={{ width: `${dept.completion_rate}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="dr-performance-value">{dept.completion_rate}%</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                style={{ textAlign: "center" }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalDept(dept);
                                                }}
                                            >
                                                <button
                                                    className="dr-eye-btn"
                                                    title={`View ${dept.department} tasks`}
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

            <div className="dr-card dr-card--table dr-card--table-full">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Employee Details</h5>
                        <div className="dr-card-subtitle">
                            Click the eye icon to inspect quarterly tasks and comments
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {employeeRows.length} employee{employeeRows.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div className="dr-table-shell">
                    <table className="dr-table">
                        <thead>
                            <tr>
                                <th style={{ width: "52px" }}>#</th>
                                <th>Employee</th>
                                <th style={{ width: "150px" }}>Department</th>
                                <th style={{ width: "110px" }}>Completed</th>
                                <th style={{ width: "110px" }}>Ongoing</th>
                                <th style={{ width: "98px" }}>Overdue</th>
                                <th style={{ width: "140px" }}>Completion Rate</th>
                                <th style={{ width: "70px", textAlign: "center" }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employeeRows.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="dr-table-empty">
                                        No employees found for this scope.
                                    </td>
                                </tr>
                            ) : (
                                employeeRows.map((emp, index) => (
                                    <tr key={emp.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <div className="dr-assignee">
                                                <div
                                                    className="dr-assignee-avatar dr-assignee-avatar--fallback"
                                                    style={{
                                                        background: avatarColor(emp.name),
                                                        color: avatarTextColor(emp.name)
                                                    }}
                                                >
                                                    {initials(emp.name)}
                                                </div>
                                                <div className="dr-assignee-copy">
                                                    <span className="dr-assignee-name">{emp.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{emp.department}</td>
                                        <td>{emp.completed}</td>
                                        <td>{emp.ongoing}</td>
                                        <td className="dr-overdue-cell">{emp.overdue}</td>
                                        <td>
                                            {emp.total === 0 ? (
                                                <span className="dr-empty-inline">No tasks yet</span>
                                            ) : (
                                                <div className="dr-performance-cell">
                                                    <div className="dr-progress">
                                                        <div
                                                            className="dr-progress-bar"
                                                            style={{ width: `${emp.completion_rate}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="dr-performance-value">{emp.completion_rate}%</span>
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
                                            <button
                                                className="dr-eye-btn"
                                                title={`View ${emp.name}'s quarterly tasks`}
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalDept ? (
                <DepartmentTaskModal
                    dept={modalDept}
                    quarterStart={quarterStart}
                    quarterEnd={quarterEnd}
                    onClose={() => setModalDept(null)}
                />
            ) : null}

            {modalEmp ? (
                <EmployeeTaskModal
                    emp={modalEmp}
                    quarterStart={quarterStart}
                    quarterEnd={quarterEnd}
                    onClose={() => setModalEmp(null)}
                />
            ) : null}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("quarterlyReportRoot"));
root.render(<QuarterlyReportPage />);