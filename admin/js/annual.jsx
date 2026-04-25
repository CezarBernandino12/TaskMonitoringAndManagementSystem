// AnnualReportPage.jsx
// Updated Chart.js UI to match the provided reference screenshots:
// - soft grid lines
// - bottom centered dot legend
// - rounded gradient bars
// - smooth line curves
// - light gradient area fills
// - small white/card-bordered points

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

    return `${new Intl.DateTimeFormat("en-PH", {
        timeZone: MANILA_TZ,
        month: "short",
        day: "numeric"
    }).format(date)}, ${new Intl.DateTimeFormat("en-PH", {
        timeZone: MANILA_TZ,
        hour: "numeric",
        minute: "2-digit"
    }).format(date)}`;
}

function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(name) {
    return name
        ? String(name).split(" ").map((word) => word[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
        : "?";
}

function avatarColor(name) {
    const hue = name ? [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360 : 220;
    return `hsl(${hue}, 62%, 88%)`;
}

function avatarTextColor(name) {
    const hue = name ? [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360 : 220;
    return `hsl(${hue}, 52%, 30%)`;
}

function statusTone(status) {
    return {
        Completed: "completed",
        Ongoing: "ongoing",
        Overdue: "overdue"
    }[status] || "other";
}

function priorityTone(priority) {
    return {
        High: "high",
        Medium: "medium",
        Low: "low"
    }[priority] || "other";
}

function buildDeadlineText(task) {
    const status = task.derivedStatus || task.derived_status || task.status || "Other";
    const days = task.days_until_deadline;
    let text = task.deadline ? formatDatePH(task.deadline) : "No deadline";

    if (status === "Overdue" && days !== null && days !== undefined) {
        text += ` · ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
    } else if (status === "Ongoing" && days !== null && days !== undefined) {
        text += days === 0 ? " · Due today" : ` · ${days} day${days !== 1 ? "s" : ""} left`;
    } else if (status === "Completed" && task.completed_at) {
        text += ` · Done ${formatDatePH(task.completed_at, false)}`;
    }

    return text;
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
                borderRadius: 999
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

function renderProgress(rate, total) {
    if (total === 0) {
        return <span className="ar-empty-inline">No tasks yet</span>;
    }

    return (
        <div className="ar-performance-cell">
            <div className="ar-progress">
                <div
                    className="ar-progress-bar"
                    style={{ width: `${Math.max(0, Math.min(100, rate))}%` }}
                ></div>
            </div>
            <span className="ar-performance-value">{rate}%</span>
        </div>
    );
}

function SummaryCard({ icon, label, value, subtext, tone, meta }) {
    return (
        <div className="ar-summary-card">
            <div className="ar-summary-head">
                <div className={`ar-summary-icon ${tone}`}>
                    <i className={`bi ${icon}`}></i>
                </div>
                <span className={`ar-summary-chip ${tone}`}>{meta}</span>
            </div>

            <div className="ar-summary-label">{label}</div>

            <div className="ar-summary-value-line">
                <span className="ar-summary-value">{value}</span>
            </div>

            <div className="ar-summary-subtext">{subtext}</div>
        </div>
    );
}

function TaskCommentModal({ task, recipientId, currentUserId, onClose }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [text, setText] = useState("");
    const [files, setFiles] = useState([]);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState(null);
    const bottomRef = useRef(null);
    const fileRef = useRef(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
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

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed && files.length === 0) return;

        setSending(true);
        setSendError(null);

        const formData = new FormData();
        formData.append("task_id", task.id);
        formData.append("recipient_id", recipientId);
        formData.append("message", trimmed);
        files.forEach((file) => formData.append("attachments[]", file));

        fetch("php/send_task_message.php", { method: "POST", body: formData })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setMessages((prev) => [...prev, data.message]);
                setText("");
                setFiles([]);
                setSending(false);
            })
            .catch((err) => {
                setSendError(err.message);
                setSending(false);
            });
    };

    const handleFileChange = (e) => {
        const picked = Array.from(e.target.files || []);
        setFiles((prev) => {
            const existing = new Set(prev.map((file) => `${file.name}|${file.size}`));
            const fresh = picked.filter((file) => !existing.has(`${file.name}|${file.size}`));
            return [...prev, ...fresh];
        });
        e.target.value = "";
    };

    const canSend = !sending && (text.trim().length > 0 || files.length > 0);

    return (
        <div className="ar-modal-backdrop ar-comment-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ar-modal-card ar-comment-modal" role="dialog" aria-modal="true" aria-label="Task comments">
                <div className="ar-modal-head">
                    <div>
                        <h5 className="ar-modal-title ar-comment-title">
                            <i className="bi bi-chat-left-text-fill"></i>
                            <span>{task.title}</span>
                        </h5>
                        <div className="ar-modal-subtitle ar-comment-subtitle">
                            {messages.length} comment{messages.length !== 1 ? "s" : ""}
                        </div>
                    </div>

                    <button className="ar-icon-btn" onClick={onClose} aria-label="Close comments">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="ar-modal-body ar-comment-body">
                    {loading ? (
                        <div className="ar-empty-state">
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Loading comments...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : messages.length === 0 ? (
                        <div className="ar-empty-state ar-chat-empty-state">
                            <div className="ar-chat-empty-icon">
                                <i className="bi bi-chat-quote-fill"></i>
                            </div>
                            <div className="ar-chat-empty-title">No comments yet</div>
                            <div className="ar-chat-empty-subtitle">No comments yet. Be the first to reply.</div>
                        </div>
                    ) : (
                        <div className="ar-comment-stream">
                            {messages.map((msg) => {
                                const isOwn = msg.sender_id === currentUserId;
                                return (
                                    <div key={msg.id} className={`ar-comment-row ${isOwn ? "is-own" : ""}`}>
                                        <div
                                            className="ar-comment-avatar"
                                            style={{
                                                background: avatarColor(msg.sender_name),
                                                color: avatarTextColor(msg.sender_name)
                                            }}
                                        >
                                            {initials(msg.sender_name)}
                                        </div>

                                        <div className="ar-comment-bubble-wrap">
                                            <div className="ar-comment-meta">
                                                <span className="ar-comment-author">{isOwn ? "You" : msg.sender_name}</span>
                                                <span className="ar-comment-time">{formatDateTimePH(msg.time_sent)}</span>
                                            </div>

                                            {msg.message ? <div className="ar-comment-bubble">{msg.message}</div> : null}

                                            {msg.attachments && msg.attachments.length > 0 ? (
                                                <div className="ar-comment-attachments">
                                                    {msg.attachments.map((attachment) => (
                                                        <a
                                                            key={attachment.id}
                                                            className="ar-file-chip"
                                                            href={attachment.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <i className="bi bi-paperclip"></i>
                                                            <span className="ar-file-chip-name">{attachment.file_name}</span>
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

                <div className="ar-modal-foot ar-comment-foot">
                    <div className="ar-comment-compose">
                        {sendError ? <div className="ar-comment-error">{sendError}</div> : null}

                        {files.length > 0 ? (
                            <div className="ar-file-chip-row">
                                {files.map((file, index) => (
                                    <div className="ar-file-chip is-staged" key={`${file.name}-${file.size}-${index}`}>
                                        <i className="bi bi-paperclip"></i>
                                        <span className="ar-file-chip-name">{file.name}</span>
                                        <span className="ar-file-chip-size">{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className="ar-file-chip-remove"
                                            onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="ar-comment-compose-row">
                            <input ref={fileRef} type="file" multiple hidden onChange={handleFileChange} />
                            <button
                                type="button"
                                className="ar-icon-btn ar-attach-btn"
                                onClick={() => fileRef.current?.click()}
                                disabled={sending}
                                title="Attach files"
                            >
                                <i className="bi bi-paperclip"></i>
                                {files.length > 0 ? <span className="ar-attach-count">{files.length}</span> : null}
                            </button>

                            <textarea
                                className="ar-compose-textarea"
                                rows={1}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Write a comment..."
                            ></textarea>

                            <button className="ar-ghost-btn ar-send-btn" onClick={handleSend} disabled={!canSend}>
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

function EmployeeTaskModal({ emp, yearStart, yearEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
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
        setError(null);
        setTasks([]);
        setActiveTab("all");

        fetch(`php/get_employee_tasks_annual.php?employee_id=${emp.id}&year_start=${yearStart}&year_end=${yearEnd}`)
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
    }, [emp.id, yearStart, yearEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const annotated = useMemo(
        () => tasks.map((task) => ({ ...task, derivedStatus: task.derived_status ?? task.status })),
        [tasks]
    );

    const counts = useMemo(
        () => ({
            all: annotated.length,
            Completed: annotated.filter((task) => task.derivedStatus === "Completed").length,
            Ongoing: annotated.filter((task) => task.derivedStatus === "Ongoing").length,
            Overdue: annotated.filter((task) => task.derivedStatus === "Overdue").length
        }),
        [annotated]
    );

    const filtered = activeTab === "all" ? annotated : annotated.filter((task) => task.derivedStatus === activeTab);

    return (
        <div className="ar-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ar-modal-card ar-employee-task-modal" role="dialog" aria-modal="true" aria-label={`${emp.name} tasks`}>
                <div className="ar-modal-head">
                    <div className="ar-modal-person">
                        <img
                            src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                            alt={`${emp.name} Profile`}
                            className="ar-modal-avatar"
                        />
                        <div>
                            <h5 className="ar-modal-title">{emp.name}</h5>
                            <div className="ar-modal-subtitle">{emp.department} · {yearStart.slice(0, 4)}</div>
                        </div>
                    </div>

                    <button className="ar-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="ar-modal-toolbar ar-modal-toolbar--badges-only">
                    <div className="ar-pill-row ar-pill-row--clean">
                        {[
                            { key: "all", label: "All", count: counts.all, tone: "neutral" },
                            { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                            { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                            { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`ar-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span className="ar-pill-tab-label">{tab.label}</span>
                                <span className="ar-pill-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ar-modal-body">
                    {loading ? (
                        <div className="ar-empty-state">
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="ar-empty-state">No {activeTab === "all" ? "" : activeTab.toLowerCase() + " "}tasks found for this year.</div>
                    ) : (
                        <div className="ar-task-list">
                            {filtered.map((task, idx) => {
                                const status = task.derivedStatus || "Other";
                                const priority = task.priority || "Other";
                                return (
                                    <div className="ar-task-item" key={task.id ?? idx}>
                                        <div className="ar-task-main">
                                            <div className="ar-task-title">{task.title}</div>
                                            {task.description ? <div className="ar-task-desc">{task.description}</div> : null}
                                            <div className="ar-task-meta">{buildDeadlineText(task)}</div>
                                        </div>

                                        <div className="ar-task-side">
                                            <span className={`ar-status-inline ${statusTone(status)}`}>{status}</span>
                                            <span className={`ar-priority-inline ${priorityTone(priority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                <span>{priority}</span>
                                            </span>
                                            <button className="ar-ghost-btn ar-comment-open-btn" onClick={() => setCommentTask(task)}>
                                                <i className="bi bi-chat-left-text"></i>
                                                Comments
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="ar-modal-foot">
                    <button className="ar-ghost-btn" onClick={onClose}>Close</button>
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
        </div>
    );
}

function DepartmentTaskModal({ dept, yearStart, yearEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab("all");

        fetch(`php/get_department_tasks_report.php?department_id=${dept.department_id}&week_start=${yearStart}&week_end=${yearEnd}`)
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
    }, [dept.department_id, yearStart, yearEnd]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const annotated = useMemo(
        () => tasks.map((task) => ({ ...task, derivedStatus: task.derived_status ?? task.status })),
        [tasks]
    );

    const counts = useMemo(
        () => ({
            all: annotated.length,
            Completed: annotated.filter((task) => task.derivedStatus === "Completed").length,
            Ongoing: annotated.filter((task) => task.derivedStatus === "Ongoing").length,
            Overdue: annotated.filter((task) => task.derivedStatus === "Overdue").length
        }),
        [annotated]
    );

    const filtered = activeTab === "all" ? annotated : annotated.filter((task) => task.derivedStatus === activeTab);

    return (
        <div className="ar-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ar-modal-card ar-employee-task-modal ar-dept-task-modal" role="dialog" aria-modal="true" aria-label={`${dept.department} tasks`}>
                <div className="ar-modal-head">
                    <div className="ar-modal-person">
                        <div className="ar-modal-avatar ar-modal-avatar--dept">
                            <i className="bi bi-buildings"></i>
                        </div>
                        <div>
                            <h5 className="ar-modal-title">{dept.department}</h5>
                            <div className="ar-modal-subtitle">Department tasks · {yearStart.slice(0, 4)}</div>
                        </div>
                    </div>

                    <button className="ar-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="ar-modal-toolbar ar-modal-toolbar--badges-only">
                    <div className="ar-pill-row ar-pill-row--clean">
                        {[
                            { key: "all", label: "All", count: counts.all, tone: "neutral" },
                            { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                            { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                            { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`ar-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span className="ar-pill-tab-label">{tab.label}</span>
                                <span className="ar-pill-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ar-modal-body">
                    {loading ? (
                        <div className="ar-empty-state">
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="ar-empty-state">No {activeTab === "all" ? "" : activeTab.toLowerCase() + " "}tasks found for this department.</div>
                    ) : (
                        <div className="ar-task-list">
                            {filtered.map((task, idx) => {
                                const status = task.derivedStatus || "Other";
                                const priority = task.priority || "Other";
                                return (
                                    <div className="ar-task-item" key={task.id ?? idx}>
                                        <div className="ar-task-main">
                                            <div className="ar-task-title">{task.title}</div>
                                            {task.description ? <div className="ar-task-desc">{task.description}</div> : null}
                                            <div className="ar-task-meta">
                                                {task.assigned_to_name ? `Assigned to ${task.assigned_to_name} · ` : ""}
                                                {buildDeadlineText(task)}
                                            </div>
                                        </div>

                                        <div className="ar-task-side">
                                            <span className={`ar-status-inline ${statusTone(status)}`}>{status}</span>
                                            <span className={`ar-priority-inline ${priorityTone(priority)}`}>
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

                <div className="ar-modal-foot">
                    <button className="ar-ghost-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function AnnualReportPage() {
    const now = new Date();

    const [summary, setSummary] = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [departments, setDepartments] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [quarterlyTrend, setQuarterlyTrend] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [year, setYear] = useState(now.getFullYear());
    const [selectedDept, setSelectedDept] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [modalDept, setModalDept] = useState(null);
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const groupedBarRef = useRef(null);
    const lineRef = useRef(null);
    const quarterBarRef = useRef(null);
    const donutRef = useRef(null);
    const hBarRef = useRef(null);

    const groupedBarChart = useRef(null);
    const lineChart = useRef(null);
    const quarterBarChart = useRef(null);
    const donutChart = useRef(null);
    const hBarChart = useRef(null);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => setThemeMode(getThemeMode()));
        observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
        return () => observer.disconnect();
    }, []);

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

        fetch(`php/get_annual_report.php?year=${year}&department=${departmentFilter}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    console.error("PHP error:", data.error);
                    return;
                }

                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setDepartments(data.departments ?? []);
                setQuarterlyTrend(data.quarterly_trend ?? []);
                setMonthlyTrend(data.monthly_trend ?? []);
                setEmployees(data.employees ?? []);
            })
            .catch((err) => console.error(err));
    }, [year, departmentFilter]);

    const chartDepts = useMemo(
        () => selectedDept ? departments.filter((dept) => dept.department_id === selectedDept.department_id) : departments,
        [departments, selectedDept]
    );

    const deptLabels = useMemo(() => chartDepts.map((dept) => dept.department), [chartDepts]);
    const deptCompleted = useMemo(() => chartDepts.map((dept) => safeNum(dept.completed)), [chartDepts]);
    const deptOngoing = useMemo(() => chartDepts.map((dept) => safeNum(dept.ongoing)), [chartDepts]);
    const deptOverdue = useMemo(() => chartDepts.map((dept) => safeNum(dept.overdue)), [chartDepts]);

    const monthNames = useMemo(() => monthlyTrend.map((month) => month.month_name), [monthlyTrend]);
    const lineCompleted = useMemo(() => monthlyTrend.map((month) => safeNum(month.completed)), [monthlyTrend]);
    const lineOngoing = useMemo(() => monthlyTrend.map((month) => safeNum(month.ongoing)), [monthlyTrend]);
    const lineOverdue = useMemo(() => monthlyTrend.map((month) => safeNum(month.overdue)), [monthlyTrend]);

    const quarterLabels = useMemo(() => quarterlyTrend.map((quarter) => quarter.quarter_label), [quarterlyTrend]);
    const qCompleted = useMemo(() => quarterlyTrend.map((quarter) => safeNum(quarter.completed)), [quarterlyTrend]);
    const qOngoing = useMemo(() => quarterlyTrend.map((quarter) => safeNum(quarter.ongoing)), [quarterlyTrend]);
    const qOverdue = useMemo(() => quarterlyTrend.map((quarter) => safeNum(quarter.overdue)), [quarterlyTrend]);

    const empSorted = useMemo(
        () => [...employees].sort((a, b) => safeNum(b.completion_rate) - safeNum(a.completion_rate)),
        [employees]
    );
    const empNames = useMemo(() => empSorted.map((emp) => emp.name), [empSorted]);
    const empCompleted = useMemo(() => empSorted.map((emp) => safeNum(emp.completed)), [empSorted]);
    const empOverdue = useMemo(() => empSorted.map((emp) => safeNum(emp.overdue)), [empSorted]);

    const summaryTotal = safeNum(summary.completed) + safeNum(summary.ongoing) + safeNum(summary.overdue);
    const summaryRate = summaryTotal > 0 ? pct(safeNum(summary.completed), summaryTotal) : 0;

    const donutLegendData = useMemo(() => [
        { label: "Completed", value: safeNum(summary.completed), color: STATUS_COLORS.Completed },
        { label: "Ongoing", value: safeNum(summary.ongoing), color: STATUS_COLORS.Ongoing },
        { label: "Overdue", value: safeNum(summary.overdue), color: STATUS_COLORS.Overdue }
    ].map((item) => ({ ...item, percent: pct(item.value, summaryTotal) })), [summary, summaryTotal]);

    useEffect(() => {
        if (!window.Chart || !groupedBarRef.current) return;

        if (groupedBarChart.current) groupedBarChart.current.destroy();

        const defaults = chartDefaults(themeMode);
        groupedBarChart.current = new Chart(groupedBarRef.current, {
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
                                const dept = chartDepts[ctx.dataIndex];
                                return dept ? `Completion rate: ${dept.completion_rate}%` : "";
                            }
                        }
                    }
                },
                scales: defaults.scales
            }
        });

        return () => {
            if (groupedBarChart.current) groupedBarChart.current.destroy();
        };
    }, [deptLabels, deptCompleted, deptOngoing, deptOverdue, chartDepts, themeMode]);

    useEffect(() => {
        if (!window.Chart || !lineRef.current) return;

        if (lineChart.current) lineChart.current.destroy();

        const defaults = chartDefaults(themeMode);
        lineChart.current = new Chart(lineRef.current, {
            type: "line",
            data: {
                labels: monthNames,
                datasets: [
                    makeLineDataset("Completed", lineCompleted, STATUS_COLORS.Completed, themeMode, 0.16),
                    makeLineDataset("Ongoing", lineOngoing, STATUS_COLORS.Ongoing, themeMode, 0.13),
                    makeLineDataset("Overdue", lineOverdue, STATUS_COLORS.Overdue, themeMode, 0.18)
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
                                const comp = lineCompleted[idx] || 0;
                                const total = comp + (lineOngoing[idx] || 0) + (lineOverdue[idx] || 0);
                                return `Completion rate: ${pct(comp, total)}%`;
                            }
                        }
                    }
                },
                scales: defaults.scales
            }
        });

        return () => {
            if (lineChart.current) lineChart.current.destroy();
        };
    }, [monthNames, lineCompleted, lineOngoing, lineOverdue, themeMode]);

    useEffect(() => {
        if (!window.Chart || !quarterBarRef.current) return;

        if (quarterBarChart.current) quarterBarChart.current.destroy();

        const defaults = chartDefaults(themeMode);
        const quarterStackValues = [qCompleted, qOngoing, qOverdue];

        quarterBarChart.current = new Chart(quarterBarRef.current, {
            type: "bar",
            data: {
                labels: quarterLabels,
                datasets: [
                    makeStackedBarDataset(
                        "Completed",
                        qCompleted,
                        STATUS_COLORS.Completed,
                        quarterStackValues,
                        0,
                        28
                    ),
                    makeStackedBarDataset(
                        "Ongoing",
                        qOngoing,
                        STATUS_COLORS.Ongoing,
                        quarterStackValues,
                        1,
                        28
                    ),
                    makeStackedBarDataset(
                        "Overdue",
                        qOverdue,
                        STATUS_COLORS.Overdue,
                        quarterStackValues,
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
                                const q = quarterlyTrend[items[0].dataIndex];
                                return q ? `Completion rate: ${q.completion_rate}%` : "";
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

        return () => {
            if (quarterBarChart.current) quarterBarChart.current.destroy();
        };
    }, [quarterLabels, qCompleted, qOngoing, qOverdue, quarterlyTrend, themeMode]);

    useEffect(() => {
        if (!window.Chart || !donutRef.current) return;

        if (donutChart.current) donutChart.current.destroy();

        donutChart.current = new Chart(donutRef.current, {
            type: "doughnut",
            data: {
                labels: ["Completed", "Ongoing", "Overdue"],
                datasets: [
                    {
                        data: [safeNum(summary.completed), safeNum(summary.ongoing), safeNum(summary.overdue)],
                        backgroundColor: [STATUS_COLORS.Completed, STATUS_COLORS.Ongoing, STATUS_COLORS.Overdue],
                        borderWidth: 4,
                        borderColor: chartTheme(themeMode).cardBg,
                        hoverOffset: 8,
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
                                return ` ${ctx.label}: ${val} (${pct(val, summaryTotal)}%)`;
                            }
                        }
                    }
                }
            }
        });

        return () => {
            if (donutChart.current) donutChart.current.destroy();
        };
    }, [summary, summaryTotal, themeMode]);

    useEffect(() => {
        if (!window.Chart || !hBarRef.current) return;

        if (hBarChart.current) hBarChart.current.destroy();

        const defaults = chartDefaults(themeMode);
        hBarChart.current = new Chart(hBarRef.current, {
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
                                const emp = empSorted[ctx.dataIndex];
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

        return () => {
            if (hBarChart.current) hBarChart.current.destroy();
        };
    }, [empNames, empCompleted, empOverdue, empSorted, themeMode]);

    const isCurrentYear = year === now.getFullYear();

    return (
        <div className="ar-page">
            <div className="ar-page-head">
                <div className="ar-page-head-main">
                    <h2 className="ar-page-title">Annual Task Report</h2>
                    <div className="ar-page-meta">
                        <span className="ar-page-sub">{year}</span>
                    </div>
                </div>

                <div className="ar-head-actions">
                    <div className="ar-year-nav">
                        <button className="ar-ghost-btn" onClick={() => setYear((value) => value - 1)}>
                            <i className="bi bi-chevron-left"></i>
                            Prev
                        </button>

                        <div className="ar-year-range">{year}</div>

                        <button
                            className="ar-ghost-btn"
                            onClick={() => setYear((value) => value + 1)}
                            disabled={isCurrentYear}
                        >
                            Next
                            <i className="bi bi-chevron-right"></i>
                        </button>

                        {!isCurrentYear ? (
                            <button
                                className="ar-ghost-btn ar-ghost-btn--primary"
                                onClick={() => setYear(now.getFullYear())}
                            >
                                This Year
                            </button>
                        ) : null}
                    </div>

                    <div className="ar-search-box ar-search-box--select ar-head-select">
                        <i className="bi bi-buildings"></i>
                        <select
                            className="ar-select"
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
                        <i className="bi bi-chevron-down ar-select-chevron"></i>
                    </div>
                </div>
            </div>

            <div className="ar-toolbar-row">
                <div className="ar-search-box ar-search-box--select">
                    <i className="bi bi-buildings"></i>
                    <select
                        className="ar-select"
                        value={departmentFilter}
                        onChange={(e) => {
                            setDepartmentFilter(e.target.value);
                            setSelectedDept(null);
                        }}
                    >
                        <option value="all">All Departments</option>
                        {allDepartments.map((dep) => (
                            <option key={dep.id} value={dep.id}>{dep.name}</option>
                        ))}
                    </select>
                    <i className="bi bi-chevron-down ar-select-chevron"></i>
                </div>
            </div>

            <div className="ar-summary-grid ar-summary-grid--quarterly-style">
                <SummaryCard
                    icon="bi-check2-circle"
                    label="Completed Tasks"
                    value={summary.completed}
                    subtext="Finished tasks during the selected year"
                    tone="success"
                    meta={`${pct(safeNum(summary.completed), safeNum(summary.total))}% of total`}
                />

                <SummaryCard
                    icon="bi-arrow-repeat"
                    label="In Progress Tasks"
                    value={summary.ongoing}
                    subtext="Active tasks still underway"
                    tone="warning"
                    meta={`${pct(safeNum(summary.ongoing), safeNum(summary.total))}% of total`}
                />

                <SummaryCard
                    icon="bi-exclamation-circle"
                    label="Overdue Tasks"
                    value={summary.overdue}
                    subtext="Tasks that missed their deadline"
                    tone="danger"
                    meta={`${pct(safeNum(summary.overdue), safeNum(summary.total))}% of total`}
                />

                <SummaryCard
                    icon="bi-list-task"
                    label="Total Tasks"
                    value={summary.total}
                    subtext="Annual task scope"
                    tone="primary"
                    meta={year}
                />

                <SummaryCard
                    icon="bi-graph-up-arrow"
                    label="Completion Rate"
                    value={`${summaryRate}%`}
                    subtext="Completed versus total tasks"
                    tone={summaryRate >= 70 ? "success" : summaryRate >= 40 ? "warning" : "danger"}
                    meta="Annual Result"
                />
            </div>

            <div className="ar-card ar-card--trend-full">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Department Task Comparison</h5>
                        <div className="ar-card-subtitle">Completed, ongoing, and overdue per department for {year}</div>
                    </div>
                    {selectedDept ? (
                        <button className="ar-filter-pill ar-filter-pill--button" onClick={() => setSelectedDept(null)}>
                            {selectedDept.department}
                            <i className="bi bi-x-lg"></i>
                        </button>
                    ) : <span className="ar-filter-pill">All Departments</span>}
                </div>
                <div className="ar-chart-wrap ar-chart-wrap--dept">
                    <canvas ref={groupedBarRef}></canvas>
                </div>
            </div>

            <div className="ar-card ar-card--trend-full">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Monthly Activity Trend</h5>
                        <div className="ar-card-subtitle">Task completion, ongoing, and overdue counts across all 12 months of {year}</div>
                    </div>
                </div>
                <div className="ar-chart-wrap ar-chart-wrap--line">
                    <canvas ref={lineRef}></canvas>
                </div>
            </div>

            <div className="ar-top-grid">
                <div className="ar-card ar-card--quarter">
                    <div className="ar-card-head">
                        <div>
                            <h5 className="ar-card-title">Quarterly Breakdown</h5>
                            <div className="ar-card-subtitle">Volume and status composition per quarter in {year}</div>
                        </div>
                    </div>

                    <div className="ar-quarter-chip-row">
                        {quarterlyTrend.map((q) => (
                            <span className="ar-quarter-chip" key={q.quarter}>
                                <strong>{q.quarter_label}</strong>
                                <span>{q.completion_rate}%</span>
                            </span>
                        ))}
                    </div>

                    <div className="ar-chart-wrap ar-chart-wrap--quarter">
                        <canvas ref={quarterBarRef}></canvas>
                    </div>
                </div>

                <div className="ar-card ar-card--donut">
                    <div className="ar-card-head">
                        <div>
                            <h5 className="ar-card-title">Annual Status Mix</h5>
                            <div className="ar-card-subtitle">Overall share of completed, ongoing, and overdue tasks</div>
                        </div>
                    </div>

                    <div className="ar-donut-stack">
                        <div className="ar-donut-shell">
                            <canvas ref={donutRef} className="ar-donut-chart"></canvas>
                            <div className="ar-donut-center">
                                <span className="ar-donut-center-kicker">Total</span>
                                <div className="ar-donut-center-line">
                                    <strong className="ar-donut-center-value">{summary.total}</strong>
                                    <span className="ar-donut-center-unit">tasks</span>
                                </div>
                            </div>
                        </div>

                        <div className="ar-donut-legend">
                            {donutLegendData.map((item) => (
                                <div className="ar-donut-legend-item" key={item.label}>
                                    <span className="ar-donut-dot" style={{ borderColor: item.color }}></span>
                                    <div className="ar-donut-legend-copy">
                                        <div className="ar-donut-legend-label">{item.label}</div>
                                        <div className="ar-donut-legend-meta">{item.value} task{item.value !== 1 ? "s" : ""} · {item.percent}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="ar-card ar-card--staff-chart">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Employee Performance</h5>
                        <div className="ar-card-subtitle">Sorted by most tasks completed in {year}</div>
                    </div>
                </div>
                <div className="ar-chart-wrap ar-chart-wrap--employee" style={{ height: `${Math.max(260, empSorted.length * 42)}px` }}>
                    <canvas ref={hBarRef}></canvas>
                </div>
            </div>

            <div className="ar-card ar-card--table">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Quarterly Summary</h5>
                        <div className="ar-card-subtitle">Quarterly task volume and completion rate</div>
                    </div>
                </div>
                <div className="ar-table-shell">
                    <table className="ar-table">
                        <thead>
                            <tr>
                                <th>Quarter</th>
                                <th>Period</th>
                                <th>Total</th>
                                <th>Completed</th>
                                <th>Ongoing</th>
                                <th>Overdue</th>
                                <th style={{ width: "190px" }}>Completion Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quarterlyTrend.length === 0 ? (
                                <tr><td colSpan="7" className="ar-table-empty">No quarterly data found for this year.</td></tr>
                            ) : quarterlyTrend.map((q) => (
                                <tr key={q.quarter}>
                                    <td>{q.quarter_label}</td>
                                    <td>{q.quarter_range}</td>
                                    <td>{q.total}</td>
                                    <td>{q.completed}</td>
                                    <td>{q.ongoing}</td>
                                    <td className="ar-overdue-cell">{q.overdue}</td>
                                    <td>{renderProgress(safeNum(q.completion_rate), safeNum(q.total))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="ar-card ar-card--table">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Department Details</h5>
                        <div className="ar-card-subtitle">Department-level annual activity</div>
                    </div>
                    {selectedDept ? (
                        <button className="ar-filter-pill ar-filter-pill--button" onClick={() => setSelectedDept(null)}>
                            Focused on {selectedDept.department}
                            <i className="bi bi-x-lg"></i>
                        </button>
                    ) : null}
                </div>

                <div className="ar-table-shell">
                    <table className="ar-table">
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>Total</th>
                                <th>Completed</th>
                                <th>Ongoing</th>
                                <th>Overdue</th>
                                <th style={{ width: "190px" }}>Completion Rate</th>
                                <th style={{ width: "72px", textAlign: "center" }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.length === 0 ? (
                                <tr><td colSpan="7" className="ar-table-empty">No department activity found for this year.</td></tr>
                            ) : departments.map((dept) => {
                                const isSelected = selectedDept?.department_id === dept.department_id;
                                return (
                                    <tr
                                        key={dept.department_id}
                                        className={isSelected ? "is-active" : ""}
                                        onClick={() => setSelectedDept((prev) => prev?.department_id === dept.department_id ? null : dept)}
                                    >
                                        <td>{dept.department}</td>
                                        <td>{dept.total}</td>
                                        <td>{dept.completed}</td>
                                        <td>{dept.ongoing}</td>
                                        <td className="ar-overdue-cell">{dept.overdue}</td>
                                        <td>{renderProgress(safeNum(dept.completion_rate), safeNum(dept.total))}</td>
                                        <td style={{ textAlign: "center" }} onClick={(e) => { e.stopPropagation(); setModalDept(dept); }}>
                                            <button className="ar-eye-btn" title={`View ${dept.department} tasks for ${year}`}>
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

            <div className="ar-card ar-card--table">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Employee Details</h5>
                        <div className="ar-card-subtitle">Employee-level annual activity</div>
                    </div>
                </div>

                <div className="ar-table-shell">
                    <table className="ar-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Completed</th>
                                <th>Ongoing</th>
                                <th>Overdue</th>
                                <th style={{ width: "190px" }}>Completion Rate</th>
                                <th style={{ width: "72px", textAlign: "center" }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.length === 0 ? (
                                <tr><td colSpan="7" className="ar-table-empty">No employee activity found for this year.</td></tr>
                            ) : employees.map((emp) => {
                                const rate = safeNum(emp.completion_rate);
                                const total = safeNum(emp.total);
                                return (
                                    <tr key={emp.id}>
                                        <td>
                                            <div className="ar-assignee">
                                                <img
                                                    src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                                                    alt={`${emp.name} Profile`}
                                                    className="ar-assignee-avatar"
                                                />
                                                <div className="ar-assignee-copy">
                                                    <span className="ar-assignee-name">{emp.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{emp.department}</td>
                                        <td>{emp.completed}</td>
                                        <td>{emp.ongoing}</td>
                                        <td className="ar-overdue-cell">{emp.overdue}</td>
                                        <td>{renderProgress(rate, total)}</td>
                                        <td style={{ textAlign: "center" }} onClick={(e) => { e.stopPropagation(); setModalEmp(emp); }}>
                                            <button className="ar-eye-btn" title={`View ${emp.name}'s tasks for ${year}`}>
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

            {modalDept ? (
                <DepartmentTaskModal dept={modalDept} yearStart={yearStart} yearEnd={yearEnd} onClose={() => setModalDept(null)} />
            ) : null}

            {modalEmp ? (
                <EmployeeTaskModal emp={modalEmp} yearStart={yearStart} yearEnd={yearEnd} onClose={() => setModalEmp(null)} />
            ) : null}
        </div>
    );
}

const mountNode = document.getElementById("root") || document.getElementById("annualReportRoot");
const root = ReactDOM.createRoot(mountNode);
root.render(<AnnualReportPage />);


