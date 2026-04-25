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
        return <span className="ar-empty-inline">No tasks yet</span>;
    }

    return (
        <div className="ar-progress-clean" title={`${rate}% completed`}>
            <div className="ar-progress-clean-track">
                <div
                    className="ar-progress-clean-fill"
                    style={{ width: `${rate}%` }}
                ></div>
            </div>
            <span className="ar-progress-clean-value">{rate}%</span>
        </div>
    );
}

function SummaryCard({ icon, title, value, tone, sub }) {
    return (
        <div className="ar-summary-card">
            <div className="ar-summary-top">
                <div className={`ar-summary-icon ${tone}`}>
                    <i className={`bi ${icon}`}></i>
                </div>
                <span className={`ar-summary-chip ${tone}`}>{sub}</span>
            </div>

            <div className="ar-summary-title">{title}</div>
            <div className={`ar-summary-value ${tone}`}>{value}</div>
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
        <div
            className="ar-modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="ar-modal-card ar-comment-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Comments for ${task.title}`}
            >
                <div className="ar-modal-head">
                    <div>
                        <h5 className="ar-modal-title">
                            <i className="bi bi-chat-dots"></i>
                            {task.title || "Task Comments"}
                        </h5>
                        <div className="ar-modal-subtitle">
                            {messages.length} comment{messages.length !== 1 ? "s" : ""}
                        </div>
                    </div>

                    <button className="ar-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="ar-modal-body">
                    {loading ? (
                        <div className="ar-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
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

                            <div className="ar-chat-empty-subtitle">
                                No comments yet. Be the first to reply.
                            </div>
                        </div>
                    ) : (
                        <div className="ar-comment-stream">
                            {messages.map((msg) => {
                                const isOwn = safeNum(msg.sender_id) === safeNum(currentUserId);

                                return (
                                    <div
                                        key={msg.id}
                                        className={`ar-comment-row ${isOwn ? "is-own" : ""}`}
                                    >
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
                                                <span className="ar-comment-author">
                                                    {isOwn ? "You" : msg.sender_name}
                                                </span>
                                                <span className="ar-comment-time">
                                                    {formatDateTimePH(msg.time_sent)}
                                                </span>
                                            </div>

                                            {msg.message ? (
                                                <div className="ar-comment-bubble">
                                                    {msg.message}
                                                </div>
                                            ) : null}

                                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                                                <div className="ar-comment-attachments">
                                                    {msg.attachments.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={att.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="ar-file-chip"
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

                <div className="ar-modal-foot ar-comment-foot">
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />

                    <div className="ar-comment-compose">
                        {sendError ? <div className="ar-comment-error">{sendError}</div> : null}

                        {files.length > 0 ? (
                            <div className="ar-file-chip-row">
                                {files.map((file, index) => (
                                    <div className="ar-file-chip is-staged" key={`${file.name}-${index}`}>
                                        <i className="bi bi-paperclip"></i>
                                        <span className="ar-file-chip-name">{file.name}</span>
                                        <span className="ar-file-chip-size">{fmtSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className="ar-file-chip-remove"
                                            onClick={() => removeFile(index)}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="ar-comment-compose-row">
                            <button
                                type="button"
                                className="ar-icon-btn"
                                onClick={() => fileRef.current?.click()}
                                disabled={sending}
                                title="Attach files"
                            >
                                <i className="bi bi-paperclip"></i>
                            </button>

                            <textarea
                                className="ar-compose-textarea"
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
                                className="ar-ghost-btn ar-send-btn"
                                onClick={handleSend}
                                disabled={!canSend}
                            >
                                {sending ? "Sending..." : (
                                    <>
                                        <i className="bi bi-send-fill"></i>
                                        <span>Send</span>
                                    </>
                                )}
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

        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}&week_start=${yearStart}&week_end=${yearEnd}`)
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
        return activeTab === "all"
            ? annotated
            : annotated.filter((t) => t.derivedStatus === activeTab);
    }, [annotated, activeTab]);

    return (
        <>
            <div className="ar-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ar-modal-card ar-employee-task-modal">
                <div className="ar-modal-head">
                    <div className="ar-modal-person">
                        <img
                            src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                            alt={`${emp.name} Profile`}
                            className="ar-modal-avatar"
                        />
                        <div>
                            <h5 className="ar-modal-title">{emp.name}</h5>
                            <div className="ar-modal-subtitle">
                                {emp.department} · {yearStart} — {yearEnd}
                            </div>
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
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="ar-empty-state">No matching tasks found for this year.</div>
                    ) : (
                        <div className="ar-task-list">
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
                                    <div className="ar-task-item" key={task.id ?? idx}>
                                        <div className="ar-task-main">
                                            <div className="ar-task-title">{task.title}</div>
                                            {task.description && (
                                                <div className="ar-task-desc">{task.description}</div>
                                            )}
                                            <div className="ar-task-meta">{deadlineText}</div>
                                        </div>

                                        <div className="ar-task-side">
                                            <span className={`ar-status-inline ${statusTone(status)}`}>{status}</span>
                                            <span className={`ar-priority-inline ${priorityTone(priority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                <span>{priority}</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="ar-ghost-btn ar-comment-open-btn"
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

                <div className="ar-modal-foot">
                    <button className="ar-ghost-btn" onClick={onClose}>Close</button>
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

function AnnualReportPage() {
    const now = new Date();

    const [summary, setSummary] = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [departments, setDepartments] = useState([]);
    const [quarterlyTrend, setQuarterlyTrend] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [deptName, setDeptName] = useState("");
    const [year, setYear] = useState(now.getFullYear());
    const [modalEmp, setModalEmp] = useState(null);
    const [authError, setAuthError] = useState(null);
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const groupedBarRef = useRef(null);
    const lineRef = useRef(null);
    const quarterBarRef = useRef(null);
    const donutRef = useRef(null);
    const hBarRef = useRef(null);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

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

        fetch(`php/get_annual_report_supervisor.php?year=${year}`)
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
                setQuarterlyTrend(data.quarterly_trend ?? []);
                setMonthlyTrend(data.monthly_trend ?? []);
                setEmployees(data.employees ?? []);
                setDeptName(data.supervisor_department_name ?? "");
                setAuthError(null);
            })
            .catch((err) => {
                console.error(err);
                setAuthError(err.message);
            });
    }, [year]);

    const deptLabels = useMemo(() => departments.map((d) => d.department), [departments]);
    const deptCompleted = useMemo(() => departments.map((d) => d.completed), [departments]);
    const deptOngoing = useMemo(() => departments.map((d) => d.ongoing), [departments]);
    const deptOverdue = useMemo(() => departments.map((d) => d.overdue), [departments]);

    const monthNames = useMemo(() => monthlyTrend.map((m) => m.month_name), [monthlyTrend]);
    const lineCompleted = useMemo(() => monthlyTrend.map((m) => m.completed), [monthlyTrend]);
    const lineOngoing = useMemo(() => monthlyTrend.map((m) => m.ongoing), [monthlyTrend]);
    const lineOverdue = useMemo(() => monthlyTrend.map((m) => m.overdue), [monthlyTrend]);

    const quarterLabels = useMemo(() => quarterlyTrend.map((q) => q.quarter_label), [quarterlyTrend]);
    const qCompleted = useMemo(() => quarterlyTrend.map((q) => q.completed), [quarterlyTrend]);
    const qOngoing = useMemo(() => quarterlyTrend.map((q) => q.ongoing), [quarterlyTrend]);
    const qOverdue = useMemo(() => quarterlyTrend.map((q) => q.overdue), [quarterlyTrend]);

    const donutData = useMemo(
        () => [
            { label: "Completed", value: summary.completed, color: "#16a34a" },
            { label: "Ongoing", value: summary.ongoing, color: "#2563eb" },
            { label: "Overdue", value: summary.overdue, color: "#e11d48" }
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
                color: ["#16a34a", "#2563eb", "#e11d48"],
                grid: {
                    top: 34,
                    left: 20,
                    right: 18,
                    bottom: 24,
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
                        const dept = departments[params[0].dataIndex];
                        const lines = params.map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
                        if (dept) lines.push(`Completion rate: ${dept.completion_rate}%`);
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
                color: ["#16a34a", "#2563eb", "#e11d48"],
                grid: {
                    top: 30,
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
                        "box-shadow:0 18px 40px rgba(15,23,42,0.12); border-radius:16px;",
                    formatter: (params) => {
                        if (!params.length) return "";
                        const idx = params[0].dataIndex;
                        const comp = lineCompleted[idx] || 0;
                        const total = comp + (lineOngoing[idx] || 0) + (lineOverdue[idx] || 0);
                        const lines = params.map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
                        lines.push(`Completion rate: ${total > 0 ? Math.round((comp / total) * 100) : 0}%`);
                        return [`<strong>${params[0].axisValue}</strong>`, ...lines].join("<br/>");
                    }
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
                    data: monthNames,
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
                                { offset: 0, color: "rgba(37,99,235,0.12)" },
                                { offset: 1, color: "rgba(37,99,235,0.01)" }
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
    }, [monthNames, lineCompleted, lineOngoing, lineOverdue, themeMode]);

    useEffect(() => {
        if (!window.echarts || !quarterBarRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(quarterBarRef.current) ||
            window.echarts.init(quarterBarRef.current);

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
                    top: 54,
                    left: 20,
                    right: 18,
                    bottom: 24,
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
                        const q = quarterlyTrend[params[0].dataIndex];
                        const lines = params.map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
                        if (q) lines.push(`Completion rate: ${q.completion_rate}%`);
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
                    data: quarterLabels,
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
                        data: qCompleted
                    },
                    {
                        name: "Ongoing",
                        type: "bar",
                        stack: "quarter",
                        barMaxWidth: 30,
                        itemStyle: { borderRadius: [0, 0, 0, 0] },
                        data: qOngoing
                    },
                    {
                        name: "Overdue",
                        type: "bar",
                        stack: "quarter",
                        barMaxWidth: 30,
                        itemStyle: { borderRadius: [8, 8, 0, 0] },
                        data: qOverdue
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
    }, [quarterLabels, qCompleted, qOngoing, qOverdue, quarterlyTrend, themeMode]);

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
                color: ["#16a34a", "#e11d48"],
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
                        const emp = empSorted[params[0].dataIndex];
                        const lines = params.map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
                        if (emp) lines.push(`Completion rate: ${emp.completion_rate}%`);
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

    const isCurrentYear = year === now.getFullYear();
    const goToPrevYear = () => setYear((y) => y - 1);
    const goToNextYear = () => setYear((y) => y + 1);
    const goToCurrentYear = () => setYear(now.getFullYear());

    const summaryTotal = summary.completed + summary.ongoing + summary.overdue;
    const summaryRate = summaryTotal > 0 ? Math.round((summary.completed / summaryTotal) * 100) : 0;

    if (authError) {
        return (
            <div className="ar-page">
                <div className="ar-error-card">
                    <h5>Access Denied</h5>
                    <p>{authError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ar-page">
            <div className="ar-page-head">
                <div>
                    <h2 className="ar-page-title">Annual Task Report</h2>
                </div>

                <div className="ar-year-nav">
                    <button className="ar-ghost-btn" onClick={goToPrevYear}>
                        <i className="bi bi-chevron-left"></i>
                        Prev
                    </button>

                    <div className="ar-year-range">{year}</div>

                    <button
                        className="ar-ghost-btn"
                        onClick={goToNextYear}
                        disabled={isCurrentYear}
                    >
                        Next
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {!isCurrentYear && (
                        <button className="ar-ghost-btn ar-ghost-btn--primary" onClick={goToCurrentYear}>
                            This Year
                        </button>
                    )}
                </div>
            </div>

            <div className="ar-summary-grid">
                <SummaryCard
                    icon="bi-list-task"
                    title="Total Tasks"
                    value={summary.total}
                    tone="primary"
                    sub="Annual scope"
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
                    sub="Annual result"
                />
            </div>

            <div className="ar-card ar-card--monthly">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Monthly Activity Trend</h5>
                        <div className="ar-card-subtitle">
                            Task completion, ongoing, and overdue counts across all 12 months of {year}
                        </div>
                    </div>
                </div>
                <div ref={lineRef} className="ar-line-chart"></div>
            </div>

            <div className="ar-mid-grid">
                <div className="ar-card ar-card--dept ar-card--mid">
                    <div className="ar-card-head">
                        <div>
                            <h5 className="ar-card-title">Department Task Overview</h5>
                            <div className="ar-card-subtitle">Completed, ongoing, and overdue for {year}</div>
                        </div>
                    </div>
                    <div ref={groupedBarRef} className="ar-grouped-chart"></div>
                </div>

                <div className="ar-card ar-card--quarter ar-card--mid">
                    <div className="ar-card-head">
                        <div>
                            <h5 className="ar-card-title">Quarterly Breakdown</h5>
                            <div className="ar-card-subtitle">
                                Volume and status composition per quarter
                            </div>
                        </div>
                    </div>

                    <div className="ar-quarter-badges">
                        {quarterlyTrend.map((q) => (
                            <div className="ar-quarter-badge" key={q.quarter}>
                                <span className="ar-quarter-badge-label">{q.quarter_label}</span>
                                <span
                                    className={`ar-quarter-badge-rate ${
                                        q.completion_rate >= 70
                                            ? "success"
                                            : q.completion_rate >= 40
                                            ? "warning"
                                            : "danger"
                                    }`}
                                >
                                    {q.completion_rate}%
                                </span>
                            </div>
                        ))}
                    </div>

                    <div ref={quarterBarRef} className="ar-quarter-chart"></div>
                </div>
            </div>

            <div className="ar-bottom-grid">
                <div className="ar-card ar-card--staff-chart ar-card--bottom">
                    <div className="ar-card-head">
                        <div>
                            <h5 className="ar-card-title">Employee Performance</h5>
                            <div className="ar-card-subtitle">
                                Sorted by most tasks completed in {year}
                            </div>
                        </div>
                    </div>
                    <div
                        ref={hBarRef}
                        className="ar-hbar-chart"
                        style={{ height: `${Math.max(240, empSorted.length * 38)}px` }}
                    ></div>
                </div>

                <div className="ar-card ar-card--donut ar-card--bottom">
                    <div className="ar-card-head">
                        <div>
                            <h5 className="ar-card-title">Annual Status Mix</h5>
                            <div className="ar-card-subtitle">
                                Overall share of completed, ongoing, and overdue
                            </div>
                        </div>
                    </div>

                    <div className="ar-donut-stack">
                        <div className="ar-donut-shell">
                            <div ref={donutRef} className="ar-donut-chart"></div>

                            <div className="ar-donut-center">
                                <span className="ar-donut-center-kicker">Total</span>
                                <div className="ar-donut-center-line">
                                    <strong className="ar-donut-center-value">{summary.total}</strong>
                                    <span className="ar-donut-center-unit">tasks</span>
                                </div>
                            </div>
                        </div>

                        <div className="ar-donut-legend">
                            {donutData.map((item) => (
                                <div className="ar-donut-legend-item" key={item.label}>
                                    <span className="ar-donut-dot" style={{ borderColor: item.color }}></span>
                                    <div className="ar-donut-legend-copy">
                                        <div className="ar-donut-legend-label">{item.label}</div>
                                        <div className="ar-donut-legend-meta">
                                            {item.value} task{item.value !== 1 ? "s" : ""} · {item.percent}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="ar-card ar-card--table">
                <div className="ar-card-head">
                    <div>
                        <h5 className="ar-card-title">Quarterly Summary</h5>
                        <div className="ar-card-subtitle">Quarter-level totals and completion rate</div>
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
                                <th>Completion Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quarterlyTrend.map((q) => (
                                <tr key={q.quarter}>
                                    <td className="ar-strong-cell">{q.quarter_label}</td>
                                    <td className="ar-muted-cell">{q.quarter_range}</td>
                                    <td>{q.total}</td>
                                    <td>{q.completed}</td>
                                    <td>{q.ongoing}</td>
                                    <td className="ar-overdue-cell">{q.overdue}</td>
                                    <td>{renderCleanProgress(q.completion_rate, q.total)}</td>
                                </tr>
                            ))}
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
                                <th>Completion Rate</th>
                                <th style={{ textAlign: "center" }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp) => {
                                const rate = emp.completion_rate;
                                const total = emp.total;

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
                                        <td>{renderCleanProgress(rate, total)}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <button
                                                className="ar-eye-btn"
                                                title={`View ${emp.name}'s tasks for ${year}`}
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

            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    yearStart={yearStart}
                    yearEnd={yearEnd}
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("annualReportRoot"));
root.render(<AnnualReportPage />);