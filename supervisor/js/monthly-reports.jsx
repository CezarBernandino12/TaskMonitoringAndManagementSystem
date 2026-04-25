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


function safeNum(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

const MANILA_TZ = "Asia/Manila";

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

    return (
        <div className="mr-performance-cell">
            <div className="mr-progress-clean" title={`${rate}% completed`}>
                <div className="mr-progress-clean-track">
                    <div
                        className="mr-progress-clean-fill"
                        style={{ width: `${rate}%` }}
                    ></div>
                </div>
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
        if (!recipientId) {
            setSendError("Could not identify the message recipient.");
            return;
        }

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

    const canSend = !sending && Boolean(recipientId) && (text.trim().length > 0 || files.length > 0);

    return (
        <div className="mr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div
                className="mr-modal-card mr-comment-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Comments for ${task.title}`}
            >
                <div className="mr-modal-head">
                    <div>
                        <h5 className="mr-modal-title">
                            <i className="bi bi-chat-dots me-2"></i>
                            {task.title || "Task Comments"}
                        </h5>
                        <div className="mr-modal-subtitle">
                            {messages.length} comment{messages.length !== 1 ? "s" : ""}
                        </div>
                    </div>

                    <button className="mr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="mr-modal-body">
                    {loading ? (
                        <div className="mr-empty-state">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading comments...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : messages.length === 0 ? (
                        <div className="mr-empty-state mr-chat-empty-state">
                            <div className="mr-chat-empty-icon">
                                <i className="bi bi-chat-quote-fill"></i>
                            </div>
                            <div className="mr-chat-empty-title">No comments yet</div>
                            <div className="mr-chat-empty-subtitle">
                                No comments yet. Be the first to reply.
                            </div>
                        </div>
                    ) : (
                        <div className="mr-comment-stream">
                            {messages.map((msg) => {
                                const isOwn = safeNum(msg.sender_id) === safeNum(currentUserId);
                                return (
                                    <div key={msg.id} className={`mr-comment-row ${isOwn ? "is-own" : ""}`}>
                                        <div
                                            className="mr-comment-avatar"
                                            style={{
                                                background: avatarColor(msg.sender_name),
                                                color: avatarTextColor(msg.sender_name)
                                            }}
                                        >
                                            {initials(msg.sender_name)}
                                        </div>
                                        <div className="mr-comment-bubble-wrap">
                                            <div className="mr-comment-meta">
                                                <span className="mr-comment-author">
                                                    {isOwn ? "You" : msg.sender_name}
                                                </span>
                                                <span className="mr-comment-time">
                                                    {formatDateTimePH(msg.time_sent)}
                                                </span>
                                            </div>
                                            {msg.message ? <div className="mr-comment-bubble">{msg.message}</div> : null}
                                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                                                <div className="mr-comment-attachments">
                                                    {msg.attachments.map((att) => (
                                                        <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer" className="mr-file-chip">
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

                <div className="mr-modal-foot mr-comment-foot">
                    <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={handleFileChange} />
                    <div className="mr-comment-compose">
                        {sendError ? <div className="mr-comment-error">{sendError}</div> : null}
                        {files.length > 0 ? (
                            <div className="mr-file-chip-row">
                                {files.map((file, index) => (
                                    <div className="mr-file-chip is-staged" key={`${file.name}-${index}`}>
                                        <i className="bi bi-paperclip"></i>
                                        <span className="mr-file-chip-name">{file.name}</span>
                                        <span className="mr-file-chip-size">{fmtSize(file.size)}</span>
                                        <button type="button" className="mr-file-chip-remove" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}>
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <div className="mr-comment-compose-row">
                            <button type="button" className="mr-icon-btn" onClick={() => fileRef.current?.click()} disabled={sending} title="Attach files">
                                <i className="bi bi-paperclip"></i>
                            </button>
                            <textarea
                                className="mr-compose-textarea"
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
                            <button type="button" className="mr-ghost-btn mr-send-btn" onClick={handleSend} disabled={!canSend}>
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


function EmployeeTaskModal({ emp, monthStart, monthEnd, onClose }) {
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

        fetch(`php/get_employee_tasks_report.php?employee_id=${encodeURIComponent(emp.id)}&week_start=${monthStart}&week_end=${monthEnd}`)
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

    const annotated = useMemo(() => tasks.map((t) => ({ ...t, derivedStatus: t.derived_status ?? t.status ?? "Other" })), [tasks]);
    const counts = useMemo(() => ({
        all: annotated.length,
        Completed: annotated.filter((t) => t.derivedStatus === "Completed").length,
        Ongoing: annotated.filter((t) => t.derivedStatus === "Ongoing").length,
        Overdue: annotated.filter((t) => t.derivedStatus === "Overdue").length
    }), [annotated]);
    const filtered = useMemo(() => activeTab === "all" ? annotated : annotated.filter((t) => t.derivedStatus === activeTab), [annotated, activeTab]);
    const monthLabel = new Date(`${monthStart}T00:00:00`).toLocaleDateString("en-PH", { month: "long", year: "numeric" });

    return (
        <>
            <div className="mr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="mr-modal-card mr-employee-task-modal" role="dialog" aria-modal="true" aria-label={`${emp.name} monthly tasks`}>
                    <div className="mr-modal-head">
                        <div className="mr-modal-person">
                            <img src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)} alt={`${emp.name} Profile`} className="mr-modal-avatar" />
                            <div>
                                <h5 className="mr-modal-title">{emp.name}</h5>
                                <div className="mr-modal-subtitle">{emp.department} · {monthLabel}</div>
                            </div>
                        </div>
                        <button className="mr-icon-btn" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg"></i></button>
                    </div>
                    <div className="mr-modal-toolbar mr-modal-toolbar--badges-only">
                        <div className="mr-pill-row mr-pill-row--clean">
                            {[
                                { key: "all", label: "All", count: counts.all, tone: "neutral" },
                                { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                                { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                                { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                            ].map((tab) => (
                                <button key={tab.key} type="button" className={`mr-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                                    <span className="mr-pill-tab-label">{tab.label}</span>
                                    <span className="mr-pill-count">{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mr-modal-body">
                        {loading ? (
                            <div className="mr-empty-state"><div className="spinner-border spinner-border-sm me-2" role="status"></div>Loading tasks...</div>
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
                                    let deadlineText = task.deadline ? new Date(task.deadline).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "No deadline";
                                    if (status === "Overdue" && days !== null && days !== undefined) {
                                        deadlineText += ` · ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
                                    } else if (status === "Ongoing" && days !== null && days !== undefined) {
                                        deadlineText += days === 0 ? " · Due today" : ` · ${days} day${days !== 1 ? "s" : ""} left`;
                                    } else if (status === "Completed" && task.completed_at) {
                                        deadlineText += ` · Done ${new Date(task.completed_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;
                                    }
                                    return (
                                        <div className="mr-task-item" key={task.id ?? idx}>
                                            <div className="mr-task-main">
                                                <div className="mr-task-title">{task.title || "Untitled Task"}</div>
                                                {task.description ? <div className="mr-task-desc">{task.description}</div> : null}
                                                <div className="mr-task-meta">{deadlineText}</div>
                                            </div>
                                            <div className="mr-task-side">
                                                <span className={`mr-status-inline ${statusTone(status)}`}>{status}</span>
                                                <span className={`mr-priority-inline ${priorityTone(priority)}`}><i className="bi bi-flag-fill"></i><span>{priority}</span></span>
                                                <button type="button" className="mr-ghost-btn mr-comment-open-btn" onClick={() => setCommentTask(task)}><i className="bi bi-chat-dots"></i><span>Comments</span></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="mr-modal-foot"><button className="mr-ghost-btn" onClick={onClose}>Close</button></div>
                </div>
            </div>
            {commentTask ? <TaskCommentModal task={commentTask} recipientId={emp.id} currentUserId={currentUserId} onClose={() => setCommentTask(null)} /> : null}
        </>
    );
}



function DepartmentTaskModal({ dept, monthStart, monthEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        setLoading(true);
        setError("");
        setTasks([]);
        setActiveTab("all");

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

    const annotated = useMemo(() => tasks.map((t) => ({ ...t, derivedStatus: t.derived_status ?? t.status ?? "Other" })), [tasks]);
    const counts = useMemo(() => ({
        all: annotated.length,
        Completed: annotated.filter((t) => t.derivedStatus === "Completed").length,
        Ongoing: annotated.filter((t) => t.derivedStatus === "Ongoing").length,
        Overdue: annotated.filter((t) => t.derivedStatus === "Overdue").length
    }), [annotated]);
    const filtered = useMemo(() => activeTab === "all" ? annotated : annotated.filter((t) => t.derivedStatus === activeTab), [annotated, activeTab]);
    const monthLabel = new Date(`${monthStart}T00:00:00`).toLocaleDateString("en-PH", { month: "long", year: "numeric" });

    return (
        <div className="mr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="mr-modal-card mr-modal-card--wide mr-employee-task-modal mr-department-task-modal" role="dialog" aria-modal="true" aria-label={`${dept.department} monthly tasks`}>
                <div className="mr-modal-head">
                    <div className="mr-modal-person">
                        <div className="mr-modal-avatar mr-modal-avatar--dept"><i className="bi bi-buildings"></i></div>
                        <div><h5 className="mr-modal-title">{dept.department}</h5><div className="mr-modal-subtitle">Department tasks · {monthLabel}</div></div>
                    </div>
                    <button className="mr-icon-btn" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="mr-modal-toolbar mr-modal-toolbar--badges-only">
                    <div className="mr-pill-row mr-pill-row--clean">
                        {[
                            { key: "all", label: "All", count: counts.all, tone: "neutral" },
                            { key: "Completed", label: "Completed", count: counts.Completed, tone: "success" },
                            { key: "Ongoing", label: "Ongoing", count: counts.Ongoing, tone: "warning" },
                            { key: "Overdue", label: "Overdue", count: counts.Overdue, tone: "danger" }
                        ].map((tab) => (
                            <button key={tab.key} type="button" className={`mr-pill-tab ${tab.tone} ${activeTab === tab.key ? "is-active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                                <span className="mr-pill-tab-label">{tab.label}</span>
                                <span className="mr-pill-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mr-modal-body">
                    {loading ? (
                        <div className="mr-empty-state"><div className="spinner-border spinner-border-sm me-2" role="status"></div>Loading tasks...</div>
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
                                let deadlineText = task.deadline ? new Date(task.deadline).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "No deadline";
                                if (status === "Overdue" && days !== null && days !== undefined) {
                                    deadlineText += ` · ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
                                } else if (status === "Ongoing" && days !== null && days !== undefined) {
                                    deadlineText += days === 0 ? " · Due today" : ` · ${days} day${days !== 1 ? "s" : ""} left`;
                                } else if (status === "Completed" && task.completed_at) {
                                    deadlineText += ` · Done ${new Date(task.completed_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;
                                }
                                return (
                                    <div className="mr-task-item" key={task.id ?? idx}>
                                        <div className="mr-task-main">
                                            <div className="mr-task-title">{task.title || "Untitled Task"}</div>
                                            {task.description ? <div className="mr-task-desc">{task.description}</div> : null}
                                            <div className="mr-task-assignee"><i className="bi bi-person"></i><span>{task.assigned_to_name || "Unassigned"}</span></div>
                                            <div className="mr-task-meta">{deadlineText}</div>
                                        </div>
                                        <div className="mr-task-side">
                                            <span className={`mr-status-inline ${statusTone(status)}`}>{status}</span>
                                            <span className={`mr-priority-inline ${priorityTone(priority)}`}><i className="bi bi-flag-fill"></i><span>{priority}</span></span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="mr-modal-foot"><button className="mr-ghost-btn" onClick={onClose}>Close</button></div>
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
                color: ["#16a34a", "#2563eb", "#e11d48"],
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
                color: ["#16a34a", "#2563eb", "#e11d48"],
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
                color: ["#16a34a", "#e11d48"],
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
                        <button className="mr-filter-pill mr-filter-pill--button" onClick={goToCurrentMonth}>
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
                                                    src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
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