const { useEffect, useMemo, useRef, useState } = React;

const MANILA_TZ = "Asia/Manila";

const PREMIUM = {
    green: "#18B26B",
    blue: "#3B82F6",
    red: "#E5484D",

    greenSoft: "rgba(24,178,107,0.16)",
    blueSoft: "rgba(59,130,246,0.16)",
    redSoft: "rgba(229,72,77,0.14)",

    grid: "rgba(15,23,42,0.08)",
    text: "#8A94A6",
    title: "#202939",
    white: "#FFFFFF"
};

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

function portalWrap(children) {
    const target = document.getElementById("react-modal-root");
    return target ? ReactDOM.createPortal(children, target) : children;
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
    const bottomRef = useRef(null);
    const fileRef = useRef(null);

    useEffect(() => {
        setLoading(true);
        setError("");

        fetch(`php/get_task_messages.php?task_id=${task.id}`)
            .then((r) => {
                if (!r.ok) throw new Error(`Server returned ${r.status}`);
                return r.json();
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
        setSendError("");

        const fd = new FormData();
        fd.append("task_id", task.id);
        fd.append("recipient_id", recipientId);
        fd.append("message", trimmed);

        files.forEach((f) => fd.append("attachments[]", f));

        fetch("php/send_task_message.php", { method: "POST", body: fd })
            .then((r) => r.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setMessages((prev) => [...prev, data.message]);
                setText("");
                setFiles([]);
                setSending(false);
            })
            .catch((err) => {
                setSendError(err.message || "Failed to send message.");
                setSending(false);
            });
    };

    const handleFileChange = (e) => {
        const picked = Array.from(e.target.files || []);
        setFiles((prev) => {
            const existing = new Set(prev.map((f) => `${f.name}|${f.size}`));
            const fresh = picked.filter((f) => !existing.has(`${f.name}|${f.size}`));
            return [...prev, ...fresh];
        });
        e.target.value = "";
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const fmtTime = (ts) => {
        if (!ts) return "";
        const d = new Date(ts);
        return (
            d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) +
            ", " +
            d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
        );
    };

    const fmtSize = (bytes) => {
        const size = safeNum(bytes);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const initials = (name) =>
        name
            ? name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
            : "?";

    const avatarColor = (name) => {
        const hue = name
            ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
            : 200;
        return `hsl(${hue},50%,85%)`;
    };

    const avatarTextColor = (name) => {
        const hue = name
            ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
            : 200;
        return `hsl(${hue},50%,30%)`;
    };

    const canSend = !sending && (text.trim().length > 0 || files.length > 0);

    return portalWrap(
        <div
            className="dr-modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="dr-modal-card" style={{ maxWidth: "840px" }}>
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
                        <div className="dr-empty-state">Loading comments...</div>
                    ) : error ? (
                        <div className="alert alert-danger mb-0">{error}</div>
                    ) : messages.length === 0 ? (
                        <div className="dr-empty-state">
                            No comments yet. Be the first to comment.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {messages.map((msg) => {
                                const isOwn = msg.sender_id === currentUserId;

                                return (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: "flex",
                                            gap: "10px",
                                            flexDirection: isOwn ? "row-reverse" : "row",
                                            alignItems: "flex-start"
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "38px",
                                                height: "38px",
                                                borderRadius: "999px",
                                                background: avatarColor(msg.sender_name),
                                                color: avatarTextColor(msg.sender_name),
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 900,
                                                fontSize: "12px",
                                                flexShrink: 0,
                                                border: "1px solid var(--dr-border)"
                                            }}
                                        >
                                            {initials(msg.sender_name)}
                                        </div>

                                        <div style={{ maxWidth: "78%" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "baseline",
                                                    gap: "6px",
                                                    flexDirection: isOwn ? "row-reverse" : "row",
                                                    marginBottom: "4px"
                                                }}
                                            >
                                                <span style={{ fontSize: "12px", fontWeight: 800 }}>
                                                    {isOwn ? "You" : msg.sender_name}
                                                </span>
                                                <span style={{ fontSize: "11px", color: "var(--dr-subtle)" }}>
                                                    {fmtTime(msg.time_sent)}
                                                </span>
                                            </div>

                                            {msg.message && (
                                                <div
                                                    style={{
                                                        background: isOwn ? PREMIUM.blue : "var(--dr-card-soft)",
                                                        color: isOwn ? "#fff" : "var(--dr-text)",
                                                        borderRadius: isOwn
                                                            ? "16px 6px 16px 16px"
                                                            : "6px 16px 16px 16px",
                                                        padding: "10px 12px",
                                                        fontSize: "13px",
                                                        lineHeight: 1.55,
                                                        wordBreak: "break-word",
                                                        border: isOwn ? "none" : "1px solid var(--dr-border)"
                                                    }}
                                                >
                                                    {msg.message}
                                                </div>
                                            )}

                                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                                <div
                                                    style={{
                                                        marginTop: "6px",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "5px"
                                                    }}
                                                >
                                                    {msg.attachments.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={att.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "6px",
                                                                fontSize: "12px",
                                                                color: isOwn ? "#DBEAFE" : PREMIUM.blue,
                                                                textDecoration: "none",
                                                                background: isOwn
                                                                    ? "rgba(255,255,255,0.14)"
                                                                    : "rgba(59,130,246,0.08)",
                                                                borderRadius: "8px",
                                                                padding: "5px 8px",
                                                                width: "fit-content"
                                                            }}
                                                        >
                                                            <i className="bi bi-paperclip"></i>
                                                            {att.file_name}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef}></div>
                        </div>
                    )}
                </div>

                <div className="dr-modal-foot" style={{ display: "block" }}>
                    {sendError && (
                        <div style={{ fontSize: "12px", color: "#dc3545", marginBottom: "8px" }}>
                            {sendError}
                        </div>
                    )}

                    {files.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                                marginBottom: "10px"
                            }}
                        >
                            {files.map((f, i) => (
                                <div
                                    key={`${f.name}-${f.size}-${i}`}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "6px 10px",
                                        borderRadius: "10px",
                                        background: "rgba(59,130,246,0.08)",
                                        border: "1px solid rgba(59,130,246,0.16)",
                                        fontSize: "12px",
                                        color: "var(--dr-text)"
                                    }}
                                >
                                    <i className="bi bi-paperclip"></i>
                                    <span>{f.name}</span>
                                    <span style={{ color: "var(--dr-subtle)" }}>{fmtSize(f.size)}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            color: "var(--dr-subtle)"
                                        }}
                                    >
                                        <i className="bi bi-x"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />

                        <button
                            type="button"
                            className="dr-icon-btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={sending}
                            aria-label="Attach files"
                            title="Attach files"
                        >
                            <i className="bi bi-paperclip"></i>
                        </button>

                        <textarea
                            rows={2}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Write a comment... (Ctrl+Enter to send)"
                            style={{
                                flex: 1,
                                resize: "none",
                                border: "1px solid var(--dr-border)",
                                borderRadius: "12px",
                                padding: "10px 12px",
                                fontSize: "13px",
                                outline: "none",
                                fontFamily: "Nunito, sans-serif",
                                color: "var(--dr-text)",
                                background: "var(--dr-card)"
                            }}
                        />

                        <button
                            className="dr-ghost-btn"
                            onClick={handleSend}
                            disabled={!canSend}
                            style={{
                                background: PREMIUM.blue,
                                color: "#fff",
                                borderColor: PREMIUM.blue,
                                minWidth: "92px",
                                justifyContent: "center"
                            }}
                        >
                            {sending ? "Sending..." : "Send"}
                        </button>
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
            .then((r) => r.json())
            .then((data) => {
                if (data?.id) setCurrentUserId(data.id);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        setError("");
        setTasks([]);
        setActiveTab("all");

        fetch(
            `php/get_employee_tasks_annual.php?employee_id=${emp.id}&year_start=${yearStart}&year_end=${yearEnd}`
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
    }, [emp.id, yearStart, yearEnd]);

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
        return activeTab === "all"
            ? annotatedTasks
            : annotatedTasks.filter((task) => task.derivedStatus === activeTab);
    }, [annotatedTasks, activeTab]);

    const countFor = (status) =>
        annotatedTasks.filter((task) => task.derivedStatus === status).length;

    return portalWrap(
        <>
            <div
                className="dr-modal-backdrop"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div className="dr-modal-card">
                    <div className="dr-modal-head">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <img
                                src={buildAvatarFallbackUrl(emp.name)}
                                alt={`${emp.name} Profile`}
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "999px",
                                    border: "1px solid var(--dr-border)"
                                }}
                            />
                            <div>
                                <h5 className="dr-modal-title">{emp.name}</h5>
                                <div className="dr-modal-subtitle">
                                    {emp.department} · {yearStart} to {yearEnd}
                                </div>
                            </div>
                        </div>

                        <button className="dr-icon-btn" onClick={onClose} aria-label="Close">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="dr-modal-toolbar">
                        <div className="dr-pill-row">
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
                                        {tab.label}
                                        <span className="dr-pill-tab-count">{tab.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="dr-modal-body">
                        {loading ? (
                            <div className="dr-empty-state">Loading tasks...</div>
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

                                        if (
                                            task.days_until_deadline !== null &&
                                            task.days_until_deadline !== undefined
                                        ) {
                                            if (status === "Overdue") {
                                                deadlineMeta += ` · ${Math.abs(task.days_until_deadline)} day${
                                                    Math.abs(task.days_until_deadline) !== 1 ? "s" : ""
                                                } overdue`;
                                            } else if (status === "Ongoing") {
                                                deadlineMeta +=
                                                    task.days_until_deadline === 0
                                                        ? " · Due today"
                                                        : ` · ${task.days_until_deadline} day${
                                                              task.days_until_deadline !== 1 ? "s" : ""
                                                          } left`;
                                            } else if (status === "Completed" && task.completed_at) {
                                                deadlineMeta += ` · Done ${formatDatePH(task.completed_at, false)}`;
                                            }
                                        }
                                    }

                                    return (
                                        <div className="dr-task-item" key={task.id ?? idx}>
                                            <div className="dr-task-item-main">
                                                <div className="dr-task-item-title">
                                                    {task.title || "Untitled Task"}
                                                </div>
                                                {task.description && (
                                                    <div className="dr-task-item-desc">
                                                        {task.description}
                                                    </div>
                                                )}
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
                                                    className="dr-eye-btn"
                                                    title="Open comments"
                                                    onClick={() => setCommentTask(task)}
                                                >
                                                    <i className="bi bi-chat-dots"></i>
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

            {commentTask && (
                <TaskCommentModal
                    task={commentTask}
                    recipientId={emp.id}
                    currentUserId={currentUserId}
                    onClose={() => setCommentTask(null)}
                />
            )}
        </>
    );
}

function DepartmentTaskModal({ dept, yearStart, yearEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        setLoading(true);
        setError("");
        setTasks([]);
        setActiveTab("all");

        fetch(
            `php/get_department_tasks_report.php?department_id=${dept.department_id}&week_start=${yearStart}&week_end=${yearEnd}`
        )
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
    }, [dept.department_id, yearStart, yearEnd]);

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

    const filteredTasks =
        activeTab === "all"
            ? annotatedTasks
            : annotatedTasks.filter((task) => task.derivedStatus === activeTab);

    const countFor = (status) =>
        annotatedTasks.filter((task) => task.derivedStatus === status).length;

    return portalWrap(
        <div
            className="dr-modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="dr-modal-card">
                <div className="dr-modal-head">
                    <div>
                        <h5 className="dr-modal-title">{dept.department}</h5>
                        <div className="dr-modal-subtitle">
                            Department tasks · {yearStart.slice(0, 4)}
                        </div>
                    </div>

                    <button className="dr-icon-btn" onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="dr-modal-toolbar">
                    <div className="dr-pill-row">
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
                                    {tab.label}
                                    <span className="dr-pill-tab-count">{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="dr-modal-body">
                    {loading ? (
                        <div className="dr-empty-state">Loading tasks...</div>
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

                                    if (
                                        task.days_until_deadline !== null &&
                                        task.days_until_deadline !== undefined
                                    ) {
                                        if (status === "Overdue") {
                                            deadlineMeta += ` · ${Math.abs(task.days_until_deadline)} day${
                                                Math.abs(task.days_until_deadline) !== 1 ? "s" : ""
                                            } overdue`;
                                        } else if (status === "Ongoing") {
                                            deadlineMeta +=
                                                task.days_until_deadline === 0
                                                    ? " · Due today"
                                                    : ` · ${task.days_until_deadline} day${
                                                          task.days_until_deadline !== 1 ? "s" : ""
                                                      } left`;
                                        } else if (status === "Completed" && task.completed_at) {
                                            deadlineMeta += ` · Done ${formatDatePH(task.completed_at, false)}`;
                                        }
                                    }
                                }

                                return (
                                    <div className="dr-task-item" key={task.id ?? idx}>
                                        <div className="dr-task-item-main">
                                            <div className="dr-task-item-title">
                                                {task.title || "Untitled Task"}
                                            </div>
                                            {task.description && (
                                                <div className="dr-task-item-desc">
                                                    {task.description}
                                                </div>
                                            )}
                                            <div className="dr-task-item-meta">
                                                {task.assigned_to_name
                                                    ? `${task.assigned_to_name} · ${deadlineMeta}`
                                                    : deadlineMeta}
                                            </div>
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

function buildPremiumLineOption(labels, completed, ongoing, overdue, isDark) {
    return {
        backgroundColor: "transparent",
        animationDuration: 700,
        animationEasing: "cubicOut",
        color: [PREMIUM.green, PREMIUM.blue, PREMIUM.red],

        grid: {
            top: 28,
            left: 18,
            right: 18,
            bottom: 52,
            containLabel: true
        },

        tooltip: {
            trigger: "axis",
            backgroundColor: isDark ? "#182133" : "#fff",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
            borderWidth: 1,
            textStyle: {
                color: isDark ? "#f8fafc" : "#202939",
                fontFamily: "Nunito, sans-serif"
            },
            extraCssText: "border-radius:14px; box-shadow:0 12px 30px rgba(15,23,42,0.10);"
        },

        legend: {
            bottom: 2,
            right: 8,
            itemWidth: 10,
            itemHeight: 10,
            icon: "circle",
            textStyle: {
                color: isDark ? "#a8b3c7" : PREMIUM.text,
                fontSize: 12,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700
            }
        },

        xAxis: {
            type: "category",
            boundaryGap: false,
            data: labels,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: isDark ? "#a8b3c7" : PREMIUM.text,
                fontSize: 12,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                margin: 14
            }
        },

        yAxis: {
            type: "value",
            min: 0,
            minInterval: 1,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: isDark ? "#a8b3c7" : PREMIUM.text,
                fontSize: 12,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                margin: 12
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: isDark ? "rgba(255,255,255,0.08)" : PREMIUM.grid,
                    width: 1,
                    type: "solid"
                }
            }
        },

        series: [
            {
                name: "Task Completed",
                type: "line",
                smooth: true,
                symbol: "circle",
                symbolSize: 5,
                data: completed,
                lineStyle: {
                    width: 2,
                    color: PREMIUM.green
                },
                itemStyle: {
                    color: PREMIUM.green
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: "rgba(24,178,107,0.18)" },
                        { offset: 1, color: "rgba(24,178,107,0.02)" }
                    ])
                },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: {
                        color: "rgba(24,178,107,0.35)",
                        type: "dotted",
                        width: 1
                    },
                    data: [{ yAxis: 2 }]
                }
            },
            {
                name: "Task Ongoing",
                type: "line",
                smooth: true,
                symbol: "circle",
                symbolSize: 4,
                data: ongoing,
                lineStyle: {
                    width: 1.8,
                    color: PREMIUM.blue
                },
                itemStyle: {
                    color: PREMIUM.blue
                },
                areaStyle: { opacity: 0 },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: {
                        color: "rgba(59,130,246,0.28)",
                        type: "dotted",
                        width: 1
                    },
                    data: [{ yAxis: 1 }]
                }
            },
            {
                name: "Task Overdue",
                type: "line",
                smooth: true,
                symbol: "circle",
                symbolSize: 4,
                data: overdue,
                lineStyle: {
                    width: 1.8,
                    color: PREMIUM.red
                },
                itemStyle: {
                    color: PREMIUM.red
                },
                areaStyle: { opacity: 0 },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: {
                        color: "rgba(229,72,77,0.24)",
                        type: "dotted",
                        width: 1
                    },
                    data: [{ yAxis: 0 }]
                }
            }
        ]
    };
}

