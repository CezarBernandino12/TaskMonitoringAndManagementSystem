const { useEffect, useState, useRef } = React;





function TaskCommentModal({ task, recipientId, currentUserId, onClose }) {
    const [messages,  setMessages]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);
    const [text,      setText]      = useState('');
    const [files,     setFiles]     = useState([]);   // File[] staged for upload
    const [sending,   setSending]   = useState(false);
    const [sendError, setSendError] = useState(null);
    const bottomRef  = useRef(null);
    const fileRef    = useRef(null);  // hidden <input type="file">

    // Fetch messages when the modal opens
    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`php/get_task_messages.php?task_id=${task.id}`)
            .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
            .then(data => {
                if (data.error) throw new Error(data.error);
                setMessages(Array.isArray(data.messages) ? data.messages : []);
                setLoading(false);
            })
            .catch(err => { setError(`Could not load comments: ${err.message}`); setLoading(false); });
    }, [task.id]);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Send handler ────────────────────────────────────────────────
    // Uses FormData so that file attachments can be included alongside
    // the text fields. recipient_id is always the employee whose task
    // list was opened (recipientId prop), never derived from task fields.
    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed && files.length === 0) return;

        setSending(true);
        setSendError(null);

        const fd = new FormData();
        fd.append('task_id',      task.id);
        fd.append('recipient_id', recipientId);   // ← always emp.id, never task.assigned_to
        fd.append('message',      trimmed);

        // Attach each staged file under the key "attachments[]"
        files.forEach(f => fd.append('attachments[]', f));

        fetch('php/send_task_message.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setMessages(prev => [...prev, data.message]);
                setText('');
                setFiles([]);
                setSending(false);
            })
            .catch(err => { setSendError(err.message); setSending(false); });
    };

    // Add files from the file picker (merge, avoid exact duplicates by name+size)
    const handleFileChange = (e) => {
        const picked = Array.from(e.target.files);
        setFiles(prev => {
            const existing = new Set(prev.map(f => `${f.name}|${f.size}`));
            const fresh = picked.filter(f => !existing.has(`${f.name}|${f.size}`));
            return [...prev, ...fresh];
        });
        // Reset input so the same file can be re-selected after removal
        e.target.value = '';
    };

    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

    // ── Helpers ─────────────────────────────────────────────────────

    // Format timestamp to "Mar 15, 10:32 AM"
    const fmtTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
             + ', '
             + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    };

    // Human-readable file size
    const fmtSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Avatar initials from name
    const initials = (name) => name
        ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    // Consistent color per sender based on name hash
    const avatarColor = (name) => {
        const hue = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
        return `hsl(${hue},50%,85%)`;
    };
    const avatarTextColor = (name) => {
        const hue = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
        return `hsl(${hue},50%,30%)`;
    };

    const canSend = !sending && (text.trim().length > 0 || files.length > 0);

    const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    return (
        <div
            onClick={handleBackdropClick}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                zIndex: 1060, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '1rem',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: 14, width: '100%',
                maxWidth: 540, maxHeight: '80vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '0.9rem 1.25rem',
                    borderBottom: '1px solid #eee',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', flexShrink: 0,
                }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            💬 {task.title}
                        </div>
                        <small style={{ color: '#888' }}>
                            {messages.length} comment{messages.length !== 1 ? 's' : ''}
                        </small>
                    </div>
                    <button className="btn-close" onClick={onClose} style={{ marginTop: 2, flexShrink: 0 }} />
                </div>

                {/* Message thread */}
                <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', flex: 1 }}>
                    {loading ? (
                        <div className="text-center text-muted py-4">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading comments…
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger py-2">{error}</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-muted py-4" style={{ fontSize: 14 }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                            No comments yet. Be the first to comment.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {messages.map(msg => {
                                const isOwn = msg.sender_id === currentUserId;
                                return (
                                    <div key={msg.id} style={{
                                        display: 'flex', gap: 10,
                                        flexDirection: isOwn ? 'row-reverse' : 'row',
                                        alignItems: 'flex-start',
                                    }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: 34, height: 34, borderRadius: '50%',
                                            background: avatarColor(msg.sender_name),
                                            color: avatarTextColor(msg.sender_name),
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700, fontSize: 12, flexShrink: 0,
                                            border: '2px solid #fff',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                                        }}>
                                            {initials(msg.sender_name)}
                                        </div>

                                        {/* Bubble */}
                                        <div style={{ maxWidth: '72%' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'baseline', gap: 6,
                                                flexDirection: isOwn ? 'row-reverse' : 'row',
                                                marginBottom: 3,
                                            }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>
                                                    {isOwn ? 'You' : msg.sender_name}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#aaa' }}>
                                                    {fmtTime(msg.time_sent)}
                                                </span>
                                            </div>

                                            {/* Text bubble — only rendered if there's a message body */}
                                            {msg.message && (
                                                <div style={{
                                                    background: isOwn ? '#0d6efd' : '#f3f4f6',
                                                    color: isOwn ? '#fff' : '#222',
                                                    borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                                                    padding: '8px 12px',
                                                    fontSize: 13, lineHeight: 1.5,
                                                    wordBreak: 'break-word',
                                                }}>
                                                    {msg.message}
                                                </div>
                                            )}

                                            {/* Attachments from server */}
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {msg.attachments.map(att => (
                                                        <a
                                                            key={att.id}
                                                            href={att.file_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                fontSize: 12,
                                                                color: isOwn ? '#cfe2ff' : '#0d6efd',
                                                                textDecoration: 'none',
                                                                background: isOwn ? 'rgba(255,255,255,0.15)' : '#f0f4ff',
                                                                borderRadius: 6,
                                                                padding: '3px 8px',
                                                            }}
                                                        >
                                                            📎 {att.file_name}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>

                {/* Compose box */}
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderTop: '1px solid #eee', flexShrink: 0,
                }}>
                    {sendError && (
                        <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 6 }}>{sendError}</div>
                    )}

                    {/* Staged file previews */}
                    {files.length > 0 && (
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: 6,
                            marginBottom: 8,
                        }}>
                            {files.map((f, i) => (
                                <div key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    background: '#f0f4ff',
                                    border: '1px solid #c9d8fb',
                                    borderRadius: 6,
                                    padding: '3px 8px',
                                    fontSize: 12, color: '#2a52a8',
                                    maxWidth: 220,
                                }}>
                                    <span>📎</span>
                                    <span style={{
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap', flex: 1,
                                    }}>
                                        {f.name}
                                    </span>
                                    <span style={{ color: '#888', flexShrink: 0 }}>
                                        {fmtSize(f.size)}
                                    </span>
                                    <button
                                        onClick={() => removeFile(i)}
                                        style={{
                                            background: 'none', border: 'none',
                                            cursor: 'pointer', padding: 0,
                                            color: '#888', fontSize: 13, lineHeight: 1,
                                            flexShrink: 0,
                                        }}
                                        title="Remove file"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        {/* Hidden file input — triggered by the attach button */}
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />

                        {/* Attach button */}
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={sending}
                            title="Attach files"
                            style={{
                                background: files.length > 0 ? '#e8f0fe' : '#f5f6f7',
                                border: `1px solid ${files.length > 0 ? '#c9d8fb' : '#dee2e6'}`,
                                borderRadius: 8,
                                width: 38, height: 40,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                                fontSize: 17,
                                opacity: sending ? 0.5 : 1,
                                transition: 'background 0.15s, border-color 0.15s',
                                position: 'relative',
                            }}
                        >
                            📎
                            {/* Badge showing count of staged files */}
                            {files.length > 0 && (
                                <span style={{
                                    position: 'absolute', top: -5, right: -5,
                                    background: '#0d6efd', color: '#fff',
                                    borderRadius: '50%', width: 16, height: 16,
                                    fontSize: 9, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid #fff',
                                }}>
                                    {files.length}
                                </span>
                            )}
                        </button>

                        <textarea
                            rows={2}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => {
                                // Ctrl+Enter or Cmd+Enter to send
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Write a comment…  (Ctrl+Enter to send)"
                            style={{
                                flex: 1, resize: 'none', border: '1px solid #dee2e6',
                                borderRadius: 8, padding: '8px 10px', fontSize: 13,
                                outline: 'none', fontFamily: 'inherit',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!canSend}
                            style={{
                                background: '#0d6efd', color: '#fff',
                                border: 'none', borderRadius: 8,
                                padding: '8px 16px', fontWeight: 600,
                                fontSize: 13, cursor: canSend ? 'pointer' : 'not-allowed',
                                opacity: canSend ? 1 : 0.6,
                                whiteSpace: 'nowrap', height: 40, flexShrink: 0,
                            }}
                        >
                            {sending ? '…' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
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
        year: "numeric",
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

// ====================================================================
// EMPLOYEE TASK MODAL
// ====================================================================
function EmployeeTaskModal({ emp, weekStart, weekEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [commentTask, setCommentTask] = useState(null); // task whose comments are open
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        fetch('php/get_current_user.php')
            .then(r => r.json())
            .then(data => { if (data.id) setCurrentUserId(data.id); })
            .catch(() => {});
    }, []);


    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab("all");

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

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const getTaskStatus = (task) => task.derived_status ?? task.status;
    const statusBadge = (status) =>
        ({ Completed: "success", Ongoing: "warning", Overdue: "danger" }[
            status
        ] ?? "secondary");
    const priorityBadge = (priority) =>
        ({ High: "danger", Medium: "warning", Low: "secondary" }[
            priority
        ] ?? "secondary");

    const annotated = tasks.map((t) => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered =
        activeTab === "all"
            ? annotated
            : annotated.filter((t) => t.derivedStatus === activeTab);
    const countFor = (status) =>
        annotated.filter((t) => t.derivedStatus === status).length;

    return (
        <div
            onClick={handleBackdropClick}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 1050,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: 12,
                    width: "100%",
                    maxWidth: 720,
                    maxHeight: "85vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                }}
            >
                <div
                    style={{
                        padding: "1rem 1.25rem",
                        borderBottom: "1px solid #dee2e6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexShrink: 0,
                    }}
                >
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{emp.name}</h5>
                        <small className="text-muted">
                            {emp.department} &nbsp;·&nbsp; Week of{" "}
                            {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
                        </small>
                    </div>
                    <button
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                        style={{ marginTop: 2 }}
                    />
                </div>

                <div
                    style={{
                        padding: "0.75rem 1.25rem",
                        borderBottom: "1px solid #dee2e6",
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                        flexWrap: "wrap",
                    }}
                >
                    {[
                        { label: "All", key: "all", count: tasks.length, color: "#6c757d" },
                        { label: "Completed", key: "Completed", count: countFor("Completed"), color: "#28a745" },
                        { label: "Ongoing", key: "Ongoing", count: countFor("Ongoing"), color: "#ffc107" },
                        { label: "Overdue", key: "Overdue", count: countFor("Overdue"), color: "#dc3545" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                border: `2px solid ${activeTab === tab.key ? tab.color : "#dee2e6"}`,
                                borderRadius: 20,
                                padding: "3px 14px",
                                background: activeTab === tab.key ? tab.color : "#fff",
                                color: activeTab === tab.key ? "#fff" : "#555",
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            {tab.label}{" "}
                            <span
                                style={{
                                    background:
                                        activeTab === tab.key
                                            ? "rgba(255,255,255,0.3)"
                                            : "#eee",
                                    borderRadius: 10,
                                    padding: "1px 7px",
                                    marginLeft: 4,
                                    fontSize: 12,
                                }}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div style={{ overflowY: "auto", padding: "1rem 1.25rem", flex: 1 }}>
                    {loading ? (
                        <div className="text-center text-muted py-4">
                            <div
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                            ></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            No {activeTab === "all" ? "" : activeTab.toLowerCase() + " "}tasks found for this week.
                        </div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                                <tr>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Deadline</th>
                                    <th style={{ textAlign: "center", width: 80 }}>Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((task, idx) => {
                                    const days = task.days_until_deadline;
                                    let deadlineLabel = "—";
                                    let deadlineSub = null;

                                    if (task.deadline) {
                                        deadlineLabel = new Date(task.deadline).toLocaleDateString(
                                            "en-PH",
                                            {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            }
                                        );
                                        if (task.derivedStatus === "Overdue" && days !== null) {
                                            deadlineSub = (
                                                <div style={{ fontSize: 11, color: "#dc3545", fontWeight: 600 }}>
                                                    {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""} overdue
                                                </div>
                                            );
                                        } else if (
                                            task.derivedStatus === "Ongoing" &&
                                            days !== null
                                        ) {
                                            deadlineSub = (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: days <= 2 ? "#dc3545" : "#6c757d",
                                                    }}
                                                >
                                                    {days === 0
                                                        ? "Due today"
                                                        : `${days} day${days !== 1 ? "s" : ""} left`}
                                                </div>
                                            );
                                        } else if (
                                            task.derivedStatus === "Completed" &&
                                            task.completed_at
                                        ) {
                                            deadlineSub = (
                                                <div style={{ fontSize: 11, color: "#28a745" }}>
                                                    Done{" "}
                                                    {new Date(task.completed_at).toLocaleDateString(
                                                        "en-PH",
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                        }
                                                    )}
                                                </div>
                                            );
                                        }
                                    }

                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                                {task.description && (
                                                    <small className="text-muted">
                                                        {task.description}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge bg-${statusBadge(
                                                        task.derivedStatus
                                                    )}`}
                                                >
                                                    {task.derivedStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge bg-${priorityBadge(
                                                        task.priority
                                                    )}`}
                                                >
                                                    {task.priority ?? "—"}
                                                </span>
                                            </td>
                                            <td style={{ whiteSpace: "nowrap" }}>
                                                {deadlineLabel}
                                                {deadlineSub}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    className="btn btn-link p-0"
                                                    title="View comments"
                                                    style={{ color: "#6c757d", fontSize: 18, lineHeight: 1 }}
                                                    onClick={e => { e.stopPropagation(); setCommentTask(task); }}
                                                >
                                                    💬
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div
                    style={{
                        padding: "0.75rem 1.25rem",
                        borderTop: "1px solid #dee2e6",
                        display: "flex",
                        justifyContent: "flex-end",
                        flexShrink: 0,
                    }}
                >
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>
                        Close
                    </button>
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
        </div>
    );
}

// ====================================================================
// DEPARTMENT TASK MODAL
// ====================================================================
function DepartmentTaskModal({ dept, weekStart, weekEnd, onClose }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab("all");

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

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const getTaskStatus = (task) => task.derived_status ?? task.status;
    const statusBadge = (s) =>
        ({ Completed: "success", Ongoing: "warning", Overdue: "danger" }[s] ??
            "secondary");
    const priorityBadge = (p) =>
        ({ High: "danger", Medium: "warning", Low: "secondary" }[p] ??
            "secondary");

    const annotated = tasks.map((t) => ({ ...t, derivedStatus: getTaskStatus(t) }));
    const filtered =
        activeTab === "all"
            ? annotated
            : annotated.filter((t) => t.derivedStatus === activeTab);
    const countFor = (s) =>
        annotated.filter((t) => t.derivedStatus === s).length;

    const weekLabel = `${formatDisplayDate(weekStart)} — ${formatDisplayDate(weekEnd)}`;

    return (
        <div
            onClick={handleBackdropClick}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 1050,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: 12,
                    width: "100%",
                    maxWidth: 780,
                    maxHeight: "85vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                }}
            >
                <div
                    style={{
                        padding: "1rem 1.25rem",
                        borderBottom: "1px solid #dee2e6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexShrink: 0,
                    }}
                >
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{dept.department}</h5>
                        <small className="text-muted">Department tasks · {weekLabel}</small>
                    </div>
                    <button
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                        style={{ marginTop: 2 }}
                    />
                </div>

                <div
                    style={{
                        padding: "0.75rem 1.25rem",
                        borderBottom: "1px solid #dee2e6",
                        display: "flex",
                        gap: 8,
                        flexShrink: 0,
                        flexWrap: "wrap",
                    }}
                >
                    {[
                        { label: "All", key: "all", count: tasks.length, color: "#6c757d" },
                        { label: "Completed", key: "Completed", count: countFor("Completed"), color: "#28a745" },
                        { label: "Ongoing", key: "Ongoing", count: countFor("Ongoing"), color: "#ffc107" },
                        { label: "Overdue", key: "Overdue", count: countFor("Overdue"), color: "#dc3545" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                border: `2px solid ${activeTab === tab.key ? tab.color : "#dee2e6"}`,
                                borderRadius: 20,
                                padding: "3px 14px",
                                background: activeTab === tab.key ? tab.color : "#fff",
                                color: activeTab === tab.key ? "#fff" : "#555",
                                fontWeight: 500,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            {tab.label}{" "}
                            <span
                                style={{
                                    background:
                                        activeTab === tab.key
                                            ? "rgba(255,255,255,0.3)"
                                            : "#eee",
                                    borderRadius: 10,
                                    padding: "1px 7px",
                                    marginLeft: 4,
                                    fontSize: 12,
                                }}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div style={{ overflowY: "auto", padding: "1rem 1.25rem", flex: 1 }}>
                    {loading ? (
                        <div className="text-center text-muted py-4">
                            <div
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                            ></div>
                            Loading tasks...
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            No {activeTab === "all" ? "" : activeTab.toLowerCase() + " "}tasks found for this department this week.
                        </div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                                <tr>
                                    <th>Title</th>
                                    <th>Assigned To</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Deadline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((task, idx) => {
                                    const days = task.days_until_deadline;
                                    let deadlineLabel = "—";
                                    let deadlineSub = null;

                                    if (task.deadline) {
                                        deadlineLabel = new Date(task.deadline).toLocaleDateString(
                                            "en-PH",
                                            {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            }
                                        );

                                        if (task.derivedStatus === "Overdue" && days !== null) {
                                            deadlineSub = (
                                                <div style={{ fontSize: 11, color: "#dc3545", fontWeight: 600 }}>
                                                    {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""} overdue
                                                </div>
                                            );
                                        } else if (
                                            task.derivedStatus === "Ongoing" &&
                                            days !== null
                                        ) {
                                            deadlineSub = (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: days <= 2 ? "#dc3545" : "#6c757d",
                                                    }}
                                                >
                                                    {days === 0
                                                        ? "Due today"
                                                        : `${days} day${days !== 1 ? "s" : ""} left`}
                                                </div>
                                            );
                                        } else if (
                                            task.derivedStatus === "Completed" &&
                                            task.completed_at
                                        ) {
                                            deadlineSub = (
                                                <div style={{ fontSize: 11, color: "#28a745" }}>
                                                    Done{" "}
                                                    {new Date(task.completed_at).toLocaleDateString(
                                                        "en-PH",
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                        }
                                                    )}
                                                </div>
                                            );
                                        }
                                    }

                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                                {task.description && (
                                                    <small className="text-muted">
                                                        {task.description}
                                                    </small>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    whiteSpace: "nowrap",
                                                    fontWeight: 500,
                                                    color: "#0d6efd",
                                                }}
                                            >
                                                {task.assigned_to_name}
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge bg-${statusBadge(
                                                        task.derivedStatus
                                                    )}`}
                                                >
                                                    {task.derivedStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge bg-${priorityBadge(
                                                        task.priority
                                                    )}`}
                                                >
                                                    {task.priority ?? "—"}
                                                </span>
                                            </td>
                                            <td style={{ whiteSpace: "nowrap" }}>
                                                {deadlineLabel}
                                                {deadlineSub}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div
                    style={{
                        padding: "0.75rem 1.25rem",
                        borderTop: "1px solid #dee2e6",
                        display: "flex",
                        justifyContent: "flex-end",
                        flexShrink: 0,
                    }}
                >
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MAIN PAGE
// ====================================================================
function WeeklyReportPage() {
    const [summary, setSummary] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        overdue: 0,
    });
    const [employees, setEmployees] = useState([]);
    const [dailyTrend, setDailyTrend] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modalEmp, setModalEmp] = useState(null);
    const [modalDept, setModalDept] = useState(null);

    const lineRef = useRef(null);
    const pieRef = useRef(null);
    const groupedBarRef = useRef(null);
    const lineChart = useRef(null);
    const pieChart = useRef(null);
    const groupedBarChart = useRef(null);

    const weekStart = getWeekStart(weekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    useEffect(() => {
        fetch("php/get_departments.php")
            .then((res) => res.json())
            .then((data) => setAllDepartments(data))
            .catch(() => setAllDepartments([]));
    }, []);

    useEffect(() => {
        setSelectedEmp(null);
        setModalEmp(null);
        setModalDept(null);

        const start = formatDate(weekStart);
        const end = formatDate(weekEnd);

        fetch(
            `php/get_weekly_report.php?department=${departmentFilter}&week_start=${start}&week_end=${end}`
        )
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    console.error("PHP error:", data.error);
                    return;
                }
                setSummary(data.summary);
                setEmployees(data.employees);
                setDailyTrend(data.daily_trend ?? []);
            })
            .catch((err) => console.error(err));
    }, [departmentFilter, weekOffset]);

    const handleRowClick = (emp) => {
        setSelectedEmp((prev) => (prev?.id === emp.id ? null : emp));
    };

    const dayLabels = weekDayLabels(weekStart);
    const trendSource =
        selectedEmp && selectedEmp.daily_trend ? selectedEmp.daily_trend : dailyTrend;

    const lineCompleted = trendSource.map((d) => d.completed ?? 0);
    const lineOngoing = trendSource.map((d) => d.ongoing ?? 0);
    const lineOverdue = trendSource.map((d) => d.overdue ?? 0);

    const pieData = selectedEmp
        ? [selectedEmp.completed, selectedEmp.ongoing, selectedEmp.overdue]
        : [summary.completed, summary.ongoing, summary.overdue];

    const deptMap = {};
    employees.forEach((emp) => {
        const key = emp.department;
        if (!deptMap[key]) deptMap[key] = { completed: 0, ongoing: 0, overdue: 0 };
        deptMap[key].completed += emp.completed;
        deptMap[key].ongoing += emp.ongoing;
        deptMap[key].overdue += emp.overdue;
    });

    const deptEntries = Object.entries(deptMap).sort(
        (a, b) => b[1].overdue - a[1].overdue
    );
    const deptLabels = deptEntries.map(([name]) => name);
    const deptCompleted = deptEntries.map(([, d]) => d.completed);
    const deptOngoing = deptEntries.map(([, d]) => d.ongoing);
    const deptOverdue = deptEntries.map(([, d]) => d.overdue);

    useEffect(() => {
        if (lineChart.current) lineChart.current.destroy();
        lineChart.current = new Chart(lineRef.current, {
            type: "line",
            data: {
                labels: dayLabels,
                datasets: [
                    {
                        label: "Completed",
                        data: lineCompleted,
                        borderColor: "#28a745",
                        backgroundColor: "rgba(40,167,69,0.08)",
                        pointBackgroundColor: "#28a745",
                        tension: 0.4,
                        fill: true,
                    },
                    {
                        label: "Ongoing",
                        data: lineOngoing,
                        borderColor: "#ffc107",
                        backgroundColor: "rgba(255,193,7,0.08)",
                        pointBackgroundColor: "#ffc107",
                        tension: 0.4,
                        fill: true,
                    },
                    {
                        label: "Overdue",
                        data: lineOverdue,
                        borderColor: "#dc3545",
                        backgroundColor: "rgba(220,53,69,0.08)",
                        pointBackgroundColor: "#dc3545",
                        tension: 0.4,
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "top" },
                    title: {
                        display: !!selectedEmp,
                        text: selectedEmp ? `${selectedEmp.name} — Daily Trend` : "",
                    },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                },
            },
        });

        if (pieChart.current) pieChart.current.destroy();
        pieChart.current = new Chart(pieRef.current, {
            type: "pie",
            data: {
                labels: ["Completed", "Ongoing", "Overdue"],
                datasets: [
                    {
                        data: pieData,
                        backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
                        borderWidth: 2,
                        borderColor: "#fff",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                    title: {
                        display: !!selectedEmp,
                        text: selectedEmp ? `${selectedEmp.name} — Status Split` : "",
                    },
                },
            },
        });

        if (groupedBarChart.current) groupedBarChart.current.destroy();
        if (deptLabels.length > 0) {
            groupedBarChart.current = new Chart(groupedBarRef.current, {
                type: "bar",
                data: {
                    labels: deptLabels,
                    datasets: [
                        {
                            label: "Completed",
                            data: deptCompleted,
                            backgroundColor: "#28a745",
                            borderRadius: 4,
                        },
                        {
                            label: "Ongoing",
                            data: deptOngoing,
                            backgroundColor: "#ffc107",
                            borderRadius: 4,
                        },
                        {
                            label: "Overdue",
                            data: deptOverdue,
                            backgroundColor: "#dc3545",
                            borderRadius: 4,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "top" },
                        tooltip: {
                            callbacks: {
                                afterBody: (items) => {
                                    const idx = items[0]?.dataIndex;
                                    const d = deptEntries[idx];
                                    if (!d) return "";
                                    const total =
                                        d[1].completed + d[1].ongoing + d[1].overdue;
                                    const rate =
                                        total > 0
                                            ? Math.round((d[1].completed / total) * 100)
                                            : 0;
                                    return `Completion rate: ${rate}%`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    },
                },
            });
        }

        return () => {
            if (lineChart.current) lineChart.current.destroy();
            if (pieChart.current) pieChart.current.destroy();
            if (groupedBarChart.current) groupedBarChart.current.destroy();
        };
    }, [selectedEmp, summary, employees, dailyTrend, weekOffset]);

    const completionRate = (emp) => {
        const total = emp.completed + emp.ongoing + emp.overdue;
        return total > 0 ? Math.round((emp.completed / total) * 100) : 0;
    };

    const isCurrentWeek = weekOffset === 0;

    return (
        <div className="weekly-report-page p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Weekly Task Report</h2>
                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                    >
                        ‹ Prev
                    </button>
                    <span
                        className="fw-semibold"
                        style={{ minWidth: 200, textAlign: "center" }}
                    >
                        {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
                    </span>
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        disabled={isCurrentWeek}
                    >
                        Next ›
                    </button>
                    {weekOffset !== 0 && (
                        <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setWeekOffset(0)}
                        >
                            This Week
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <select
                    className="form-select w-auto"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                    <option value="all">All Departments</option>
                    {allDepartments.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                            {dep.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 p-3 text-center">
                        <h6 className="text-muted mb-1">Total Tasks</h6>
                        <h2 className="mb-0">{summary.total}</h2>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 p-3 text-center">
                        <h6 className="text-muted mb-1">Completed</h6>
                        <h2 className="text-success mb-0">{summary.completed}</h2>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 p-3 text-center">
                        <h6 className="text-muted mb-1">Ongoing</h6>
                        <h2 className="text-warning mb-0">{summary.ongoing}</h2>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 p-3 text-center">
                        <h6 className="text-muted mb-1">Overdue</h6>
                        <h2 className="text-danger mb-0">{summary.overdue}</h2>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-12">
                    <div className="card shadow-sm border-0 p-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Daily Task Trend</h5>
                            {selectedEmp ? (
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-primary">
                                        {selectedEmp.name}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => setSelectedEmp(null)}
                                    >
                                        ✕ Clear
                                    </button>
                                </div>
                            ) : (
                                <small className="text-muted">
                                    Click a row below to filter by employee
                                </small>
                            )}
                        </div>
                        <div style={{ height: 280 }}>
                            <canvas ref={lineRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-md-6 mb-3 mb-md-0">
                    <div className="card shadow-sm border-0 p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Status Distribution</h5>
                            {selectedEmp && (
                                <span className="badge bg-primary">{selectedEmp.name}</span>
                            )}
                        </div>
                        <div style={{ height: 280 }}>
                            <canvas ref={pieRef}></canvas>
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card shadow-sm border-0 p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h5 className="mb-0">Department Comparison</h5>
                                <small className="text-muted">
                                    Completed, Ongoing, and Overdue per department this
                                    week
                                </small>
                            </div>
                        </div>
                        <div style={{ height: 280 }}>
                            <canvas ref={groupedBarRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0 p-3 mb-4">
                <h5 className="mb-3">Department Details</h5>
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Department</th>
                                <th>Completed</th>
                                <th>Ongoing</th>
                                <th>Overdue</th>
                                <th>Completion Rate</th>
                                <th style={{ textAlign: "center" }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deptEntries.map(([deptName, d]) => {
                                const total = d.completed + d.ongoing + d.overdue;
                                const rate =
                                    total > 0
                                        ? Math.round((d.completed / total) * 100)
                                        : 0;
                                const deptObj = allDepartments.find(
                                    (dep) => dep.name === deptName
                                );
                                const deptId = deptObj?.id ?? null;

                                return (
                                    <tr key={deptName}>
                                        <td style={{ fontWeight: 500 }}>{deptName}</td>
                                        <td>{d.completed}</td>
                                        <td>{d.ongoing}</td>
                                        <td className="text-danger fw-bold">{d.overdue}</td>
                                        <td>
                                            {total === 0 ? (
                                                <span
                                                    className="text-muted"
                                                    style={{ fontSize: "0.9em" }}
                                                >
                                                    No tasks yet
                                                </span>
                                            ) : rate === 0 ? (
                                                <span
                                                    className="text-danger"
                                                    style={{
                                                        fontSize: "0.9em",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    0% — None completed
                                                </span>
                                            ) : (
                                                <div className="progress" style={{ height: 20 }}>
                                                    <div
                                                        className="progress-bar bg-success"
                                                        style={{ width: `${rate}%` }}
                                                        aria-valuenow={rate}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    >
                                                        {rate}%
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            {deptId ? (
                                                <button
                                                    className="btn btn-link p-0"
                                                    title={`View ${deptName} tasks this week`}
                                                    style={{ color: "#0d6efd" }}
                                                    onClick={() =>
                                                        setModalDept({
                                                            department_id: deptId,
                                                            department: deptName,
                                                        })
                                                    }
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="20"
                                                        height="20"
                                                        fill="currentColor"
                                                        viewBox="0 0 16 16"
                                                    >
                                                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.133 13.133 0 0 1 1.172 8z" />
                                                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card shadow-sm border-0 p-3 mt-2">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Employee Details</h5>
                    {selectedEmp && (
                        <small className="text-muted">
                            Showing charts for <strong>{selectedEmp.name}</strong> —{" "}
                            <span
                                style={{ cursor: "pointer", color: "#0d6efd" }}
                                onClick={() => setSelectedEmp(null)}
                            >
                                show all
                            </span>
                        </small>
                    )}
                </div>

                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle">
                        <thead className="table-light">
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
                                const rate = completionRate(emp);
                                const total =
                                    emp.completed + emp.ongoing + emp.overdue;
                                const isSelected = selectedEmp?.id === emp.id;

                                return (
                                    <tr
                                        key={emp.id}
                                        onClick={() => handleRowClick(emp)}
                                        style={{
                                            cursor: "pointer",
                                            backgroundColor: isSelected ? "#cfe2ff" : "",
                                            fontWeight: isSelected ? "600" : "normal",
                                            opacity:
                                                selectedEmp && !isSelected ? 0.5 : 1,
                                            transition:
                                                "opacity 0.2s, background-color 0.2s",
                                        }}
                                    >
                                        <td>
                                            {isSelected && (
                                                <span
                                                    className="me-1"
                                                    style={{ color: "#0d6efd" }}
                                                >
                                                    ▶
                                                </span>
                                            )}
                                            {emp.name}
                                        </td>
                                        <td>{emp.department}</td>
                                        <td>{emp.completed}</td>
                                        <td>{emp.ongoing}</td>
                                        <td className="text-danger fw-bold">
                                            {emp.overdue}
                                        </td>
                                        <td>
                                            {total === 0 ? (
                                                <span
                                                    className="text-muted"
                                                    style={{ fontSize: "0.9em" }}
                                                >
                                                    No tasks yet
                                                </span>
                                            ) : rate === 0 ? (
                                                <span
                                                    className="text-danger"
                                                    style={{
                                                        fontSize: "0.9em",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    0% — None completed
                                                </span>
                                            ) : (
                                                <div className="progress" style={{ height: 20 }}>
                                                    <div
                                                        className="progress-bar bg-success"
                                                        style={{ width: `${rate}%` }}
                                                        aria-valuenow={rate}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    >
                                                        {rate}%
                                                    </div>
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
                                                className="btn btn-link p-0"
                                                title={`View ${emp.name}'s tasks this week`}
                                                style={{ color: "#0d6efd" }}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="20"
                                                    height="20"
                                                    fill="currentColor"
                                                    viewBox="0 0 16 16"
                                                >
                                                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.133 13.133 0 0 1 1.172 8z" />
                                                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z" />
                                                </svg>
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
                    weekStart={weekStart}
                    weekEnd={weekEnd}
                    onClose={() => setModalDept(null)}
                />
            )}
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

const root = ReactDOM.createRoot(document.getElementById("weeklyReportRoot"));
root.render(<WeeklyReportPage />);