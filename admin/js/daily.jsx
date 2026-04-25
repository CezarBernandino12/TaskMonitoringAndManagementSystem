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
        ? name
              .split(" ")
              .map((word) => word[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
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
                                placeholder="Write a thoughtful reply..."
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

function EmployeeTaskModal({ emp, onClose }) {
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
        fetch(`php/get_employee_tasks_report.php?employee_id=${emp.id}`)
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
    }, [emp.id]);

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
                aria-label={`${emp.name} tasks`}
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
                                <div className="dr-modal-subtitle">{emp.department}</div>
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

function compactEmployeeName(name) {
    if (!name) return "";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function DailyReportPage() {
    const [summary, setSummary] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        overdue: 0
    });
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [themeMode, setThemeMode] = useState(getThemeMode());
    const [deptOpen, setDeptOpen] = useState(false);

    const deptDropdownRef = useRef(null);
    const trendChartRef = useRef(null);
    const donutChartRef = useRef(null);

    useEffect(() => {
        fetch("php/get_departments.php")
            .then((res) => res.json())
            .then((data) => {
                setDepartments(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                setDepartments([]);
            });
    }, []);

    useEffect(() => {
        setLoading(true);
        setError("");
        setSelectedEmp(null);

        fetch(`php/get_daily_report.php?department=${departmentFilter}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then((data) => {
                setSummary(
                    data.summary ?? {
                        total: 0,
                        completed: 0,
                        ongoing: 0,
                        overdue: 0
                    }
                );
                setEmployees(Array.isArray(data.employees) ? data.employees : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Failed to load report: ${err.message}`);
                setLoading(false);
            });
    }, [departmentFilter]);

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

    const departmentLabel = useMemo(() => {
        if (departmentFilter === "all") return "All Departments";
        const found = departments.find(
            (dep) => String(dep.id) === String(departmentFilter)
        );
        return found?.name || "Selected Department";
    }, [departments, departmentFilter]);

    const employeeRows = useMemo(
        () =>
            employees.map((emp) => {
                const completed = safeNum(emp.completed);
                const ongoing = safeNum(emp.ongoing);
                const overdue = safeNum(emp.overdue);
                const total = completed + ongoing + overdue;

                return {
                    ...emp,
                    completed,
                    ongoing,
                    overdue,
                    total,
                    completionRate: pct(completed, total)
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

        const completed = safeNum(selectedEmp.completed);
        const ongoing = safeNum(selectedEmp.ongoing);
        const overdue = safeNum(selectedEmp.overdue);

        return {
            total: completed + ongoing + overdue,
            completed,
            ongoing,
            overdue
        };
    }, [selectedEmp, summary]);

    const chartLabels = useMemo(() => {
        if (selectedEmp) return [compactEmployeeName(selectedEmp.name)];
        return employeeRows.map((emp) => compactEmployeeName(emp.name));
    }, [employeeRows, selectedEmp]);

    const completedSeries = useMemo(() => {
        if (selectedEmp) return [safeNum(selectedEmp.completed)];
        return employeeRows.map((emp) => emp.completed);
    }, [employeeRows, selectedEmp]);

    const ongoingSeries = useMemo(() => {
        if (selectedEmp) return [safeNum(selectedEmp.ongoing)];
        return employeeRows.map((emp) => emp.ongoing);
    }, [employeeRows, selectedEmp]);

    const overdueSeries = useMemo(() => {
        if (selectedEmp) return [safeNum(selectedEmp.overdue)];
        return employeeRows.map((emp) => emp.overdue);
    }, [employeeRows, selectedEmp]);

const donutLegendData = useMemo(() => {
    const total = scopedSummary.total || 0;

    return [
        {
            label: "Completed",
            value: scopedSummary.completed,
            color: "#16a34a"
        },
        {
            label: "Ongoing",
            value: scopedSummary.ongoing,
            color: "#2563eb"
        },
        {
            label: "Overdue",
            value: scopedSummary.overdue,
            color: "#e11d48"
        }
    ].map((item) => ({
        ...item,
        percent: pct(item.value, total)
    }));
}, [scopedSummary]);

useEffect(() => {
    if (!window.echarts || !trendChartRef.current) return;

    const chart =
        window.echarts.getInstanceByDom(trendChartRef.current) ||
        window.echarts.init(trendChartRef.current);

    const isDark = themeMode === "dark";
    const axisColor = isDark ? "#94a3b8" : "#475569";
    const textColor = isDark ? "#f8fafc" : "#111827";
    const splitLine = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
    const tooltipBg = isDark ? "#0f172a" : "#ffffff";
    const tooltipBorder = isDark ? "rgba(255,255,255,0.10)" : "#e5e7eb";

    const completedColor = new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "#34d399" },
        { offset: 1, color: "#16a34a" }
    ]);

    const ongoingColor = new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "#4f8cff" },
        { offset: 1, color: "#2563eb" }
    ]);

    const overdueColor = new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "#ff6b6b" },
        { offset: 1, color: "#e11d48" }
    ]);

    chart.setOption(
        {
            animationDuration: 700,
            animationEasing: "cubicOut",
            backgroundColor: "transparent",

            title: {
                text: "Task Status Overview",
                left: 14,
                top: 10,
                textStyle: {
                    color: textColor,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 22,
                    fontWeight: 800
                }
            },

            legend: {
                data: ["Completed", "Ongoing", "Overdue"],
                left: 14,
                top: 52,
                icon: "circle",
                itemWidth: 12,
                itemHeight: 12,
                itemGap: 24,
                textStyle: {
                    color: axisColor,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 14,
                    fontWeight: 700
                }
            },

            grid: {
                top: 86,
                left: 46,
                right: 18,
                bottom: 72,
                containLabel: true
            },

            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow",
                    shadowStyle: {
                        color: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(15,23,42,0.04)"
                    }
                },
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                textStyle: {
                    color: textColor,
                    fontFamily: "Nunito, sans-serif"
                },
                extraCssText:
                    "box-shadow:0 18px 40px rgba(15,23,42,0.12); border-radius:16px;"
            },

            xAxis: {
                type: "category",
                data: chartLabels,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: axisColor,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    margin: 14,
                    interval: 0,
                    rotate: 0
                }
            },

            yAxis: {
                type: "value",
                min: 0,
                minInterval: 1,
                splitNumber: 6,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: axisColor,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 13,
                    fontWeight: 700
                },
                splitLine: {
                    lineStyle: {
                        color: splitLine,
                        type: "dashed"
                    }
                }
            },

            series: [
                {
                    name: "Completed",
                    type: "bar",
                    data: completedSeries,
                    barWidth: 16,
                    itemStyle: {
                        color: completedColor,
                        borderRadius: [999, 999, 999, 999]
                    }
                },
                {
                    name: "Ongoing",
                    type: "bar",
                    data: ongoingSeries,
                    barWidth: 16,
                    itemStyle: {
                        color: ongoingColor,
                        borderRadius: [999, 999, 999, 999]
                    }
                },
                {
                    name: "Overdue",
                    type: "bar",
                    data: overdueSeries,
                    barWidth: 16,
                    itemStyle: {
                        color: overdueColor,
                        borderRadius: [999, 999, 999, 999]
                    }
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
}, [chartLabels, completedSeries, ongoingSeries, overdueSeries, themeMode]);

    useEffect(() => {
        if (!window.echarts || !donutChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(donutChartRef.current) ||
            window.echarts.init(donutChartRef.current);

        const isDark = themeMode === "dark";
        const separatorColor = isDark ? "#141b2d" : "#ffffff";

const completedDonutColor = new window.echarts.graphic.LinearGradient(0, 0, 1, 1, [
    { offset: 0, color: "#34d399" },
    { offset: 1, color: "#16a34a" }
]);

const ongoingDonutColor = new window.echarts.graphic.LinearGradient(0, 0, 1, 1, [
    { offset: 0, color: "#4f8cff" },
    { offset: 1, color: "#2563eb" }
]);

const overdueDonutColor = new window.echarts.graphic.LinearGradient(0, 0, 1, 1, [
    { offset: 0, color: "#ff6b6b" },
    { offset: 1, color: "#e11d48" }
]);

const donutData = [
    {
        value: safeNum(scopedSummary.completed),
        name: "Completed",
        itemStyle: { color: completedDonutColor }
    },
    {
        value: safeNum(scopedSummary.ongoing),
        name: "Ongoing",
        itemStyle: { color: ongoingDonutColor }
    },
    {
        value: safeNum(scopedSummary.overdue),
        name: "Overdue",
        itemStyle: { color: overdueDonutColor }
    }
].filter((item) => item.value > 0);

        chart.setOption(
            {
                animationDuration: 700,
                animationEasing: "cubicOut",
                backgroundColor: "transparent",
                tooltip: {
                    trigger: "item",
                    formatter: (params) =>
                        `${params.name}: ${params.value} (${params.percent}%)`,
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
                        startAngle: 102,
                        clockwise: true,
                        padAngle: 4,
                        minAngle: 8,
                        avoidLabelOverlap: true,
                        label: { show: false },
                        labelLine: { show: false },
                        selectedMode: false,
                        emphasis: {
                            scale: false
                        },
                        itemStyle: {
                            borderColor: separatorColor,
                            borderWidth: 5,
                            borderRadius: 9
                        },
                        data:
                            donutData.length > 0
                                ? donutData
                                : [
                                    {
                                        value: 1,
                                        name: "No data",
                                        itemStyle: {
                                            color: isDark ? "#334155" : "#e5e7eb"
                                        }
                                    }
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
                    <span>Loading report…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="dr-page">
            <div className="dr-card dr-page-intro-card">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Daily Task Report</h5>
                    </div>

                    <div className="dr-dept-dropdown" ref={deptDropdownRef}>
                        <button
                            type="button"
                            className={`dr-dept-trigger ${deptOpen ? "is-open" : ""}`}
                            onClick={() => setDeptOpen((prev) => !prev)}
                            aria-haspopup="listbox"
                            aria-expanded={deptOpen}
                        >
                            <span className="dr-dept-trigger-left">
                                <i className="bi bi-buildings"></i>
                                <span>{departmentLabel}</span>
                            </span>

                            <i className="bi bi-chevron-down dr-dept-chevron"></i>
                        </button>

                        {deptOpen ? (
                            <div className="dr-dept-menu" role="listbox">
                                <button
                                    type="button"
                                    className={`dr-dept-option ${departmentFilter === "all" ? "is-selected" : ""}`}
                                    onClick={() => {
                                        setDepartmentFilter("all");
                                        setSelectedEmp(null);
                                        setDeptOpen(false);
                                    }}
                                    role="option"
                                    aria-selected={departmentFilter === "all"}
                                >
                                    All Departments
                                </button>

                                {departments.map((dep) => (
                                    <button
                                        key={dep.id}
                                        type="button"
                                        className={`dr-dept-option ${
                                            String(departmentFilter) === String(dep.id) ? "is-selected" : ""
                                        }`}
                                        onClick={() => {
                                            setDepartmentFilter(String(dep.id));
                                            setSelectedEmp(null);
                                            setDeptOpen(false);
                                        }}
                                        role="option"
                                        aria-selected={String(departmentFilter) === String(dep.id)}
                                    >
                                        {dep.name}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="dr-summary-grid">
                <SummaryCard
                    icon="bi-check2-circle"
                    label="Completed Tasks"
                    value={scopedSummary.completed}
                    subtext="Finished tasks in scope"
                    tone="success"
                    meta={`${pct(scopedSummary.completed, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-arrow-repeat"
                    label="In Progress Tasks"
                    value={scopedSummary.ongoing}
                    subtext="Active tasks being worked on"
                    tone="warning"
                    meta={`${pct(scopedSummary.ongoing, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-exclamation-circle"
                    label="Overdue Tasks"
                    value={scopedSummary.overdue}
                    subtext="Tasks past the deadline"
                    tone="danger"
                    meta={`${pct(scopedSummary.overdue, scopedSummary.total)}% of total`}
                />
                <SummaryCard
                    icon="bi-list-task"
                    label="Total Tasks"
                    value={scopedSummary.total}
                    subtext={departmentLabel}
                    tone="primary"
                    meta={`${employeeRows.length} staff member${employeeRows.length !== 1 ? "s" : ""}`}
                />
            </div>

            <div className="dr-top-grid">
                <div className="dr-card dr-card--trend dr-card--trend-reference">
                    <div ref={trendChartRef} className="dr-trend-chart dr-trend-chart-reference"></div>
                </div>

            <div className="dr-card dr-card--donut dr-card--donut-reference">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Status Summary</h5>
                        <div className="dr-card-subtitle">
                            {selectedEmp ? `${selectedEmp.name} summary` : departmentLabel}
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {selectedEmp ? "Selected Staff" : "All Staff"}
                    </div>
                </div>

                <div className="dr-donut-stack dr-donut-stack--reference">
                    <div className="dr-donut-shell dr-donut-shell--reference">
                        <div
                            ref={donutChartRef}
                            className="dr-donut-chart dr-donut-chart--reference"
                        ></div>

                        <div className="dr-donut-center dr-donut-center--reference">
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
                        {donutLegendData
                            .filter((item) => item.value > 0)
                            .map((item) => (
                                <div className="dr-donut-legend-item" key={item.label}>
                                    <span
                                        className="dr-donut-dot"
                                        style={{
                                            borderColor: item.color
                                        }}
                                    ></span>

                                    <div className="dr-donut-legend-copy">
                                        <span className="dr-donut-legend-label">{item.label}</span>
                                        <span className="dr-donut-legend-meta">
                                            {item.value} task{item.value !== 1 ? "s" : ""} · {item.percent}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
            </div>

            <div className="dr-card dr-card--table dr-card--table-full">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Task Assignee Overview</h5>
                        <div className="dr-card-subtitle">
                            Click a row to focus the charts · click the eye icon to inspect tasks and comments
                        </div>
                    </div>

                    <div className="dr-filter-pill">
                        {employeeRows.length} assignee{employeeRows.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div className="dr-table-shell">
                    <table className="dr-table">
                        <thead>
                            <tr>
                                <th style={{ width: "52px" }}>#</th>
                                <th>Assignee</th>
                                <th style={{ width: "150px" }}>Department</th>
                                <th style={{ width: "110px" }}>Completed</th>
                                <th style={{ width: "110px" }}>On Progress</th>
                                <th style={{ width: "98px" }}>Overdue</th>
                                <th style={{ width: "140px" }}>Completion Rate</th>
                                <th style={{ width: "70px", textAlign: "center" }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employeeRows.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="dr-table-empty">
                                        No staff members found for this department.
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

            {modalEmp ? (
                <EmployeeTaskModal emp={modalEmp} onClose={() => setModalEmp(null)} />
            ) : null}
        </div>
    );
}

const dailyRoot = document.getElementById("dailyReportRoot") || document.getElementById("root");

if (dailyRoot) {
    const root = ReactDOM.createRoot(dailyRoot);
    root.render(<DailyReportPage />);
}