function buildPremiumGroupedBarOption(
    labels,
    aLabel,
    aSeries,
    bLabel,
    bSeries,
    cLabel,
    cSeries,
    isDark,
    opts = {}
) {
    const rotateLabels = opts.rotateLabels ?? false;
    const bottomSpace = opts.bottomSpace ?? 52;
    const barWidth = opts.barWidth ?? 16;
    const labelInterval = opts.labelInterval ?? 0;

    return {
        backgroundColor: "transparent",
        animationDuration: 700,
        animationEasing: "cubicOut",
        color: [PREMIUM.green, PREMIUM.blue, PREMIUM.red],

        grid: {
            top: 24,
            left: 18,
            right: 16,
            bottom: bottomSpace,
            containLabel: true
        },

        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow",
                shadowStyle: {
                    color: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)"
                }
            },
            backgroundColor: isDark ? "#182133" : "#fff",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
            borderWidth: 1,
            textStyle: {
                color: isDark ? "#f8fafc" : "#202939",
                fontFamily: "Nunito, sans-serif"
            },
            extraCssText: "border-radius:14px; box-shadow:0 12px 30px rgba(15,23,42,0.10);"
        },

        legend: {
            bottom: 2,
            right: 8,
            itemWidth: 10,
            itemHeight: 10,
            icon: "circle",
            textStyle: {
                color: isDark ? "#a8b3c7" : PREMIUM.text,
                fontSize: 12,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700
            }
        },

        xAxis: {
            type: "category",
            data: labels,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: isDark ? "#a8b3c7" : PREMIUM.text,
                fontSize: 11,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                margin: 12,
                interval: labelInterval,
                rotate: rotateLabels ? 22 : 0,
                hideOverlap: false
            }
        },

        yAxis: {
            type: "value",
            min: 0,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: isDark ? "#a8b3c7" : PREMIUM.text,
                fontSize: 12,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: isDark ? "rgba(255,255,255,0.08)" : PREMIUM.grid,
                    width: 1
                }
            }
        },

        series: [
            {
                name: aLabel,
                type: "bar",
                data: aSeries,
                barWidth,
                barGap: "24%",
                itemStyle: {
                    color: "rgba(24,178,107,0.74)",
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: PREMIUM.green
                    }
                }
            },
            {
                name: bLabel,
                type: "bar",
                data: bSeries,
                barWidth,
                itemStyle: {
                    color: "rgba(59,130,246,0.74)",
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: PREMIUM.blue
                    }
                }
            },
            ...(cSeries
                ? [
                      {
                          name: cLabel,
                          type: "bar",
                          data: cSeries,
                          barWidth,
                          itemStyle: {
                              color: "rgba(229,72,77,0.74)",
                              borderRadius: [4, 4, 0, 0]
                          },
                          emphasis: {
                              itemStyle: {
                                  color: PREMIUM.red
                              }
                          }
                      }
                  ]
                : [])
        ]
    };
}

