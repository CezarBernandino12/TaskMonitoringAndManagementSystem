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
        <div className="dr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
                                    <div key={msg.id} className={`dr-comment-row ${isOwn ? "is-own" : ""}`}>
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

                                            {msg.message ? <div className="dr-comment-bubble">{msg.message}</div> : null}

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

        fetch(`php/get_employee_tasks_report.php?employee_id=${encodeURIComponent(emp.id)}`)
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

    const filteredTasks = useMemo(
        () =>
            activeTab === "all"
                ? annotatedTasks
                : annotatedTasks.filter((task) => task.derivedStatus === activeTab),
        [annotatedTasks, activeTab]
    );

    const countFor = (status) =>
        annotatedTasks.filter((task) => task.derivedStatus === status).length;

    const totalTasks = annotatedTasks.length;

    return (
        <>
            <div className="dr-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div
                    className="dr-modal-card dr-employee-task-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${emp.name} tasks`}
                >
                    <div className="dr-modal-head">
                        <div className="dr-modal-person">
                            <img
                                src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
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
                                { key: "all", label: "All", count: totalTasks, tone: "neutral" },
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
                                        if (task.days_until_deadline !== null && task.days_until_deadline !== undefined) {
                                            if (status === "Overdue") {
                                                deadlineMeta += ` · ${Math.abs(task.days_until_deadline)} day${Math.abs(task.days_until_deadline) !== 1 ? "s" : ""} overdue`;
                                            } else if (status === "Ongoing") {
                                                deadlineMeta += task.days_until_deadline === 0
                                                    ? " · Due today"
                                                    : ` · ${task.days_until_deadline} day${task.days_until_deadline !== 1 ? "s" : ""} left`;
                                            } else if (status === "Completed" && task.completed_at) {
                                                deadlineMeta += ` · Done ${formatDatePH(task.completed_at, false)}`;
                                            }
                                        }
                                    }

                                    return (
                                        <div className="dr-task-item" key={task.id ?? idx}>
                                            <div className="dr-task-item-main">
                                                <div className="dr-task-item-title">{task.title || "Untitled Task"}</div>
                                                {task.description ? (
                                                    <div className="dr-task-item-desc">{task.description}</div>
                                                ) : null}
                                                <div className="dr-task-item-meta">{deadlineMeta}</div>
                                            </div>

                                            <div className="dr-task-item-side">
                                                <span className={`dr-status-inline ${statusClass}`}>{status}</span>
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
                        <button className="dr-ghost-btn" onClick={onClose}>Close</button>
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

function SupervisorDailyReportPage() {
    const [supervisor, setSupervisor] = useState(null);
    const [summary, setSummary] = useState({ total: 0, completed: 0, ongoing: 0, overdue: 0 });
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [themeMode, setThemeMode] = useState(getThemeMode());

    const trendChartRef = useRef(null);
    const donutChartRef = useRef(null);
    const trendChart = useRef(null);
    const donutChart = useRef(null);

    useEffect(() => {
        fetch("php/get_current_user.php")
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setError("Could not load your profile. Please log in again.");
                    setLoading(false);
                    return;
                }

                if (data.role !== "supervisor") {
                    setError("Access denied. This page is for supervisors only.");
                    setLoading(false);
                    return;
                }

                setSupervisor(data);
            })
            .catch(() => {
                setError("Failed to connect to the server.");
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!supervisor) return;

        setLoading(true);
        setSelectedEmp(null);

        fetch("php/get_supervisor_daily_report.php")
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setSummary(data.summary ?? { total: 0, completed: 0, ongoing: 0, overdue: 0 });
                setEmployees(Array.isArray(data.employees) ? data.employees : []);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Failed to load report: ${err.message}`);
                setLoading(false);
            });
    }, [supervisor]);

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

    const scopedSummary = useMemo(() => {
        if (!selectedEmp) return summary;

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

    const chartLabels = useMemo(() => {
        if (selectedEmp) return [selectedEmp.name];
        return employeeRows.map((emp) => emp.name);
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

    React.useEffect(() => {
        if (!window.echarts || !trendChartRef.current) return;

        const chart =
            window.echarts.getInstanceByDom(trendChartRef.current) ||
            window.echarts.init(trendChartRef.current);

        trendChart.current = chart;

        const isDark = themeMode === "dark";
        const axisColor = isDark ? "#98a2b3" : "#7b8794";
        const splitLine = isDark ? "rgba(255,255,255,0.08)" : "#edf1f7";
        const textColor = isDark ? "#f8fafc" : "#18263f";
        const tooltipBg = isDark ? "#182133" : "#ffffff";
        const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5ebf4";

        chart.setOption(
            {
                animationDuration: 650,
                animationEasing: "cubicOut",
                color: ["#16a34a", "#2563eb", "#e11d48"],
                grid: {
                    top: 26,
                    left: 22,
                    right: 18,
                    bottom: 42,
                    containLabel: true
                },
                tooltip: {
                    trigger: "axis",
                    axisPointer: {
                        type: "shadow"
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
                legend: {
                    show: false
                },
                xAxis: {
                    type: "category",
                    data: chartLabels,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: axisColor,
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 12,
                        fontWeight: 800,
                        margin: 10
                    }
                },
                yAxis: {
                    type: "value",
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
                            color: splitLine,
                            type: "dashed"
                        }
                    }
                },
                series: [
                    {
                        name: "Task Completed",
                        type: "bar",
                        stack: "tasks",
                        barWidth: 28,
                        itemStyle: {
                            borderRadius: [0, 0, 8, 8]
                        },
                        data: completedSeries
                    },
                    {
                        name: "Task Ongoing",
                        type: "bar",
                        stack: "tasks",
                        barWidth: 28,
                        itemStyle: {
                            borderRadius: [0, 0, 0, 0]
                        },
                        data: ongoingSeries
                    },
                    {
                        name: "Task Overdue",
                        type: "bar",
                        stack: "tasks",
                        barWidth: 28,
                        itemStyle: {
                            borderRadius: [8, 8, 0, 0]
                        },
                        data: overdueSeries
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

        donutChart.current = chart;

        const isDark = themeMode === "dark";
        const separatorColor = isDark ? "#12192b" : "#ffffff";

        const seriesData = [
            { value: scopedSummary.completed, name: "Completed", itemStyle: { color: "#16a34a" } },
            { value: scopedSummary.ongoing, name: "Ongoing", itemStyle: { color: "#2563eb" } },
            { value: scopedSummary.overdue, name: "Overdue", itemStyle: { color: "#e11d48" } }
        ];

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
                        avoidLabelOverlap: true,
                        label: { show: false },
                        labelLine: { show: false },
                        emphasis: {
                            scale: true,
                            scaleSize: 8,
                            itemStyle: {
                                borderColor: separatorColor,
                                borderWidth: 6,
                                borderRadius: 14
                            }
                        },
                        itemStyle: {
                            borderColor: separatorColor,
                            borderWidth: 6,
                            borderRadius: 14
                        },
                        data: seriesData
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
                    <h5>Access Error</h5>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading || !supervisor) {
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
                        <h5 className="dr-page-title">Supervisor Daily Task Report</h5>
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
                    subtext="All tasks in current view"
                    tone="primary"
                    meta={`${employeeRows.length} staff member${employeeRows.length !== 1 ? "s" : ""}`}
                />
            </div>

            <div className="dr-top-grid">
                <div className="dr-card dr-card--trend">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Task Status Trend</h5>
                            <div className="dr-card-subtitle">
                                {selectedEmp ? `${selectedEmp.name} task counts` : "Department-wide staff task distribution"}
                            </div>
                        </div>

                        {selectedEmp ? (
                            <button className="dr-filter-pill dr-filter-pill--button" onClick={() => setSelectedEmp(null)}>
                                Clear Selection
                            </button>
                        ) : (
                            <div className="dr-filter-pill">This Week</div>
                        )}
                    </div>

                    <div ref={trendChartRef} className="dr-trend-chart"></div>
                </div>

                <div className="dr-card dr-card--donut">
                    <div className="dr-card-head">
                        <div>
                            <h5 className="dr-card-title">Task Status Distribution</h5>
                            <div className="dr-card-subtitle">
                                {selectedEmp ? `${selectedEmp.name} summary` : "Department task summary"}
                            </div>
                        </div>

                        <div className="dr-filter-pill">
                            {selectedEmp ? "Selected Staff" : "All Staff"}
                        </div>
                    </div>

                    <div className="dr-donut-stack">
                        <div className="dr-donut-shell">
                            <div ref={donutChartRef} className="dr-donut-chart"></div>

                            <div className="dr-donut-center">
                                <span className="dr-donut-center-kicker">Total</span>
                                <div className="dr-donut-center-line">
                                    <strong className="dr-donut-center-value">{scopedSummary.total}</strong>
                                    <span className="dr-donut-center-unit">task{scopedSummary.total !== 1 ? "s" : ""}</span>
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

            <div className="dr-card dr-card--table dr-card--table-full">
                <div className="dr-card-head">
                    <div>
                        <h5 className="dr-card-title">Task Assignee Overview</h5>
                        <div className="dr-card-subtitle">
                            Click a row to focus the charts · click the eye icon to inspect tasks
                        </div>
                    </div>

                    <div className="dr-filter-pill">{employeeRows.length} assignee{employeeRows.length !== 1 ? "s" : ""}</div>
                </div>

                <div className="dr-table-shell">
                    <table className="dr-table">
                        <thead>
                            <tr>
                                <th style={{ width: "52px" }}>#</th>
                                <th>Assignee</th>
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
                                    <td colSpan="7" className="dr-table-empty">
                                        No staff members found in this department.
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
                                                        src={emp.profile_image_url || buildAvatarFallbackUrl(emp.name)}
                                                        alt={`${emp.name} Profile`}
                                                        className="dr-assignee-avatar"
                                                    />
                                                    <div className="dr-assignee-copy">
                                                        <span className="dr-assignee-name">{emp.name}</span>
                                                        <span className="dr-assignee-sub">{emp.department}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{emp.completed}</td>
                                            <td>{emp.ongoing}</td>
                                            <td className="dr-overdue-cell">{emp.overdue}</td>
                                            <td>
                                                {emp.total === 0 ? (
                                                    <span className="dr-empty-inline">No tasks yet</span>
                                                ) : (
                                                    <div className="dr-performance-cell">
                                                        <div className="dr-progress" title={`${emp.completionRate}% completed`}>
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
                                                <button className="dr-eye-btn" title={`View ${emp.name}'s tasks`}>
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
                    onClose={() => setModalEmp(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("supervisorDailyReportRoot"));
root.render(<SupervisorDailyReportPage />);