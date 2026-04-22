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





const QUARTER_LABELS = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };
const QUARTER_RANGES = {
    1: "Jan – Mar",
    2: "Apr – Jun",
    3: "Jul – Sep",
    4: "Oct – Dec",
};

function formatQuarterDisplay(year, quarter) {
    return `${QUARTER_LABELS[quarter]} ${year} (${QUARTER_RANGES[quarter]})`;
}

function getCurrentQuarter() {
    return Math.ceil((new Date().getMonth() + 1) / 3);
}

// ====================================================================
// EMPLOYEE TASK MODAL — quarterly version
// ====================================================================
function EmployeeTaskModal({ emp, quarterStart, quarterEnd, onClose }) {
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

        fetch(
            `php/get_employee_tasks_quarterly.php?employee_id=${emp.id}&quarter_start=${quarterStart}&quarter_end=${quarterEnd}`
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

    const quarterLabel = `${quarterStart} – ${quarterEnd}`;

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
                            {emp.department} &nbsp;·&nbsp; {quarterLabel}
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
                        {
                            label: "All",
                            key: "all",
                            count: tasks.length,
                            color: "#6c757d",
                        },
                        {
                            label: "Completed",
                            key: "Completed",
                            count: countFor("Completed"),
                            color: "#28a745",
                        },
                        {
                            label: "Ongoing",
                            key: "Ongoing",
                            count: countFor("Ongoing"),
                            color: "#ffc107",
                        },
                        {
                            label: "Overdue",
                            key: "Overdue",
                            count: countFor("Overdue"),
                            color: "#dc3545",
                        },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                border: `2px solid ${
                                    activeTab === tab.key ? tab.color : "#dee2e6"
                                }`,
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
                            No{" "}
                            {activeTab === "all"
                                ? ""
                                : activeTab.toLowerCase() + " "}
                            tasks found for this quarter.
                        </div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead
                                className="table-light"
                                style={{ position: "sticky", top: 0 }}
                            >
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
                                        deadlineLabel = new Date(
                                            task.deadline
                                        ).toLocaleDateString("en-PH", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        });

                                        if (
                                            task.derivedStatus === "Overdue" &&
                                            days !== null
                                        ) {
                                            deadlineSub = (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#dc3545",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {Math.abs(days)} day
                                                    {Math.abs(days) !== 1 ? "s" : ""} overdue
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
                                                        color:
                                                            days <= 2 ? "#dc3545" : "#6c757d",
                                                    }}
                                                >
                                                    {days === 0
                                                        ? "Due today"
                                                        : `${days} day${
                                                              days !== 1 ? "s" : ""
                                                          } left`}
                                                </div>
                                            );
                                        } else if (
                                            task.derivedStatus === "Completed" &&
                                            task.completed_at
                                        ) {
                                            deadlineSub = (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#28a745",
                                                    }}
                                                >
                                                    Done{" "}
                                                    {new Date(
                                                        task.completed_at
                                                    ).toLocaleDateString("en-PH", {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </div>
                                            );
                                        }
                                    }

                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>
                                                    {task.title}
                                                </div>
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
// DEPARTMENT TASK MODAL — shows all tasks for a specific department
// within the selected quarter. Uses get_department_tasks_report.php
// with week_start / week_end mapped to the quarter date range.
// ====================================================================
function DepartmentTaskModal({ dept, quarterStart, quarterEnd, onClose }) {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        setLoading(true);
        setError(null);
        setTasks([]);
        setActiveTab('all');
        fetch(`php/get_department_tasks_report.php?department_id=${dept.department_id}&week_start=${quarterStart}&week_end=${quarterEnd}`)
            .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
            .then(data => { if (data.error) throw new Error(data.error); setTasks(Array.isArray(data.tasks) ? data.tasks : []); setLoading(false); })
            .catch(err => { setError(`Could not load tasks: ${err.message}`); setLoading(false); });
    }, [dept.department_id, quarterStart, quarterEnd]);

    const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };
    const getStatus     = (t) => t.derived_status ?? t.status;
    const statusBadge   = (s) => ({ Completed: 'success', Ongoing: 'warning', Overdue: 'danger' }[s] ?? 'secondary');
    const priorityBadge = (p) => ({ High: 'danger', Medium: 'warning', Low: 'secondary' }[p] ?? 'secondary');
    const annotated = tasks.map(t => ({ ...t, derivedStatus: getStatus(t) }));
    const filtered  = activeTab === 'all' ? annotated : annotated.filter(t => t.derivedStatus === activeTab);
    const countFor  = (s) => annotated.filter(t => t.derivedStatus === s).length;

    return (
        <div onClick={handleBackdropClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{dept.department}</h5>
                        <small className="text-muted">Department tasks · {quarterStart} – {quarterEnd}</small>
                    </div>
                    <button className="btn-close" aria-label="Close" onClick={onClose} style={{ marginTop: 2 }} />
                </div>
                {/* Tab pills */}
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #dee2e6', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    {[
                        { label: 'All',       key: 'all',       count: tasks.length,         color: '#6c757d' },
                        { label: 'Completed', key: 'Completed', count: countFor('Completed'), color: '#28a745' },
                        { label: 'Ongoing',   key: 'Ongoing',   count: countFor('Ongoing'),   color: '#ffc107' },
                        { label: 'Overdue',   key: 'Overdue',   count: countFor('Overdue'),   color: '#dc3545' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            border: `2px solid ${activeTab === tab.key ? tab.color : '#dee2e6'}`,
                            borderRadius: 20, padding: '3px 14px',
                            background: activeTab === tab.key ? tab.color : '#fff',
                            color: activeTab === tab.key ? '#fff' : '#555',
                            fontWeight: 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                            {tab.label}{' '}
                            <span style={{ background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#eee', borderRadius: 10, padding: '1px 7px', marginLeft: 4, fontSize: 12 }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                {/* Body */}
                <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', flex: 1 }}>
                    {loading ? (
                        <div className="text-center text-muted py-4"><div className="spinner-border spinner-border-sm me-2" role="status"></div>Loading tasks...</div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-muted py-4">No {activeTab === 'all' ? '' : activeTab.toLowerCase() + ' '}tasks found for this department.</div>
                    ) : (
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
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
                                    let deadlineLabel = '—', deadlineSub = null;
                                    if (task.deadline) {
                                        deadlineLabel = new Date(task.deadline).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
                                        if (task.derivedStatus === 'Overdue' && days !== null)
                                            deadlineSub = <div style={{ fontSize: 11, color: '#dc3545', fontWeight: 600 }}>{Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} overdue</div>;
                                        else if (task.derivedStatus === 'Ongoing' && days !== null)
                                            deadlineSub = <div style={{ fontSize: 11, color: days <= 2 ? '#dc3545' : '#6c757d' }}>{days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} left`}</div>;
                                        else if (task.derivedStatus === 'Completed' && task.completed_at)
                                            deadlineSub = <div style={{ fontSize: 11, color: '#28a745' }}>Done {new Date(task.completed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>;
                                    }
                                    return (
                                        <tr key={task.id ?? idx}>
                                            <td><div style={{ fontWeight: 500 }}>{task.title}</div>{task.description && <small className="text-muted">{task.description}</small>}</td>
                                            <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: '#0d6efd' }}>{task.assigned_to_name ?? '—'}</td>
                                            <td><span className={`badge bg-${statusBadge(task.derivedStatus)}`}>{task.derivedStatus}</span></td>
                                            <td><span className={`badge bg-${priorityBadge(task.priority)}`}>{task.priority ?? '—'}</span></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{deadlineLabel}{deadlineSub}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* Footer */}
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MAIN PAGE
// ====================================================================
function QuarterlyReportPage() {
    const now = new Date();

    const [summary, setSummary] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        overdue: 0,
    });
    const [departments, setDepartments] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [year, setYear] = useState(now.getFullYear());
    const [quarter, setQuarter] = useState(getCurrentQuarter());
    const [selectedDept, setSelectedDept] = useState(null);
    const [modalEmp, setModalEmp]   = useState(null);
    const [modalDept, setModalDept] = useState(null);

    const groupedBarRef = useRef(null);
    const monthlyBarRef = useRef(null);
    const donutRef = useRef(null);
    const hBarRef = useRef(null);

    const groupedBarChart = useRef(null);
    const monthlyBarChart = useRef(null);
    const donutChart = useRef(null);
    const hBarChart = useRef(null);

    const qMonthStart = (quarter - 1) * 3 + 1;
    const qMonthEnd = qMonthStart + 2;
    const quarterStart = `${year}-${String(qMonthStart).padStart(2, "0")}-01`;
    const lastDay = new Date(year, qMonthEnd, 0).getDate();
    const quarterEnd = `${year}-${String(qMonthEnd).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    useEffect(() => {
        fetch("php/get_departments.php")
            .then((res) => res.json())
            .then((data) => setAllDepartments(data))
            .catch(() => setAllDepartments([]));
    }, []);

    useEffect(() => {
        setSelectedDept(null);
        setModalEmp(null);
        setModalDept(null);

        fetch(
            `php/get_quarterly_report.php?year=${year}&quarter=${quarter}&department=${departmentFilter}`
        )
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    console.error("PHP error:", data.error);
                    return;
                }
                setSummary(data.summary);
                setDepartments(data.departments ?? []);
                setMonthlyTrend(data.monthly_trend ?? []);
                setEmployees(data.employees ?? []);
            })
            .catch((err) => console.error(err));
    }, [year, quarter, departmentFilter]);

    const chartDepts = selectedDept
        ? departments.filter((d) => d.department_id === selectedDept.department_id)
        : departments;
    const deptLabels = chartDepts.map((d) => d.department);
    const deptCompleted = chartDepts.map((d) => d.completed);
    const deptOngoing = chartDepts.map((d) => d.ongoing);
    const deptOverdue = chartDepts.map((d) => d.overdue);

    const monthNames = monthlyTrend.map((m) => m.month_name);
    const trendCompleted = monthlyTrend.map((m) => m.completed);
    const trendOngoing = monthlyTrend.map((m) => m.ongoing);
    const trendOverdue = monthlyTrend.map((m) => m.overdue);

    const donutData = [summary.completed, summary.ongoing, summary.overdue];

    const empSorted = [...employees].sort(
        (a, b) => b.completion_rate - a.completion_rate
    );
    const empNames = empSorted.map((e) => e.name);
    const empCompleted = empSorted.map((e) => e.completed);
    const empOverdue = empSorted.map((e) => e.overdue);

    useEffect(() => {
        if (groupedBarChart.current) groupedBarChart.current.destroy();
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
                    title: {
                        display: !!selectedDept,
                        text: selectedDept ? `Focused: ${selectedDept.department}` : "",
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx) => {
                                const dept = chartDepts[ctx.dataIndex];
                                return dept
                                    ? `Completion rate: ${dept.completion_rate}%`
                                    : "";
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

        if (monthlyBarChart.current) monthlyBarChart.current.destroy();
        monthlyBarChart.current = new Chart(monthlyBarRef.current, {
            type: "bar",
            data: {
                labels: monthNames,
                datasets: [
                    {
                        label: "Completed",
                        data: trendCompleted,
                        backgroundColor: "#28a745",
                        borderRadius: 4,
                    },
                    {
                        label: "Ongoing",
                        data: trendOngoing,
                        backgroundColor: "#ffc107",
                        borderRadius: 4,
                    },
                    {
                        label: "Overdue",
                        data: trendOverdue,
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
                            footer: (items) => {
                                const idx = items[0].dataIndex;
                                const comp = trendCompleted[idx];
                                const total =
                                    comp + trendOngoing[idx] + trendOverdue[idx];
                                const rate =
                                    total > 0 ? Math.round((comp / total) * 100) : 0;
                                return `Completion rate: ${rate}%`;
                            },
                        },
                    },
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                    },
                },
            },
        });

        if (donutChart.current) donutChart.current.destroy();
        donutChart.current = new Chart(donutRef.current, {
            type: "doughnut",
            data: {
                labels: ["Completed", "Ongoing", "Overdue"],
                datasets: [
                    {
                        data: donutData,
                        backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
                        borderWidth: 2,
                        borderColor: "#fff",
                        hoverOffset: 8,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw;
                                const total = donutData.reduce((a, b) => a + b, 0);
                                const pct =
                                    total > 0 ? Math.round((val / total) * 100) : 0;
                                return ` ${ctx.label}: ${val} (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });

        if (hBarChart.current) hBarChart.current.destroy();
        if (empSorted.length > 0) {
            hBarChart.current = new Chart(hBarRef.current, {
                type: "bar",
                data: {
                    labels: empNames,
                    datasets: [
                        {
                            label: "Completed",
                            data: empCompleted,
                            backgroundColor: "#28a745",
                            borderRadius: 4,
                        },
                        {
                            label: "Overdue",
                            data: empOverdue,
                            backgroundColor: "#dc3545",
                            borderRadius: 4,
                        },
                    ],
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "top" },
                        tooltip: {
                            callbacks: {
                                afterLabel: (ctx) => {
                                    const emp = empSorted[ctx.dataIndex];
                                    return emp
                                        ? `Completion rate: ${emp.completion_rate}%`
                                        : "";
                                },
                            },
                        },
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { stepSize: 1 } },
                        y: { grid: { display: false } },
                    },
                },
            });
        }

        return () => {
            if (groupedBarChart.current) groupedBarChart.current.destroy();
            if (monthlyBarChart.current) monthlyBarChart.current.destroy();
            if (donutChart.current) donutChart.current.destroy();
            if (hBarChart.current) hBarChart.current.destroy();
        };
    }, [selectedDept, summary, departments, employees, monthlyTrend, year, quarter]);

    const isCurrentQuarter =
        year === now.getFullYear() && quarter === getCurrentQuarter();

    const goToPrevQuarter = () => {
        if (quarter === 1) {
            setYear((y) => y - 1);
            setQuarter(4);
        } else {
            setQuarter((q) => q - 1);
        }
    };

    const goToNextQuarter = () => {
        if (quarter === 4) {
            setYear((y) => y + 1);
            setQuarter(1);
        } else {
            setQuarter((q) => q + 1);
        }
    };

    const goToCurrentQuarter = () => {
        setYear(now.getFullYear());
        setQuarter(getCurrentQuarter());
    };

    const summaryTotal = summary.completed + summary.ongoing + summary.overdue;
    const summaryRate =
        summaryTotal > 0
            ? Math.round((summary.completed / summaryTotal) * 100)
            : 0;

    return (
        <div className="quarterly-report-page p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Quarterly Task Report</h2>
                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={goToPrevQuarter}
                    >
                        ‹ Prev
                    </button>
                    <span
                        className="fw-semibold"
                        style={{ minWidth: 220, textAlign: "center" }}
                    >
                        {formatQuarterDisplay(year, quarter)}
                    </span>
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={goToNextQuarter}
                        disabled={isCurrentQuarter}
                    >
                        Next ›
                    </button>
                    {!isCurrentQuarter && (
                        <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={goToCurrentQuarter}
                        >
                            This Quarter
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <select
                    className="form-select w-auto"
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
                <div className="col-md-2">
                    <div className="card shadow-sm border-0 p-3 text-center">
                        <h6 className="text-muted mb-1">Ongoing</h6>
                        <h2 className="text-warning mb-0">{summary.ongoing}</h2>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card shadow-sm border-0 p-3 text-center">
                        <h6 className="text-muted mb-1">Overdue</h6>
                        <h2 className="text-danger mb-0">{summary.overdue}</h2>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card shadow-sm border-0 p-3 text-center">
                        <h6 className="text-muted mb-1">Completion Rate</h6>
                        <h2
                            className={`mb-0 ${
                                summaryRate >= 70
                                    ? "text-success"
                                    : summaryRate >= 40
                                    ? "text-warning"
                                    : "text-danger"
                            }`}
                        >
                            {summaryRate}%
                        </h2>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-12">
                    <div className="card shadow-sm border-0 p-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h5 className="mb-0">Department Task Comparison</h5>
                                <small className="text-muted">
                                    Completed, Ongoing, and Overdue per department this
                                    quarter
                                </small>
                            </div>
                            {selectedDept && (
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-primary">
                                        {selectedDept.department}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => setSelectedDept(null)}
                                    >
                                        ✕ Show all
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={{ height: 300 }}>
                            <canvas ref={groupedBarRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0 p-3 h-100">
                        <h5 className="mb-1">Monthly Breakdown</h5>
                        <small className="text-muted d-block mb-3">
                            Task volume and composition across the 3 months of{" "}
                            {QUARTER_LABELS[quarter]} {year}
                        </small>
                        <div style={{ height: 260 }}>
                            <canvas ref={monthlyBarRef}></canvas>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card shadow-sm border-0 p-3 h-100">
                        <h5 className="mb-1">Quarter Status Mix</h5>
                        <small className="text-muted d-block mb-3">
                            Overall share of completed, ongoing, and overdue tasks
                        </small>
                        <div style={{ height: 260 }}>
                            <canvas ref={donutRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-12">
                    <div className="card shadow-sm border-0 p-3">
                        <h5 className="mb-1">Employee Performance</h5>
                        <small className="text-muted d-block mb-3">
                            Sorted by most tasks completed this quarter. Hover a bar for
                            completion rate.
                        </small>
                        <div style={{ height: Math.max(200, empSorted.length * 36) }}>
                            <canvas ref={hBarRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0 p-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Department Details</h5>
                    {selectedDept && (
                        <small className="text-muted">
                            Focused on <strong>{selectedDept.department}</strong> —{" "}
                            <span
                                style={{ cursor: "pointer", color: "#0d6efd" }}
                                onClick={() => setSelectedDept(null)}
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
                                <th>Department</th>
                                <th>Total</th>
                                <th>Completed</th>
                                <th>Ongoing</th>
                                <th>Overdue</th>
                                <th>Completion Rate</th>
                                <th style={{ textAlign: "center", width: 60 }}>Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map((dept) => {
                                const isSelected =
                                    selectedDept?.department_id === dept.department_id;

                                return (
                                    <tr
                                        key={dept.department_id}
                                        onClick={() =>
                                            setSelectedDept((prev) =>
                                                prev?.department_id === dept.department_id
                                                    ? null
                                                    : dept
                                            )
                                        }
                                        style={{
                                            cursor: "pointer",
                                            backgroundColor: isSelected ? "#cfe2ff" : "",
                                            fontWeight: isSelected ? "600" : "normal",
                                            opacity:
                                                selectedDept && !isSelected ? 0.5 : 1,
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
                                            {dept.department}
                                        </td>
                                        <td>{dept.total}</td>
                                        <td>{dept.completed}</td>
                                        <td>{dept.ongoing}</td>
                                        <td className="text-danger fw-bold">
                                            {dept.overdue}
                                        </td>
                                        <td>
                                            {dept.total === 0 ? (
                                                <span
                                                    className="text-muted"
                                                    style={{ fontSize: "0.9em" }}
                                                >
                                                    No tasks yet
                                                </span>
                                            ) : dept.completion_rate === 0 ? (
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
                                                        style={{
                                                            width: `${dept.completion_rate}%`,
                                                        }}
                                                        aria-valuenow={dept.completion_rate}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    >
                                                        {dept.completion_rate}%
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        {/* Eye icon — opens DepartmentTaskModal for this dept */}
                                        <td
                                            style={{ textAlign: "center" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setModalDept(dept);
                                            }}
                                        >
                                            <button
                                                className="btn btn-link p-0"
                                                title={`View ${dept.department} tasks this quarter`}
                                                style={{ color: "#0d6efd" }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
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

            <div className="card shadow-sm border-0 p-3">
                <h5 className="mb-3">Employee Details</h5>
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
                                const rate = emp.completion_rate;
                                const total = emp.total;

                                return (
                                    <tr key={emp.id}>
                                        <td>{emp.name}</td>
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
                                                title={`View ${emp.name}'s tasks this quarter`}
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

            {modalEmp && (
                <EmployeeTaskModal
                    emp={modalEmp}
                    quarterStart={quarterStart}
                    quarterEnd={quarterEnd}
                    onClose={() => setModalEmp(null)}
                />
            )}

            {/* DepartmentTaskModal — rendered at page root, outside the table */}
            {modalDept && (
                <DepartmentTaskModal
                    dept={modalDept}
                    quarterStart={quarterStart}
                    quarterEnd={quarterEnd}
                    onClose={() => setModalDept(null)}
                />
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<QuarterlyReportPage />);