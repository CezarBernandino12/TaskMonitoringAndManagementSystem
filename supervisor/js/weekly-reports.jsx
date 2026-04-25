const { useEffect, useMemo, useRef, useState } = React;

const MANILA_TZ = "Asia/Manila";

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
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return d;
    });
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

function completionRate(emp) {
    const total = (emp.completed || 0) + (emp.ongoing || 0) + (emp.overdue || 0);
    return total > 0 ? Math.round(((emp.completed || 0) / total) * 100) : 0;
}

function SummaryCard({ icon, title, value, tone, sub }) {
    return (
        <div className="wr-summary-card">
            <div className="wr-summary-top">
                <div className={`wr-summary-icon ${tone}`}>
                    <i className={`bi ${icon}`}></i>
                </div>
                <span className={`wr-summary-chip ${tone}`}>{sub}</span>
            </div>

            <div className="wr-summary-title">{title}</div>
            <div className={`wr-summary-value ${tone}`}>{value}</div>
        </div>
    );
}


function safeNum(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
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

function initials(name) {
    return name
        ? name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase()
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

        fetch(`php/get_task_messages.php?task_id=${encodeURIComponent(task.id)}`)
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
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
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
        <div className="wr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div
                className="wr-modal-card wr-comment-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Comments for ${task.title}`}
            >
                <div className="wr-modal-head">
                    <div>
                        <h5 className="wr-modal-title">
                            <i className="bi bi-chat-dots me-2"></i>
                            {task.title || "Task Comments"}
                        </h5>
                        <div className="wr-modal-subtitle">
                            {messages.length} comment{messages.length !== 1 ? "s" : ""}
                        </div>
                    </div>

                    <button className="wr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="wr-modal-body">
                    {loading ? (
                        <div className="wr-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading comments...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : messages.length === 0 ? (
                        <div className="wr-empty-state wr-chat-empty-state">
                            <div className="wr-chat-empty-icon">
                                <i className="bi bi-chat-quote-fill"></i>
                            </div>
                            <div className="wr-chat-empty-title">No comments yet</div>
                            <div className="wr-chat-empty-subtitle">
                                No comments yet. Be the first to reply.
                            </div>
                        </div>
                    ) : (
                        <div className="wr-comment-stream">
                            {messages.map((msg) => {
                                const isOwn = safeNum(msg.sender_id) === safeNum(currentUserId);

                                return (
                                    <div key={msg.id} className={`wr-comment-row ${isOwn ? "is-own" : ""}`}>
                                        <div
                                            className="wr-comment-avatar"
                                            style={{
                                                background: avatarColor(msg.sender_name),
                                                color: avatarTextColor(msg.sender_name)
                                            }}
                                        >
                                            {initials(msg.sender_name)}
                                        </div>

                                        <div className="wr-comment-bubble-wrap">
                                            <div className="wr-comment-meta">
                                                <span className="wr-comment-author">
                                                    {isOwn ? "You" : msg.sender_name}
                                                </span>
                                                <span className="wr-comment-time">
                                                    {formatDateTimePH(msg.time_sent)}
                                                </span>
                                            </div>

                                            {msg.message ? <div className="wr-comment-bubble">{msg.message}</div> : null}

                                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                                                <div className="wr-comment-attachments">
                                                    {msg.attachments.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={att.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="wr-file-chip"
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

                <div className="wr-modal-foot wr-comment-foot">
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />

                    <div className="wr-comment-compose">
                        {sendError ? <div className="wr-comment-error">{sendError}</div> : null}

                        {files.length > 0 ? (
                            <div className="wr-file-chip-row">
                                {files.map((file, index) => (
                                    <div className="wr-file-chip is-staged" key={`${file.name}-${index}`}>
                                        <i className="bi bi-paperclip"></i>
                                        <span className="wr-file-chip-name">{file.name}</span>
                                        <span className="wr-file-chip-size">{fmtSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className="wr-file-chip-remove"
                                            onClick={() => removeFile(index)}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="wr-comment-compose-row">
                            <button
                                type="button"
                                className="wr-icon-btn"
                                onClick={() => fileRef.current?.click()}
                                disabled={sending}
                                title="Attach files"
                            >
                                <i className="bi bi-paperclip"></i>
                            </button>

                            <textarea
                                className="wr-compose-textarea"
                                rows="2"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Write a thoughtful reply..."
                            />

                            <button
                                type="button"
                                className="wr-ghost-btn wr-send-btn"
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

        const start = formatDate(weekStart);
        const end = formatDate(weekEnd);

        fetch(`php/get_employee_tasks_report.php?employee_id=${encodeURIComponent(emp.id)}&week_start=${start}&week_end=${end}`)
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
    }, [emp.id, weekStart, weekEnd]);

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

    const filtered = useMemo(
        () =>
            activeTab === "all"
                ? annotated
                : annotated.filter((t) => t.derivedStatus === activeTab),
        [annotated, activeTab]
    );

    return (
        <>
            <div className="wr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div
                    className="wr-modal-card wr-employee-task-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${emp.name} tasks`}
                >
                    <div className="wr-modal-head">
                        <div className="wr-modal-person">
                            <img
                                src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                                alt={`${emp.name} Profile`}
                                className="wr-modal-avatar"
                            />
                            <div>
                                <h5 className="wr-modal-title">{emp.name}</h5>
                                <div className="wr-modal-subtitle">
                                    {emp.department} · Week of {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
                                </div>
                            </div>
                        </div>

                        <button className="wr-icon-btn" onClick={onClose} aria-label="Close">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="wr-modal-toolbar wr-modal-toolbar--badges-only">
                        <div className="wr-pill-row wr-pill-row--clean">
                            {[
                                { key: "all", label: "All", count: counts.all, tone: "neutral" },
                                { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                                { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                                { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`wr-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    <span className="wr-pill-tab-label">{tab.label}</span>
                                    <span className="wr-pill-count">{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="wr-modal-body">
                        {loading ? (
                            <div className="wr-empty-state">
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                Loading tasks...
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger mb-0">{error}</div>
                        ) : filtered.length === 0 ? (
                            <div className="wr-empty-state">No matching tasks found for this week.</div>
                        ) : (
                            <div className="wr-task-list">
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
                                        <div className="wr-task-item" key={task.id ?? idx}>
                                            <div className="wr-task-main">
                                                <div className="wr-task-title">{task.title || "Untitled Task"}</div>
                                                {task.description && (
                                                    <div className="wr-task-desc">{task.description}</div>
                                                )}
                                                <div className="wr-task-meta">{deadlineText}</div>
                                            </div>

                                            <div className="wr-task-side">
                                                <span className={`wr-status-inline ${statusTone(status)}`}>{status}</span>
                                                <span className={`wr-priority-inline ${priorityTone(priority)}`}>
                                                    <i className="bi bi-flag-fill"></i>
                                                    <span>{priority}</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    className="wr-ghost-btn wr-comment-open-btn"
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

                    <div className="wr-modal-foot">
                        <button className="wr-ghost-btn" onClick={onClose}>Close</button>
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

function SupervisorWeeklyReportPage() {
    const [summary, setSummary] = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [employees, setEmployees] = useState([]);
    const [dailyTrend, setDailyTrend] = useState([]);
    const [department, setDepartment] = useState(null);
    const [supervisor, setSupervisor] = useState(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const lineRef = useRef(null);
    const donutRef = useRef(null);

    const weekStart = getWeekStart(weekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const isCurrentWeek = weekOffset === 0;

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
        setSelectedEmp(null);
        setModalEmp(null);
        setLoadError(null);

        const start = formatDate(weekStart);
        const end = formatDate(weekEnd);

        fetch(`php/get_supervisor_weekly_report.php?week_start=${start}&week_end=${end}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setLoadError(data.error);
                    return;
                }

                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setEmployees(data.employees ?? []);
                setDailyTrend(data.daily_trend ?? []);
                setDepartment(data.department ?? null);
                setSupervisor(data.supervisor ?? null);
            })
            .catch((err) => setLoadError(err.message));
    }, [weekOffset]);

    const chartLabels = useMemo(() => weekDayLabels(weekStart), [weekStart]);

    const trendSource = useMemo(() => {
        if (selectedEmp && selectedEmp.daily_trend) return selectedEmp.daily_trend;
        return dailyTrend;
    }, [selectedEmp, dailyTrend]);

    const lineCompleted = useMemo(
        () => trendSource.map((d) => d.completed ?? 0),
        [trendSource]
    );
    const lineOngoing = useMemo(
        () => trendSource.map((d) => d.ongoing ?? 0),
        [trendSource]
    );
    const lineOverdue = useMemo(
        () => trendSource.map((d) => d.overdue ?? 0),
        [trendSource]
    );

    const scopedSummary = useMemo(() => {
        if (!selectedEmp) return summary;

        return {
            total: (selectedEmp.completed || 0) + (selectedEmp.ongoing || 0) + (selectedEmp.overdue || 0),
            completed: selectedEmp.completed || 0,
            ongoing: selectedEmp.ongoing || 0,
            overdue: selectedEmp.overdue || 0
        };
    }, [selectedEmp, summary]);

    const donutLegendData = useMemo(() => {
        const total = scopedSummary.total || 0;
        return [
            { label: "Completed", value: scopedSummary.completed, color: "#16a34a" },
            { label: "Ongoing", value: scopedSummary.ongoing, color: "#2563eb" },
            { label: "Overdue", value: scopedSummary.overdue, color: "#e11d48" }
        ].map((item) => ({
            ...item,
            percent: total > 0 ? Math.round((item.value / total) * 100) : 0
        }));
    }, [scopedSummary]);

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
                color: ["#16a34a", "#2563eb", "#e11d48"],
                grid: {
                    top: 26,
                    left: 18,
                    right: 20,
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
                        fontWeight: 700
                    },
                    data: ["Task Completed", "Task Ongoing", "Task Overdue"]
                },
                xAxis: {
                    type: "category",
                    boundaryGap: false,
                    data: chartLabels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800,
                        margin: 12
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
                        lineStyle: {
                            color: splitLine
                        }
                    }
                },
                series: [
                    {
                        name: "Task Completed",
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
                        name: "Task Ongoing",
                        type: "line",
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 5,
                        lineStyle: { width: 1.8 },
                        itemStyle: { borderWidth: 2, borderColor: isDark ? "#141b2d" : "#ffffff" },
                        areaStyle: {
                            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: "rgba(37,99,235,0.12)" },
                                { offset: 1, color: "rgba(37,99,235,0.01)" }
                            ])
                        },
                        data: lineOngoing
                    },
                    {
                        name: "Task Overdue",
                        type: "line",
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 5,
                        lineStyle: { width: 1.8 },
                        itemStyle: { borderWidth: 2, borderColor: isDark ? "#141b2d" : "#ffffff" },
                        areaStyle: {
                            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: "rgba(225,29,72,0.12)" },
                                { offset: 1, color: "rgba(225,29,72,0.01)" }
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
    }, [chartLabels, lineCompleted, lineOngoing, lineOverdue, themeMode]);

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
                        radius: ["62%", "85%"],
                        center: ["50%", "50%"],
                        startAngle: 90,
                        clockwise: true,
                        padAngle: 4,
                        minAngle: 8,
                        label: { show: false },
                        labelLine: { show: false },
                        emphasis: {
                            scale: true,
                            scaleSize: 8,
                            itemStyle: {
                                borderColor: separator,
                                borderWidth: 6,
                                borderRadius: 14
                            }
                        },
                        itemStyle: {
                            borderColor: separator,
                            borderWidth: 6,
                            borderRadius: 14
                        },
                        data: [
                            { value: scopedSummary.completed, name: "Completed", itemStyle: { color: "#16a34a" } },
                            { value: scopedSummary.ongoing, name: "Ongoing", itemStyle: { color: "#2563eb" } },
                            { value: scopedSummary.overdue, name: "Overdue", itemStyle: { color: "#e11d48" } }
                        ]
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

    return (
        <div className="wr-page">
            <div className="wr-page-head">
                <div>
                    <h2 className="wr-page-title">Weekly Task Report</h2>
                </div>

                <div className="wr-week-nav">
                    <button className="wr-ghost-btn" onClick={() => setWeekOffset((p) => p - 1)}>
                        <i className="bi bi-chevron-left"></i>
                        Prev
                    </button>

                    <div className="wr-week-range">
                        {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
                    </div>

                    <button
                        className="wr-ghost-btn"
                        onClick={() => setWeekOffset((p) => p + 1)}
                        disabled={isCurrentWeek}
                    >
                        Next
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {weekOffset !== 0 && (
                        <button className="wr-ghost-btn" onClick={() => setWeekOffset(0)}>
                            This Week
                        </button>
                    )}
                </div>
            </div>

            {loadError && (
                <div className="alert alert-danger mb-4">
                    <strong>Error:</strong> {loadError}
                </div>
            )}

            <div className="wr-summary-grid">
                <SummaryCard
                    icon="bi-list-task"
                    title="Total Tasks"
                    value={summary.total}
                    tone="primary"
                    sub="Weekly scope"
                />
                <SummaryCard
                    icon="bi-check2-circle"
                    title="Completed"
                    value={summary.completed}
                    tone="success"
                    sub="Finished this week"
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

            <div className="wr-top-grid">
                <div className="wr-card wr-card--trend">
                    <div className="wr-card-head">
                        <div>
                            <h5 className="wr-card-title">Task Status Trend</h5>
                            <div className="wr-card-subtitle">
                                {selectedEmp
                                    ? `${selectedEmp.name} weekly task trend`
                                    : "Department-wide staff task distribution"}
                            </div>
                        </div>

                        {selectedEmp ? (
                            <button className="wr-filter-pill wr-filter-pill--button" onClick={() => setSelectedEmp(null)}>
                                Clear Selection
                            </button>
                        ) : (
                            <div className="wr-filter-pill">This Week</div>
                        )}
                    </div>

                    <div ref={lineRef} className="wr-line-chart"></div>
                </div>

                <div className="wr-card wr-card--donut">
                    <div className="wr-card-head">
                        <div>
                            <h5 className="wr-card-title">Status Distribution</h5>
                            <div className="wr-card-subtitle">
                                {selectedEmp ? `${selectedEmp.name} status split` : "Weekly task breakdown"}
                            </div>
                        </div>

                        <div className="wr-filter-pill">
                            {selectedEmp ? "Selected Staff" : "All Staff"}
                        </div>
                    </div>

                    <div className="wr-donut-stack">
                        <div className="wr-donut-shell">
                            <div ref={donutRef} className="wr-donut-chart"></div>

                            <div className="wr-donut-center">
                                <span className="wr-donut-center-kicker">Total</span>
                                <div className="wr-donut-center-line">
                                    <strong className="wr-donut-center-value">{scopedSummary.total}</strong>
                                    <span className="wr-donut-center-unit">
                                        task{scopedSummary.total !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="wr-donut-legend">
                            {donutLegendData.map((item) => (
                                <div className="wr-donut-legend-item" key={item.label}>
                                    <span className="wr-donut-dot" style={{ borderColor: item.color }}></span>
                                    <div className="wr-donut-legend-copy">
                                        <div className="wr-donut-legend-label">{item.label}</div>
                                        <div className="wr-donut-legend-meta">
                                            {item.value} task{item.value !== 1 ? "s" : ""} · {item.percent}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="wr-card wr-card--table">
                <div className="wr-card-head">
                    <div>
                        <h5 className="wr-card-title">Staff Details</h5>
                        <div className="wr-card-subtitle">
                            {department ? `Weekly activity — ${department.name}` : "Weekly staff activity"}
                        </div>
                    </div>

                    {selectedEmp ? (
                        <div className="wr-filter-pill">{selectedEmp.name}</div>
                    ) : (
                        <div className="wr-filter-pill">
                            {employees.length} staff member{employees.length !== 1 ? "s" : ""}
                        </div>
                    )}
                </div>

                <div className="wr-table-shell">
                    <table className="wr-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th style={{ width: "110px" }}>Completed</th>
                                <th style={{ width: "110px" }}>Ongoing</th>
                                <th style={{ width: "110px" }}>Overdue</th>
                                <th style={{ width: "170px" }}>Completion Rate</th>
                                <th style={{ width: "78px", textAlign: "center" }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="wr-table-empty">
                                        No staff activity found for this week.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => {
                                    const total = (emp.completed || 0) + (emp.ongoing || 0) + (emp.overdue || 0);
                                    const rate = completionRate(emp);
                                    const selected = selectedEmp?.id === emp.id;

                                    return (
                                        <tr
                                            key={emp.id}
                                            className={selected ? "is-active" : ""}
                                            onClick={() =>
                                                setSelectedEmp((prev) =>
                                                    prev?.id === emp.id ? null : emp
                                                )
                                            }
                                        >
                                            <td>
                                                <div className="wr-assignee">
                                                    <img
                                                        src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                                                        alt={`${emp.name} Profile`}
                                                        className="wr-assignee-avatar"
                                                    />
                                                    <div className="wr-assignee-copy">
                                                        <span className="wr-assignee-name">{emp.name}</span>
                                                        <span className="wr-assignee-sub">{department?.name || emp.department || "Department"}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{emp.completed}</td>
                                            <td>{emp.ongoing}</td>
                                            <td className="wr-overdue-cell">{emp.overdue}</td>

                                            <td>
                                                {total === 0 ? (
                                                    <span className="wr-empty-inline">No tasks yet</span>
                                                ) : (
                                                    <div className="wr-performance-cell">
                                                        <div className="wr-progress" title={`${rate}% completed`}>
                                                            <div
                                                                className="wr-progress-bar"
                                                                style={{ width: `${rate}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="wr-performance-value">{rate}%</span>
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
                                                <button className="wr-eye-btn" title={`View ${emp.name}'s tasks this week`}>
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
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("supervisorWeeklyRoot"));
root.render(<SupervisorWeeklyReportPage />);