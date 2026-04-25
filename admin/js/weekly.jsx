const { useEffect, useMemo, useRef, useState } = React;

const MANILA_TZ = "Asia/Manila";


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

function makeLineDataset(label, data, color, themeMode, fillAlpha = 0.16) {
    const theme = chartTheme(themeMode);

    return {
        label,
        data,
        borderColor: color,
        backgroundColor: (context) => chartAreaGradient(context, color, fillAlpha, 0),
        pointBackgroundColor: color,
        pointBorderColor: theme.cardBg,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: theme.cardBg,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBorderWidth: 2,
        borderWidth: 2.2,
        tension: 0.42,
        fill: true
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

function loadChartJs() {
    if (window.Chart) {
        return Promise.resolve(window.Chart);
    }

    if (window.__weeklyChartJsPromise) {
        return window.__weeklyChartJsPromise;
    }

    window.__weeklyChartJsPromise = new Promise((resolve, reject) => {
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

    return window.__weeklyChartJsPromise;
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

function getWeekStart(offsetWeeks = 0) {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function weekDayLabels(monday) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((d, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return `${d} ${date.getDate()}`;
    });
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

function EmployeeTaskModal({ emp, weekStart, weekEnd, onClose }) {
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

        const start = formatDate(weekStart);
        const end = formatDate(weekEnd);

        fetch(
            `php/get_employee_tasks_weekly.php?employee_id=${emp.id}&week_start=${start}&week_end=${end}`
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
    }, [emp.id, weekStart, weekEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const weekLabel = `${formatDisplayDate(weekStart)} — ${formatDisplayDate(weekEnd)}`;

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
                    aria-label={`${emp.name} weekly tasks`}
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
                                    {emp.department} · {weekLabel}
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
                            <div className="dr-empty-state">No matching tasks found for this week.</div>
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

function DepartmentTaskModal({ dept, weekStart, weekEnd, onClose }) {
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

        const start = formatDate(weekStart);
        const end = formatDate(weekEnd);

        fetch(
            `php/get_department_tasks_report.php?department_id=${dept.department_id}&week_start=${start}&week_end=${end}`
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
    }, [dept.department_id, weekStart, weekEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const weekLabel = `${formatDisplayDate(weekStart)} — ${formatDisplayDate(weekEnd)}`;

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
                aria-label={`${dept.department} weekly tasks`}
            >
                <div className="dr-modal-head">
                    <div>
                        <h5 className="dr-modal-title">{dept.department}</h5>
                        <div className="dr-modal-subtitle">
                            Department tasks · {weekLabel}
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

                                            <div className="wr-task-assignee">
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

function WeeklyReportPage() {
    const [summary, setSummary] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        overdue: 0
    });
    const [employees, setEmployees] = useState([]);
    const [dailyTrend, setDailyTrend] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [modalDept, setModalDept] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [themeMode, setThemeMode] = useState(getThemeMode());
    const [deptOpen, setDeptOpen] = useState(false);

    const deptDropdownRef = useRef(null);
    const trendChartRef = useRef(null);
    const donutChartRef = useRef(null);
    const deptChartRef = useRef(null);

    const trendChart = useRef(null);
    const donutChart = useRef(null);
    const deptChart = useRef(null);

    const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
    const weekEnd = useMemo(() => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + 6);
        return d;
    }, [weekStart]);

    useEffect(() => {
        fetch("php/get_departments.php")
            .then((res) => res.json())
            .then((data) => setAllDepartments(Array.isArray(data) ? data : []))
            .catch(() => setAllDepartments([]));
    }, []);

    useEffect(() => {
        setSelectedEmp(null);
        setModalEmp(null);
        setModalDept(null);
        setLoading(true);
        setError("");

        const start = formatDate(weekStart);
        const end = formatDate(weekEnd);

        fetch(
            `php/get_weekly_report.php?department=${departmentFilter}&week_start=${start}&week_end=${end}`
        )
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setEmployees(Array.isArray(data.employees) ? data.employees : []);
                setDailyTrend(Array.isArray(data.daily_trend) ? data.daily_trend : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Failed to load report: ${err.message}`);
                setLoading(false);
            });
    }, [departmentFilter, weekOffset, weekStart, weekEnd]);

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
        function handleClickOutside(e) {
            if (
                deptDropdownRef.current &&
                !deptDropdownRef.current.contains(e.target)
            ) {
                setDeptOpen(false);
            }
        }

        function handleEscape(e) {
            if (e.key === "Escape") {
                setDeptOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const weekLabel = `${formatDisplayDate(weekStart)} — ${formatDisplayDate(weekEnd)}`;

    const departmentFilterLabel = useMemo(() => {
        if (departmentFilter === "all") return "All Departments";
        const found = allDepartments.find((dep) => String(dep.id) === String(departmentFilter));
        return found?.name || "Selected Department";
    }, [departmentFilter, allDepartments]);

    const employeeRows = useMemo(
        () =>
            employees.map((emp) => {
                const completed = safeNum(emp.completed);
                const ongoing = safeNum(emp.ongoing);
                const overdue = safeNum(emp.overdue);
                const total = completed + ongoing + overdue;
                const daily = Array.isArray(emp.daily_trend) ? emp.daily_trend : [];

                return {
                    ...emp,
                    completed,
                    ongoing,
                    overdue,
                    total,
                    completionRate: pct(completed, total),
                    daily_trend: daily
                };
            }),
        [employees]
    );

    const scopedSummary = useMemo(() => {
        if (!selectedEmp) {
            return {
                total: safeNum(summary.total),
                completed: safeNum(summary.completed),
                ongoing: safeNum(summary.ongoing),
                overdue: safeNum(summary.overdue)
            };
        }

        return {
            total: safeNum(selectedEmp.total),
            completed: safeNum(selectedEmp.completed),
            ongoing: safeNum(selectedEmp.ongoing),
            overdue: safeNum(selectedEmp.overdue)
        };
    }, [summary, selectedEmp]);

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

    const trendLabels = useMemo(() => weekDayLabels(weekStart), [weekStart]);

    const trendSource = useMemo(() => {
        if (selectedEmp && Array.isArray(selectedEmp.daily_trend) && selectedEmp.daily_trend.length > 0) {
            return selectedEmp.daily_trend;
        }
        return dailyTrend;
    }, [selectedEmp, dailyTrend]);

    const trendCompleted = useMemo(() => trendSource.map((d) => safeNum(d.completed)), [trendSource]);
    const trendOngoing = useMemo(() => trendSource.map((d) => safeNum(d.ongoing)), [trendSource]);
    const trendOverdue = useMemo(() => trendSource.map((d) => safeNum(d.overdue)), [trendSource]);

    const departmentRows = useMemo(() => {
        const deptMap = {};

        employeeRows.forEach((emp) => {
            const key = emp.department;
            if (!deptMap[key]) {
                const found = allDepartments.find((dep) => dep.name === key);
                deptMap[key] = {
                    department: key,
                    department_id: found?.id ?? null,
                    completed: 0,
                    ongoing: 0,
                    overdue: 0,
                    total: 0
                };
            }

            deptMap[key].completed += emp.completed;
            deptMap[key].ongoing += emp.ongoing;
            deptMap[key].overdue += emp.overdue;
            deptMap[key].total += emp.total;
        });

        return Object.values(deptMap)
            .map((dept) => ({
                ...dept,
                completion_rate: pct(dept.completed, dept.total)
            }))
            .sort((a, b) => b.overdue - a.overdue);
    }, [employeeRows, allDepartments]);

    const deptLabels = useMemo(() => departmentRows.map((d) => d.department), [departmentRows]);
    const deptCompleted = useMemo(() => departmentRows.map((d) => d.completed), [departmentRows]);
    const deptOngoing = useMemo(() => departmentRows.map((d) => d.ongoing), [departmentRows]);
    const deptOverdue = useMemo(() => departmentRows.map((d) => d.overdue), [departmentRows]);

    useEffect(() => {
        let cancelled = false;

        loadChartJs().then(() => {
            if (cancelled || !trendChartRef.current || !window.Chart) return;

            if (trendChart.current) trendChart.current.destroy();

            const defaults = chartDefaults(themeMode);
            trendChart.current = new Chart(trendChartRef.current, {
                type: "line",
                data: {
                    labels: trendLabels,
                    datasets: [
                        makeLineDataset("Completed", trendCompleted, STATUS_COLORS.Completed, themeMode, 0.16),
                        makeLineDataset("Ongoing", trendOngoing, STATUS_COLORS.Ongoing, themeMode, 0.13),
                        makeLineDataset("Overdue", trendOverdue, STATUS_COLORS.Overdue, themeMode, 0.18)
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
                                    const comp = trendCompleted[idx] || 0;
                                    const total =
                                        comp +
                                        (trendOngoing[idx] || 0) +
                                        (trendOverdue[idx] || 0);

                                    return `Completion rate: ${pct(comp, total)}%`;
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
            if (trendChart.current) {
                trendChart.current.destroy();
                trendChart.current = null;
            }
        };
    }, [trendLabels, trendCompleted, trendOngoing, trendOverdue, themeMode]);

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
                    plugins: {
                        ...defaults.plugins,
                        legend: { ...defaults.plugins.legend, position: "bottom" },
                        tooltip: {
                            ...defaults.plugins.tooltip,
                            callbacks: {
                                afterLabel: (ctx) => {
                                    const dept = departmentRows[ctx.dataIndex];
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
    }, [deptLabels, deptCompleted, deptOngoing, deptOverdue, departmentRows, themeMode]);

    const isCurrentWeek = weekOffset === 0;

    function goToPrevWeek() {
        setWeekOffset((prev) => prev - 1);
    }

    function goToNextWeek() {
        if (!isCurrentWeek) {
            setWeekOffset((prev) => prev + 1);
        }
    }

    function goToCurrentWeek() {
        setWeekOffset(0);
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
                    <span>Loading weekly report…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dr-page">
            <div className="dr-card wr-toolbar-card">
                <div className="dr-card-head wr-toolbar-row">
                    <div>
                        <h5 className="dr-card-title">Weekly Task Report</h5>   
                    </div>

                    <div className="wr-toolbar-actions">
                        <div className="wr-period-nav">
                            <button className="dr-ghost-btn" onClick={goToPrevWeek}>
                                <i className="bi bi-chevron-left"></i>
                                <span>Prev</span>
                            </button>

                            <div className="wr-period-label">{weekLabel}</div>

                            <button
                                className="dr-ghost-btn"
                                onClick={goToNextWeek}
                                disabled={isCurrentWeek}
                            >
                                <span>Next</span>
                                <i className="bi bi-chevron-right"></i>
                            </button>

                            {!isCurrentWeek ? (
                                <button className="dr-filter-pill dr-filter-pill--button" onClick={goToCurrentWeek}>
                                    This Week
                                </button>
                            ) : null}
                        </div>

                        <div className="wr-dept-dropdown" ref={deptDropdownRef}>
                            <button
                                type="button"
                                className={`wr-dept-trigger ${deptOpen ? "is-open" : ""}`}
                                onClick={() => setDeptOpen((prev) => !prev)}
                                aria-haspopup="listbox"
                                aria-expanded={deptOpen}
                            >
                                <span className="wr-dept-trigger-left">
                                    <i className="bi bi-buildings"></i>
                                    <span>{departmentFilterLabel}</span>
                                </span>

                                <i className="bi bi-chevron-down wr-dept-chevron"></i>
                            </button>

                            {deptOpen ? (
                                <div className="wr-dept-menu" role="listbox">
                                    <button
                                        type="button"
                                        className={`wr-dept-option ${
                                            departmentFilter === "all" ? "is-selected" : ""
                                        }`}
                                        onClick={() => {
                                            setDepartmentFilter("all");
                                            setDeptOpen(false);
                                        }}
                                        role="option"
                                        aria-selected={departmentFilter === "all"}
                                    >
                                        All Departments
                                    </button>

                                    {allDepartments.map((dep) => (
                                        <button
                                            key={dep.id}
                                            type="button"
                                            className={`wr-dept-option ${
                                                String(departmentFilter) === String(dep.id)
                                                    ? "is-selected"
                                                    : ""
                                            }`}
                                            onClick={() => {
                                                setDepartmentFilter(String(dep.id));
                                                setDeptOpen(false);
                                            }}
                                            role="option"
                                            aria-selected={
                                                String(departmentFilter) === String(dep.id)
                                            }
                                        >
                                            {dep.name}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div className="dr-summary-grid">
                <SummaryCard
                    icon="bi-check2-circle"
                    label="Completed Tasks"
                    value={scopedSummary.completed}
                    subtext="Finished tasks in the selected week"
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
                    subtext={selectedEmp ? selectedEmp.name : departmentFilterLabel}
                    tone="primary"
                    meta={weekLabel}
                />
            </div>

            <div className="wr-top-grid">
                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Daily Task Trend</h5>
                            <div className="dr-card-subtitle">
                                {selectedEmp ? `${selectedEmp.name} daily trend` : `Week activity · ${departmentFilterLabel}`}
                            </div>
                        </div>

                        {selectedEmp ? (
                            <button
                                className="dr-filter-pill dr-filter-pill--button"
                                onClick={() => setSelectedEmp(null)}
                            >
                                Clear Selection
                            </button>
                        ) : (
                            <div className="dr-filter-pill">{weekLabel}</div>
                        )}
                    </div>

                    <div className="ar-chart-wrap wr-chart-lg"><canvas ref={trendChartRef}></canvas></div>
                </div>

                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Status Distribution</h5>
                            <div className="dr-card-subtitle">
                                {selectedEmp ? `${selectedEmp.name} summary` : "Weekly task status split"}
                            </div>
                        </div>

                        <div className="dr-filter-pill">
                            {selectedEmp ? "Selected Staff" : "All Staff"}
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

            <div className="dr-card wr-block-gap">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Department Comparison</h5>
                        <div className="dr-card-subtitle">
                            Completed, ongoing, and overdue per department this week
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {departmentRows.length} department{departmentRows.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div className="ar-chart-wrap wr-chart-md"><canvas ref={deptChartRef}></canvas></div>
            </div>

            <div className="dr-card dr-card--table dr-card--table-full wr-block-gap">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Department Details</h5>
                        <div className="dr-card-subtitle">
                            Click the eye icon to inspect weekly department tasks
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
                                    <td colSpan="7" className="dr-table-empty">
                                        No departments found for this week.
                                    </td>
                                </tr>
                            ) : (
                                departmentRows.map((dept, index) => (
                                    <tr key={`${dept.department}-${index}`}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <span className="wr-dept-name">{dept.department}</span>
                                        </td>
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
                                        <td style={{ textAlign: "center" }}>
                                            {dept.department_id ? (
                                                <button
                                                    className="dr-eye-btn"
                                                    title={`View ${dept.department} tasks`}
                                                    onClick={() => setModalDept(dept)}
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                            ) : (
                                                <span className="dr-empty-inline">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
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
                            Click a row to focus charts · click the eye icon to inspect weekly tasks and comments
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
                                        No employees found for this week.
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
                                                        src={buildAvatarFallbackUrl(emp.name)}
                                                        alt={`${emp.name} Profile`}
                                                        className="dr-assignee-avatar"
                                                    />
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
                                                                style={{ width: `${emp.completionRate}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="dr-performance-value">{emp.completionRate}%</span>
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
                                                    title={`View ${emp.name}'s tasks`}
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

            {modalDept ? (
                <DepartmentTaskModal
                    dept={modalDept}
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    onClose={() => setModalDept(null)}
                />
            ) : null}

            {modalEmp ? (
                <EmployeeTaskModal
                    emp={modalEmp}
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    onClose={() => setModalEmp(null)}
                />
            ) : null}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("weeklyReportRoot"));
root.render(<WeeklyReportPage />);