function buildPremiumDonutOption(summary, isDark) {
    const separatorColor = isDark ? "#12192b" : "#ffffff";

    return {
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
        legend: {
            bottom: 0,
            icon: "circle",
            textStyle: {
                color: isDark ? "#a8b3c7" : PREMIUM.text,
                fontFamily: "Nunito, sans-serif",
                fontSize: 12,
                fontWeight: 700
            }
        },
        series: [
            {
                type: "pie",
                radius: ["60%", "82%"],
                center: ["50%", "42%"],
                startAngle: 90,
                clockwise: true,
                minAngle: 1,
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
                data: [
                    {
                        value: safeNum(summary.completed),
                        name: "Completed",
                        itemStyle: { color: PREMIUM.green }
                    },
                    {
                        value: safeNum(summary.ongoing),
                        name: "Ongoing",
                        itemStyle: { color: PREMIUM.blue }
                    },
                    {
                        value: safeNum(summary.overdue),
                        name: "Overdue",
                        itemStyle: { color: PREMIUM.red }
                    }
                ]
            }
        ]
    };
}

function AnnualReportPage() {
    const now = new Date();

    const [summary, setSummary] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        overdue: 0
    });
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

    const deptChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const quarterChartRef = useRef(null);
    const donutChartRef = useRef(null);
    const employeeChartRef = useRef(null);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    useEffect(() => {
        fetch("php/get_departments.php")
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => setAllDepartments(Array.isArray(data) ? data : []))
            .catch(() => setAllDepartments([]));
    }, []);

    useEffect(() => {
        setSelectedDept(null);
        setModalEmp(null);
        setModalDept(null);

        fetch(`php/get_annual_report.php?year=${year}&department=${departmentFilter}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setDepartments(Array.isArray(data.departments) ? data.departments : []);
                setQuarterlyTrend(Array.isArray(data.quarterly_trend) ? data.quarterly_trend : []);
                setMonthlyTrend(Array.isArray(data.monthly_trend) ? data.monthly_trend : []);
                setEmployees(Array.isArray(data.employees) ? data.employees : []);
            })
            .catch((err) => {
                console.error("Failed to load annual report:", err);
                setSummary({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setDepartments([]);
                setQuarterlyTrend([]);
                setMonthlyTrend([]);
                setEmployees([]);
            });
    }, [year, departmentFilter]);

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

    const isDark = themeMode === "dark";

    const summaryTotal = useMemo(() => {
        return safeNum(summary.total) ||
            safeNum(summary.completed) + safeNum(summary.ongoing) + safeNum(summary.overdue);
    }, [summary]);

    const summaryRate = pct(summary.completed, summaryTotal);
    const isCurrentYear = year === now.getFullYear();

    const chartDepts = useMemo(() => {
        return selectedDept
            ? departments.filter((d) => d.department_id === selectedDept.department_id)
            : departments;
    }, [departments, selectedDept]);

    const deptLabels = useMemo(() => chartDepts.map((d) => d.department), [chartDepts]);
    const deptCompleted = useMemo(() => chartDepts.map((d) => safeNum(d.completed)), [chartDepts]);
    const deptOngoing = useMemo(() => chartDepts.map((d) => safeNum(d.ongoing)), [chartDepts]);
    const deptOverdue = useMemo(() => chartDepts.map((d) => safeNum(d.overdue)), [chartDepts]);

    const monthNames = useMemo(() => monthlyTrend.map((m) => m.month_name), [monthlyTrend]);
    const lineCompleted = useMemo(() => monthlyTrend.map((m) => safeNum(m.completed)), [monthlyTrend]);
    const lineOngoing = useMemo(() => monthlyTrend.map((m) => safeNum(m.ongoing)), [monthlyTrend]);
    const lineOverdue = useMemo(() => monthlyTrend.map((m) => safeNum(m.overdue)), [monthlyTrend]);

    const quarterLabels = useMemo(() => quarterlyTrend.map((q) => q.quarter_label), [quarterlyTrend]);
    const qCompleted = useMemo(() => quarterlyTrend.map((q) => safeNum(q.completed)), [quarterlyTrend]);
    const qOngoing = useMemo(() => quarterlyTrend.map((q) => safeNum(q.ongoing)), [quarterlyTrend]);
    const qOverdue = useMemo(() => quarterlyTrend.map((q) => safeNum(q.overdue)), [quarterlyTrend]);

    const employeeSorted = useMemo(() => {
        return [...employees].sort((a, b) => safeNum(b.completion_rate) - safeNum(a.completion_rate));
    }, [employees]);

    const empNames = useMemo(() => employeeSorted.map((e) => e.name), [employeeSorted]);
    const empCompleted = useMemo(() => employeeSorted.map((e) => safeNum(e.completed)), [employeeSorted]);
    const empOngoing = useMemo(() => employeeSorted.map((e) => safeNum(e.ongoing)), [employeeSorted]);
    const empOverdue = useMemo(() => employeeSorted.map((e) => safeNum(e.overdue)), [employeeSorted]);

    useEffect(() => {
        if (!window.echarts || !deptChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(deptChartRef.current) ||
            window.echarts.init(deptChartRef.current);

        chart.setOption(
            buildPremiumGroupedBarOption(
                deptLabels,
                "Completed",
                deptCompleted,
                "Ongoing",
                deptOngoing,
                "Overdue",
                deptOverdue,
                isDark
            ),
            true
        );

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [deptLabels, deptCompleted, deptOngoing, deptOverdue, isDark]);

    useEffect(() => {
        if (!window.echarts || !lineChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(lineChartRef.current) ||
            window.echarts.init(lineChartRef.current);

        chart.setOption(
            buildPremiumLineOption(
                monthNames,
                lineCompleted,
                lineOngoing,
                lineOverdue,
                isDark
            ),
            true
        );

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [monthNames, lineCompleted, lineOngoing, lineOverdue, isDark]);

    useEffect(() => {
        if (!window.echarts || !quarterChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(quarterChartRef.current) ||
            window.echarts.init(quarterChartRef.current);

        chart.setOption(
            buildPremiumGroupedBarOption(
                quarterLabels,
                "Completed",
                qCompleted,
                "Ongoing",
                qOngoing,
                "Overdue",
                qOverdue,
                isDark
            ),
            true
        );

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [quarterLabels, qCompleted, qOngoing, qOverdue, isDark]);

    useEffect(() => {
        if (!window.echarts || !donutChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(donutChartRef.current) ||
            window.echarts.init(donutChartRef.current);

        chart.setOption(buildPremiumDonutOption(summary, isDark), true);

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [summary, isDark]);

    useEffect(() => {
        if (!window.echarts || !employeeChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(employeeChartRef.current) ||
            window.echarts.init(employeeChartRef.current);

        const shouldRotate = empNames.length > 8;

        chart.setOption(
            buildPremiumGroupedBarOption(
                empNames,
                "Completed",
                empCompleted,
                "Ongoing",
                empOngoing,
                "Overdue",
                empOverdue,
                isDark,
                {
                    rotateLabels: shouldRotate,
                    bottomSpace: shouldRotate ? 86 : 58,
                    barWidth: shouldRotate ? 14 : 16,
                    labelInterval: 0
                }
            ),
            true
        );

        const onResize = () => chart.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chart.dispose();
        };
    }, [empNames, empCompleted, empOngoing, empOverdue, isDark]);

    return (
        <div className="dr-page">
            <div className="dr-toolbar">
                <div>
                    <h2 className="dr-toolbar-title">Annual Task Report</h2>
                    <div className="dr-toolbar-subtitle">
                        Department-wide yearly analytics, trends, and assignee performance
                    </div>
                </div>

                <div className="dr-toolbar-group">
                    <button
                        className="dr-icon-btn"
                        onClick={() => setYear((y) => y - 1)}
                        aria-label="Previous year"
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>

                    <div className="dr-filter-pill">{year}</div>

                    <button
                        className="dr-icon-btn"
                        onClick={() => setYear((y) => y + 1)}
                        disabled={isCurrentYear}
                        aria-label="Next year"
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>

                    {!isCurrentYear && (
                        <button
                            className="dr-ghost-btn"
                            onClick={() => setYear(now.getFullYear())}
                        >
                            This Year
                        </button>
                    )}

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
                </div>
            </div>

            <div className="dr-summary-grid">
                <SummaryCard
                    icon="bi-list-task"
                    label="Total Tasks"
                    value={summaryTotal}
                    subtext="All tasks recorded this year"
                    tone="primary"
                    meta={`${year}`}
                />
                <SummaryCard
                    icon="bi-check2-circle"
                    label="Completed"
                    value={safeNum(summary.completed)}
                    subtext="Finished tasks in selected scope"
                    tone="success"
                    meta={`${pct(summary.completed, summaryTotal)}% of total`}
                />
                <SummaryCard
                    icon="bi-arrow-repeat"
                    label="Ongoing"
                    value={safeNum(summary.ongoing)}
                    subtext="Active tasks being worked on"
                    tone="warning"
                    meta={`${pct(summary.ongoing, summaryTotal)}% of total`}
                />
                <SummaryCard
                    icon="bi-exclamation-circle"
                    label="Overdue"
                    value={safeNum(summary.overdue)}
                    subtext="Tasks past the deadline"
                    tone="danger"
                    meta={`${pct(summary.overdue, summaryTotal)}% of total`}
                />
                <SummaryCard
                    icon="bi-graph-up-arrow"
                    label="Completion Rate"
                    value={`${summaryRate}%`}
                    subtext="Share of completed tasks"
                    tone="primary"
                    meta={`${employees.length} staff member${employees.length !== 1 ? "s" : ""}`}
                />
            </div>

            <div
                className="dr-top-grid"
                style={{
                    gridTemplateColumns: "minmax(300px, 0.72fr) minmax(0, 1.58fr)"
                }}
            >
                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Annual Status Mix</h5>
                            <div className="dr-card-subtitle">
                                Overall status distribution for {year}
                            </div>
                        </div>

                        <div className="dr-filter-pill">{summaryTotal} tasks</div>
                    </div>

                    <div ref={donutChartRef} className="dr-chart-box dr-chart-box--sm"></div>
                </div>

                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Employee Performance</h5>
                            <div className="dr-card-subtitle">
                                Sorted by completion rate and task volume
                            </div>
                        </div>

                        <div className="dr-filter-pill">
                            {employeeSorted.length} employee{employeeSorted.length !== 1 ? "s" : ""}
                        </div>
                    </div>

                    <div
                        ref={employeeChartRef}
                        className="dr-chart-box"
                        style={{ height: "360px" }}
                    ></div>
                </div>
            </div>

            <div className="dr-card" style={{ marginBottom: "18px" }}>
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Task Status Trend</h5>
                        <div className="dr-card-subtitle">
                            Monthly completed, ongoing, and overdue task movement
                        </div>
                    </div>

                    <div className="dr-filter-pill">This Year</div>
                </div>

                <div ref={lineChartRef} className="dr-chart-box"></div>
            </div>

            <div
                className="dr-bottom-grid"
                style={{
                    gridTemplateColumns: "minmax(0, 0.92fr) minmax(0, 1.28fr)"
                }}
            >
                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Quarterly Breakdown</h5>
                            <div className="dr-card-subtitle">
                                Status composition across Q1–Q4
                            </div>
                        </div>

                        <div className="dr-filter-pill">Quarterly</div>
                    </div>

                    <div ref={quarterChartRef} className="dr-chart-box"></div>
                </div>

                <div className="dr-card">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Department Task Comparison</h5>
                            <div className="dr-card-subtitle">
                                {selectedDept
                                    ? `Focused: ${selectedDept.department}`
                                    : `Completed, ongoing, and overdue totals by department for ${year}`}
                            </div>
                        </div>

                        {selectedDept ? (
                            <button
                                className="dr-filter-pill dr-filter-pill--button"
                                onClick={() => setSelectedDept(null)}
                            >
                                Clear Focus
                            </button>
                        ) : (
                            <div className="dr-filter-pill">This Year</div>
                        )}
                    </div>

                    <div ref={deptChartRef} className="dr-chart-box"></div>
                </div>
            </div>

            <div className="dr-card" style={{ marginBottom: "18px" }}>
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Department Details</h5>
                        <div className="dr-card-subtitle">
                            Click a row to focus charts · click the eye icon to inspect tasks
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {departments.length} department{departments.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div className="dr-table-shell">
                    <table className="dr-table">
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>Total</th>
                                <th>Completed</th>
                                <th>Ongoing</th>
                                <th>Overdue</th>
                                <th>Completion Rate</th>
                                <th style={{ width: "70px", textAlign: "center" }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="dr-table-empty">
                                        No departments found for this year.
                                    </td>
                                </tr>
                            ) : (
                                departments.map((dept) => {
                                    const active =
                                        selectedDept?.department_id === dept.department_id;

                                    return (
                                        <tr
                                            key={dept.department_id}
                                            className={active ? "is-active" : ""}
                                            onClick={() =>
                                                setSelectedDept((prev) =>
                                                    prev?.department_id === dept.department_id
                                                        ? null
                                                        : dept
                                                )
                                            }
                                        >
                                            <td>{dept.department}</td>
                                            <td>{safeNum(dept.total)}</td>
                                            <td>{safeNum(dept.completed)}</td>
                                            <td>{safeNum(dept.ongoing)}</td>
                                            <td className="dr-overdue-cell">{safeNum(dept.overdue)}</td>
                                            <td>
                                                <div className="dr-rate-bar">
                                                    <div
                                                        className="dr-rate-fill"
                                                        style={{
                                                            width: `${safeNum(dept.completion_rate)}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="dr-rate-text">
                                                    {safeNum(dept.completion_rate)}%
                                                </div>
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

            <div className="dr-card">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Employee Details</h5>
                        <div className="dr-card-subtitle">
                            Review annual assignee performance and inspect task lists
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {employees.length} employee{employees.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div className="dr-table-shell">
                    <table className="dr-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Completed</th>
                                <th>Ongoing</th>
                                <th>Overdue</th>
                                <th>Completion Rate</th>
                                <th style={{ width: "70px", textAlign: "center" }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="dr-table-empty">
                                        No employees found for this year.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td>{emp.name}</td>
                                        <td>{emp.department}</td>
                                        <td>{safeNum(emp.completed)}</td>
                                        <td>{safeNum(emp.ongoing)}</td>
                                        <td className="dr-overdue-cell">{safeNum(emp.overdue)}</td>
                                        <td>
                                            <div className="dr-rate-bar">
                                                <div
                                                    className="dr-rate-fill"
                                                    style={{
                                                        width: `${safeNum(emp.completion_rate)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="dr-rate-text">
                                                {safeNum(emp.completion_rate)}%
                                            </div>
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
                                                title={`View ${emp.name} tasks`}
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

            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    yearStart={yearStart}
                    yearEnd={yearEnd}
                    onClose={() => setModalEmp(null)}
                />
            )}

            {modalDept && (
                <DepartmentTaskModal
                    dept={modalDept}
                    yearStart={yearStart}
                    yearEnd={yearEnd}
                    onClose={() => setModalDept(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("annualReportRoot"));
root.render(<AnnualReportPage />);