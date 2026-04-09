import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

window.sileo = sileo;

const API_BASE = "http://localhost/taskmanagement/staff/php";
const TASKS_PER_PAGE = 5;
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const STATUS_OPTIONS = ["Ongoing", "Completed"];

function normalizeText(value = "") {
    return String(value).trim().toLowerCase();
}

function showToast(type = "info", title = "Notice", description = "") {
    const method = window.sileo?.[type] || window.sileo?.info;

    if (typeof method === "function") {
        method({ title, description });
        return;
    }

    console.warn("Sileo is not ready yet.", { type, title, description });
}

async function parseServerResponse(response, fallbackMessage) {
    const rawText = (await response.text()).trim();
    let parsed = null;

    try {
        parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
        parsed = null;
    }

    const parsedStatus = normalizeText(parsed?.status);
    const parsedSuccess = parsed?.success === true || parsedStatus === "success" || parsedStatus === "ok";
    const textSuccess = /^success\b/i.test(rawText) || /successfully/i.test(rawText);
    const success = response.ok && (parsedSuccess || textSuccess);
    const message = parsed?.message || rawText || fallbackMessage;

    if (!success) {
        throw new Error(message || fallbackMessage);
    }

    return message;
}

function formatDate(dateStr) {
    if (!dateStr) return "-";

    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function parseYMD(value) {
    if (!value) return null;

    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
    return (
        a &&
        b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function formatCalendarMonth(date) {
    return date.toLocaleString("en-US", { month: "short" });
}

function getYearOptions(centerYear) {
    const startYear = 2000;
    const endYear = new Date().getFullYear() + 10;
    const years = [];

    for (let year = endYear; year >= startYear; year -= 1) {
        years.push(year);
    }

    if (!years.includes(centerYear)) {
        years.unshift(centerYear);
    }

    return years;
}

function getCalendarDays(viewDate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const mondayIndex = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayIndex);

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function formatDueDateChipLabel(value) {
    const parsed = parseYMD(value);
    if (!parsed) return "Due Date";

    return `Due Date ${parsed.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric"
    })}`;
}

function formatModalDateLabel(value, placeholder = "Select date") {
    const parsed = parseYMD(value);
    if (!parsed) return placeholder;

    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function getPriorityMeta(priority = "") {
    const normalized = normalizeText(priority);

    if (normalized === "high") {
        return {
            label: "High",
            chipClass: "priority-chip-high",
            dotClass: "priority-dot-high"
        };
    }

    if (normalized === "medium") {
        return {
            label: "Medium",
            chipClass: "priority-chip-medium",
            dotClass: "priority-dot-medium"
        };
    }

    return {
        label: "Low",
        chipClass: "priority-chip-low",
        dotClass: "priority-dot-low"
    };
}

function ModalDatePicker({
    label,
    value,
    onChange,
    placeholder = "Select date"
}) {
    const [open, setOpen] = React.useState(false);
    const selectedDate = parseYMD(value);
    const [viewDate, setViewDate] = React.useState(selectedDate || new Date());
    const rootRef = React.useRef(null);
    const today = new Date();

    const closePicker = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closePicker);

    React.useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate);
        }
    }, [selectedDate]);

    const days = React.useMemo(() => getCalendarDays(viewDate), [viewDate]);

    function handlePick(date) {
        onChange(formatYMD(date));
        closePicker();
    }

    function handleClear() {
        onChange("");
        closePicker();
    }

    return (
        <div className="task-form-field">
            <label className="form-label task-form-label">{label}</label>

            <div className="modal-picker-shell" ref={rootRef}>
                <button
                    type="button"
                    className={`modal-picker-trigger ${open ? "is-open" : ""} ${value ? "has-value" : ""}`}
                    onClick={() => setOpen(current => !current)}
                    aria-expanded={open}
                    aria-haspopup="dialog"
                >
                    <span className={`modal-picker-trigger-text ${value ? "" : "is-placeholder"}`}>
                        {formatModalDateLabel(value, placeholder)}
                    </span>

                    <span className="modal-picker-trigger-icon">
                        <i className="bi bi-calendar3"></i>
                    </span>
                </button>

                {open && (
                    <div className="modal-calendar-popover" role="dialog" aria-label={label}>
                        <div className="modal-calendar-header">
                            <button
                                type="button"
                                className="modal-calendar-title"
                            >
                                {formatCalendarMonth(viewDate)} {viewDate.getFullYear()}
                                <i className="bi bi-chevron-down"></i>
                            </button>

                            <div className="modal-calendar-nav">
                                <button
                                    type="button"
                                    className="modal-calendar-nav-btn"
                                    onClick={() =>
                                        setViewDate(
                                            new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                                        )
                                    }
                                    aria-label="Previous month"
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>

                                <button
                                    type="button"
                                    className="modal-calendar-nav-btn"
                                    onClick={() =>
                                        setViewDate(
                                            new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                                        )
                                    }
                                    aria-label="Next month"
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        <div className="modal-calendar-weekdays">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                                <div key={day} className="modal-calendar-weekday">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="modal-calendar-grid">
                            {days.map(day => {
                                const isOutside = day.getMonth() !== viewDate.getMonth();
                                const isSelected = isSameDay(day, selectedDate);
                                const isToday = isSameDay(day, today);

                                return (
                                    <button
                                        key={day.toISOString()}
                                        type="button"
                                        className={[
                                            "modal-calendar-day",
                                            isOutside ? "is-outside" : "",
                                            isSelected ? "is-selected" : "",
                                            !isSelected && isToday ? "is-today" : ""
                                        ].join(" ").trim()}
                                        onClick={() => handlePick(day)}
                                    >
                                        <span className="modal-calendar-day-number">
                                            {day.getDate()}
                                        </span>

                                        {isSelected && <span className="modal-calendar-day-dot"></span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="modal-calendar-footer">
                            <button
                                type="button"
                                className="modal-calendar-clear"
                                onClick={handleClear}
                            >
                                All dates
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ModalPriorityPicker({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef(null);

    const options = PRIORITY_OPTIONS;
    const currentMeta = getPriorityMeta(value);

    const closeMenu = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenu);

    return (
        <div className="task-form-field">
            <label className="form-label task-form-label">Priority</label>

            <div className="modal-picker-shell" ref={rootRef}>
                <button
                    type="button"
                    className={`modal-picker-trigger modal-priority-trigger ${open ? "is-open" : ""}`}
                    onClick={() => setOpen(current => !current)}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className={`modal-priority-chip ${currentMeta.chipClass}`}>
                        <i className="bi bi-flag-fill"></i>
                        {currentMeta.label}
                    </span>

                    <span className="modal-picker-trigger-icon">
                        <i className="bi bi-chevron-down"></i>
                    </span>
                </button>

                {open && (
                    <div className="modal-priority-popover" role="listbox" aria-label="Choose priority">
                        {options.map(option => {
                            const meta = getPriorityMeta(option);
                            const active = option === value;

                            return (
                                <button
                                    key={option}
                                    type="button"
                                    className={`modal-priority-option ${active ? "is-active" : ""}`}
                                    aria-selected={active}
                                    onClick={() => {
                                        onChange(option);
                                        closeMenu();
                                    }}
                                >
                                    <span className={`modal-priority-chip ${meta.chipClass}`}>
                                        <i className="bi bi-flag-fill"></i>
                                        {meta.label}
                                    </span>

                                    {active && <i className="bi bi-check2 modal-priority-check"></i>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatPriorityChipLabel(value) {
    if (!value || value === "all") return "Priority";
    return `Priority ${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getLaneKey(task = {}) {
    const normalized = normalizeText(task.status);

    if (normalized === "completed") return "completed";
    if (task.is_overdue || normalized === "overdue") return "overdue";
    return "ongoing";
}

function getLaneMeta(laneKey) {
    if (laneKey === "overdue") {
        return {
            title: "Overdue",
            badgeClass: "task-lane-badge task-lane-badge-overdue",
            dotClass: "task-lane-dot task-lane-dot-overdue"
        };
    }

    if (laneKey === "completed") {
        return {
            title: "Completed",
            badgeClass: "task-lane-badge task-lane-badge-completed",
            dotClass: "task-lane-dot task-lane-dot-completed"
        };
    }

    return {
        title: "Ongoing",
        badgeClass: "task-lane-badge task-lane-badge-ongoing",
        dotClass: "task-lane-dot task-lane-dot-ongoing"
    };
}

function getPriorityClass(priority = "") {
    const normalized = normalizeText(priority);

    if (normalized === "high") return "task-priority-high";
    if (normalized === "medium") return "task-priority-medium";
    return "task-priority-low";
}

function getPaginatedItems(items, currentPage, pageSize = TASKS_PER_PAGE) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;

    return {
        totalPages,
        currentPage: safePage,
        items: items.slice(startIndex, startIndex + pageSize)
    };
}

function useDismissiblePopup(rootRef, onClose) {
    React.useEffect(() => {
        function handleOutside(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                onClose();
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [rootRef, onClose]);
}

function TaskDateFilter({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
    const selectedDate = parseYMD(value);
    const [viewDate, setViewDate] = React.useState(selectedDate || new Date());
    const rootRef = React.useRef(null);
    const today = new Date();

    const closeMenus = React.useCallback(() => {
        setOpen(false);
        setYearMenuOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenus);

    React.useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate);
        }
    }, [selectedDate]);

    const days = React.useMemo(() => getCalendarDays(viewDate), [viewDate]);
    const years = React.useMemo(
        () => getYearOptions(viewDate.getFullYear()),
        [viewDate]
    );

    function pickDate(date) {
        onChange(formatYMD(date));
        closeMenus();
    }

    function clearDate() {
        onChange("");
        closeMenus();
    }

    function changeYear(year) {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setYearMenuOpen(false);
    }

    return (
        <div className="task-toolbar-filter-shell" ref={rootRef}>
            <button
                type="button"
                className={`task-toolbar-chip ${open ? "is-open" : ""} ${value ? "is-selected" : ""}`}
                onClick={() => setOpen(current => !current)}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <i className="bi bi-calendar3"></i>
                <span>{formatDueDateChipLabel(value)}</span>
                <i className="bi bi-chevron-down"></i>
            </button>

            {open && (
                <div className="task-toolbar-picker-popup" role="dialog" aria-label="Choose due date">
                    <div className="task-toolbar-picker-header">
                        <div className="task-toolbar-picker-title">
                            <button
                                type="button"
                                className="task-toolbar-year-trigger"
                                onClick={() => setYearMenuOpen(current => !current)}
                                aria-expanded={yearMenuOpen}
                            >
                                <span>
                                    {formatCalendarMonth(viewDate)} {viewDate.getFullYear()}
                                </span>
                                <i className={`bi ${yearMenuOpen ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                            </button>

                            {yearMenuOpen && (
                                <div className="task-toolbar-year-menu">
                                    {years.map(year => (
                                        <button
                                            key={year}
                                            type="button"
                                            className={`task-toolbar-year-option ${
                                                year === viewDate.getFullYear() ? "is-selected" : ""
                                            }`}
                                            onClick={() => changeYear(year)}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="task-toolbar-picker-nav">
                            <button
                                type="button"
                                onClick={() =>
                                    setViewDate(
                                        new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                                    )
                                }
                                aria-label="Previous month"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setViewDate(
                                        new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                                    )
                                }
                                aria-label="Next month"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>

                    <div className="task-toolbar-picker-weekdays">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                            <div key={day} className="task-toolbar-picker-weekday">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="task-toolbar-picker-grid">
                        {days.map(day => {
                            const isOutside = day.getMonth() !== viewDate.getMonth();
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, today);

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    className={[
                                        "task-toolbar-picker-day",
                                        isOutside ? "is-outside" : "",
                                        isSelected ? "is-selected" : "",
                                        !isSelected && isToday ? "is-today" : ""
                                    ].join(" ").trim()}
                                    onClick={() => pickDate(day)}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="task-toolbar-picker-footer">
                        <button
                            type="button"
                            className="task-toolbar-clear-btn"
                            onClick={clearDate}
                        >
                            All dates
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TaskPriorityFilter({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef(null);

    const options = [
        { value: "all", label: "All" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" }
    ];

    const closeMenu = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenu);

    return (
        <div className="task-toolbar-filter-shell" ref={rootRef}>
            <button
                type="button"
                className={`task-toolbar-chip ${open ? "is-open" : ""} ${value !== "all" ? "is-selected" : ""}`}
                onClick={() => setOpen(current => !current)}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <i className="bi bi-flag"></i>
                <span>{formatPriorityChipLabel(value)}</span>
                <i className="bi bi-chevron-down"></i>
            </button>

            {open && (
                <div className="task-toolbar-select-popup" role="listbox" aria-label="Choose priority">
                    {options.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            className={`task-toolbar-select-option ${
                                value === option.value ? "is-selected" : ""
                            }`}
                            aria-selected={value === option.value}
                            onClick={() => {
                                onChange(option.value);
                                closeMenu();
                            }}
                        >
                            <span>{option.label}</span>
                            {value === option.value && <i className="bi bi-check2"></i>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ====================================================================
// TASK COMMENT MODAL
// Shows the message thread for a specific task and lets the recipient
// reply with optional file attachments.
//
// Props:
//   task          — the task object
//   currentUserId — logged-in user's ID (fetched from get_current_user.php)
//   recipientId   — the person to reply TO. On this page the current user
//                   IS the original recipient, so the reply goes back to
//                   whoever assigned / messaged them: task.created_by
//                   (the supervisor). Falls back to task.assigned_by if
//                   present, otherwise the server resolves it.
//   onClose       — close handler
// ====================================================================
function TaskCommentModal({ task, currentUserId, recipientId, onClose }) {
    const [messages,  setMessages]  = React.useState([]);
    const [loading,   setLoading]   = React.useState(true);
    const [error,     setError]     = React.useState(null);
    const [text,      setText]      = React.useState('');
    const [files,     setFiles]     = React.useState([]);  // File[] staged for upload
    const [sending,   setSending]   = React.useState(false);
    const [sendError, setSendError] = React.useState(null);
    const bottomRef = React.useRef(null);
    const fileRef   = React.useRef(null); // hidden <input type="file">

    // Fetch messages when modal opens
    React.useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`${API_BASE}/get_task_messages.php?task_id=${task.id}`)
            .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
            .then(data => {
                if (data.error) throw new Error(data.error);
                setMessages(Array.isArray(data.messages) ? data.messages : []);
                setLoading(false);
            })
            .catch(err => { setError(`Could not load comments: ${err.message}`); setLoading(false); });
    }, [task.id]);

    // Scroll to bottom whenever messages update
    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Send handler ────────────────────────────────────────────────
    // Uses FormData so files can travel with the message.
    // recipient_id is always the person who originally sent the message
    // to this employee (i.e. task.created_by / the supervisor).
    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed && files.length === 0) return;

        setSending(true);
        setSendError(null);

        const fd = new FormData();
        fd.append('task_id',      task.id);
        fd.append('recipient_id', recipientId);
        fd.append('message',      trimmed);
        files.forEach(f => fd.append('attachments[]', f));

        fetch(`${API_BASE}/send_task_message.php`, { method: 'POST', body: fd })
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

    // Add picked files — deduplicate by name+size to avoid double-adds
    const handleFileChange = (e) => {
        const picked = Array.from(e.target.files);
        setFiles(prev => {
            const existing = new Set(prev.map(f => `${f.name}|${f.size}`));
            return [...prev, ...picked.filter(f => !existing.has(`${f.name}|${f.size}`))];
        });
        e.target.value = ''; // reset so same file can be re-selected after removal
    };

    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

    // ── Helpers ─────────────────────────────────────────────────────

    const fmtTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
             + ', '
             + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const fmtSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const initials = (name) => name
        ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    const avatarBg = (name) => {
        const hue = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
        return `hsl(${hue},50%,85%)`;
    };
    const avatarFg = (name) => {
        const hue = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
        return `hsl(${hue},50%,30%)`;
    };

    const canSend = !sending && (text.trim().length > 0 || files.length > 0);

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 2000, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: '1rem',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: 14, width: '100%',
                maxWidth: 560, maxHeight: '82vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 16px 48px rgba(0,0,0,0.24)',
            }}>
                {/* ── Header ─────────────────────────────────────────── */}
                <div style={{
                    padding: '0.9rem 1.25rem',
                    borderBottom: '1px solid #eee',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', flexShrink: 0,
                }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                        <div style={{
                            fontWeight: 700, fontSize: 15, color: '#111',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            💬 {task.title}
                        </div>
                        <small style={{ color: '#888' }}>
                            {messages.length} comment{messages.length !== 1 ? 's' : ''}
                        </small>
                    </div>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 18, color: '#aaa', lineHeight: 1, padding: 0,
                            marginTop: 2, flexShrink: 0,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* ── Message thread ──────────────────────────────────── */}
                <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem 0' }}>
                            <div style={{ marginBottom: 8, fontSize: 20 }}>⏳</div>
                            Loading comments…
                        </div>
                    ) : error ? (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fca5a5',
                            color: '#b91c1c', borderRadius: 8,
                            padding: '8px 12px', fontSize: 13,
                        }}>
                            {error}
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem 0', fontSize: 14 }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                            No comments yet. Be the first to reply.
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
                                            background: avatarBg(msg.sender_name),
                                            color: avatarFg(msg.sender_name),
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

                                            {/* Text bubble — only shown if there's a body */}
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

                {/* ── Compose box ─────────────────────────────────────── */}
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderTop: '1px solid #eee', flexShrink: 0,
                }}>
                    {sendError && (
                        <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 6 }}>{sendError}</div>
                    )}

                    {/* Staged file chips */}
                    {files.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {files.map((f, i) => (
                                <div key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    background: '#f0f4ff', border: '1px solid #c9d8fb',
                                    borderRadius: 6, padding: '3px 8px',
                                    fontSize: 12, color: '#2a52a8', maxWidth: 220,
                                }}>
                                    <span>📎</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                        {f.name}
                                    </span>
                                    <span style={{ color: '#888', flexShrink: 0 }}>{fmtSize(f.size)}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            padding: 0, color: '#888', fontSize: 13, lineHeight: 1, flexShrink: 0,
                                        }}
                                        title="Remove file"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        {/* Hidden file input */}
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
                                flexShrink: 0, fontSize: 17,
                                opacity: sending ? 0.5 : 1,
                                transition: 'background 0.15s, border-color 0.15s',
                                position: 'relative',
                            }}
                        >
                            📎
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
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Write a reply…  (Ctrl+Enter to send)"
                            style={{
                                flex: 1, resize: 'none', border: '1px solid #dee2e6',
                                borderRadius: 8, padding: '8px 10px', fontSize: 13,
                                outline: 'none', fontFamily: 'inherit',
                            }}
                        />

                        <button
                            type="button"
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

function App() {
    const [tasks, setTasks] = React.useState([]);
    const [currentUserId, setCurrentUserId] = React.useState(null);
    const [dueDateFilter, setDueDateFilter] = React.useState("");
    const [priorityFilter, setPriorityFilter] = React.useState("all");

    // Fetch the logged-in user's ID once on mount.
    // get_current_user.php returns { id, name, ... } from the active session.
    React.useEffect(() => {
        fetch(`${API_BASE}/get_current_user.php`)
            .then(r => r.json())
            .then(data => { if (data.id) setCurrentUserId(data.id); })
            .catch(() => {});
    }, []);

    const fetchTasks = React.useCallback(async ({ silent = true } = {}) => {
        try {
            const response = await fetch(`${API_BASE}/get_tasks.php`);

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error:", error);
            setTasks([]);

            if (!silent) {
                showToast("error", "Load failed", error.message || "Unable to load tasks.");
            }
        }
    }, []);

    React.useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return (
        <div className="task-view">
            <Toaster />

            <div className="task-toolbar">
                <div className="task-toolbar-left">
                    <TaskDateFilter
                        value={dueDateFilter}
                        onChange={setDueDateFilter}
                    />

                    <TaskPriorityFilter
                        value={priorityFilter}
                        onChange={setPriorityFilter}
                    />
                </div>

                <button
                    type="button"
                    className="task-create-btn"
                    onClick={() => document.getElementById("openReactModalBtn")?.click()}
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>Add New Task</span>
                </button>
            </div>

            <ModalController refreshTasks={fetchTasks} />

            <TaskTable
                tasks={tasks}
                refreshTasks={fetchTasks}
                dueDateFilter={dueDateFilter}
                priorityFilter={priorityFilter}
                currentUserId={currentUserId}
            />
        </div>
    );
}

function TaskTable({ tasks, refreshTasks, dueDateFilter, priorityFilter, currentUserId }) {
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [showDetailModal, setShowDetailModal] = React.useState(false);
    const [commentTask, setCommentTask] = React.useState(null); // task whose comment panel is open

    const [collapsedLanes, setCollapsedLanes] = React.useState({
        ongoing: false,
        overdue: false,
        completed: false
    });

    const [lanePages, setLanePages] = React.useState({
        ongoing: 1,
        overdue: 1,
        completed: 1
    });

    const filteredTasks = tasks.filter(task => {
        const matchesDueDate = !dueDateFilter || task.deadline === dueDateFilter;
        const matchesPriority =
            priorityFilter === "all" ||
            normalizeText(task.priority) === priorityFilter;

        return matchesDueDate && matchesPriority;
    });

    const laneTaskMap = {
        ongoing: filteredTasks.filter(task => getLaneKey(task) === "ongoing"),
        overdue: filteredTasks.filter(task => getLaneKey(task) === "overdue"),
        completed: filteredTasks.filter(task => getLaneKey(task) === "completed")
    };

    React.useEffect(() => {
        setLanePages({
            ongoing: 1,
            overdue: 1,
            completed: 1
        });
    }, [dueDateFilter, priorityFilter, tasks]);

    function handleRowClick(task) {
        setSelectedTask(task);
        setShowDetailModal(true);
    }

    function handleToggleLane(laneKey) {
        setCollapsedLanes(prev => ({
            ...prev,
            [laneKey]: !prev[laneKey]
        }));
    }

    function handlePageChange(laneKey, page) {
        setLanePages(prev => ({
            ...prev,
            [laneKey]: page
        }));
    }

    return (
        <>
            <div className="task-board-shell">
                {["ongoing", "overdue", "completed"].map(laneKey => (
                    <TaskLane
                        key={laneKey}
                        laneKey={laneKey}
                        tasks={laneTaskMap[laneKey]}
                        onRowClick={handleRowClick}
                        onComment={task => setCommentTask(task)}
                        collapsed={collapsedLanes[laneKey]}
                        onToggle={() => handleToggleLane(laneKey)}
                        currentPage={lanePages[laneKey]}
                        onPageChange={page => handlePageChange(laneKey, page)}
                    />
                ))}
            </div>

            {showDetailModal && selectedTask && (
                <TaskDetailModal
                    show={showDetailModal}
                    task={selectedTask}
                    onClose={() => setShowDetailModal(false)}
                    refreshTasks={refreshTasks}
                    currentUserId={currentUserId}
                />
            )}

            {/* TaskCommentModal — opened directly from the row comment button.
                Rendered here at TaskTable level so it stacks above everything. */}
            {commentTask && (
                <TaskCommentModal
                    task={commentTask}
                    currentUserId={currentUserId}
                    recipientId={commentTask.created_by ?? commentTask.assigned_by ?? null}
                    onClose={() => setCommentTask(null)}
                />
            )}
        </>
    );
}

function TaskLane({
    laneKey,
    tasks,
    onRowClick,
    onComment,
    collapsed,
    onToggle,
    currentPage,
    onPageChange
}) {
    const meta = getLaneMeta(laneKey);

    const {
        items: paginatedTasks,
        totalPages,
        currentPage: safePage
    } = getPaginatedItems(tasks, currentPage);

    const startItem = tasks.length === 0 ? 0 : (safePage - 1) * TASKS_PER_PAGE + 1;
    const endItem = Math.min(safePage * TASKS_PER_PAGE, tasks.length);

    return (
        <section className="task-lane-card">
            <div className="task-lane-head">
                <div className="task-lane-head-left">
                    <button
                        type="button"
                        className={`task-lane-icon-btn ${collapsed ? "is-collapsed" : ""}`}
                        aria-label={`${collapsed ? "Expand" : "Collapse"} ${meta.title}`}
                        aria-expanded={!collapsed}
                        onClick={onToggle}
                    >
                        <i className="bi bi-chevron-down"></i>
                    </button>

                    <span className={meta.badgeClass}>
                        <span className={meta.dotClass}></span>
                        {meta.title}
                    </span>
                </div>

                <div className="task-lane-head-right">
                    <span className="task-lane-count">{tasks.length}</span>
                </div>
            </div>

            {!collapsed && (
                <>
                    <div className="task-lane-grid">
                        <div className="task-lane-grid-head">
                            <div>Task Name</div>
                            <div>Task Description</div>
                            <div style={{ textAlign: "center" }}>Comments</div>
                            <div>Start Date</div>
                            <div>Due Date</div>
                            <div>Priority</div>
                        </div>

                        <div className="task-lane-grid-body">
                            {tasks.length === 0 ? (
                                <div className="task-lane-empty">No tasks found</div>
                            ) : (
                                paginatedTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`task-lane-row ${task.is_overdue ? "is-overdue" : ""}`}
                                        onClick={() => onRowClick(task)}
                                        role="button"
                                        tabIndex="0"
                                        onKeyDown={event => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                onRowClick(task);
                                            }
                                        }}
                                    >
                                        <div className="task-lane-col task-lane-col-name">
                                            <span className="task-lane-title">{task.title}</span>
                                        </div>

                                        <div className="task-lane-col task-lane-col-description">
                                            {task.description ? (
                                                <span
                                                    className="task-description-text"
                                                    title={task.description}
                                                >
                                                    {task.description}
                                                </span>
                                            ) : (
                                                <span className="task-description-empty">
                                                    No description
                                                </span>
                                            )}
                                        </div>

                                        {/* Comment button — opens TaskCommentModal directly
                                            without needing to open the detail modal first */}
                                        <div
                                            className="task-lane-col"
                                            style={{ textAlign: "center" }}
                                            onClick={e => {
                                                e.stopPropagation(); // don't trigger row click
                                                onComment(task);
                                            }}
                                        >
                                            <button
                                                type="button"
                                                title="View comments"
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontSize: 18,
                                                    lineHeight: 1,
                                                    padding: "2px 4px",
                                                    color: "#6c757d",
                                                    borderRadius: 6,
                                                    transition: "color 0.15s, background 0.15s",
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.color = "#0d6efd";
                                                    e.currentTarget.style.background = "#e8f0fe";
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.color = "#6c757d";
                                                    e.currentTarget.style.background = "none";
                                                }}
                                                aria-label={`Open comments for ${task.title}`}
                                            >
                                                💬
                                            </button>
                                        </div>

                                        <div className="task-lane-col task-lane-col-date">
                                            {formatDate(task.start_date)}
                                        </div>

                                        <div className="task-lane-col task-lane-col-date">
                                            {formatDate(task.deadline)}
                                        </div>

                                        <div className="task-lane-col task-lane-col-priority">
                                            <span className={`task-priority-tag ${getPriorityClass(task.priority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                {task.priority || "Low"}
                                            </span>
                                        </div>

                                        
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {tasks.length > 0 && totalPages > 1 && (
                        <div className="task-lane-pagination">
                            <div className="task-lane-page-summary">
                                Showing {startItem}-{endItem} of {tasks.length}
                            </div>

                            <div className="task-lane-pagination-controls">
                                <button
                                    type="button"
                                    className="task-lane-page-nav"
                                    onClick={() => onPageChange(safePage - 1)}
                                    disabled={safePage === 1}
                                    aria-label={`Previous ${meta.title} page`}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>

                                <div className="task-lane-pagination-pages">
                                    {Array.from({ length: totalPages }, (_, index) => {
                                        const page = index + 1;

                                        return (
                                            <button
                                                key={page}
                                                type="button"
                                                className={`task-lane-page-btn ${
                                                    page === safePage ? "is-active" : ""
                                                }`}
                                                onClick={() => onPageChange(page)}
                                                aria-current={page === safePage ? "page" : undefined}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className="task-lane-page-nav"
                                    onClick={() => onPageChange(safePage + 1)}
                                    disabled={safePage === totalPages}
                                    aria-label={`Next ${meta.title} page`}
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function TaskFormFields({
    taskName,
    setTaskName,
    description,
    setDescription,
    startDate,
    setStartDate,
    deadline,
    setDeadline,
    priority,
    setPriority
}) {
    return (
        <>
            <div className="task-form-grid">
                <div className="task-form-field">
                    <label className="form-label task-form-label">Task Name</label>
                    <input
                        type="text"
                        className="form-control task-form-control"
                        value={taskName}
                        onChange={e => setTaskName(e.target.value)}
                        placeholder="Enter task name"
                    />
                </div>

                <ModalPriorityPicker
                    value={priority}
                    onChange={setPriority}
                />

                <ModalDatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select start date"
                />

                <ModalDatePicker
                    label="Due Date"
                    value={deadline}
                    onChange={setDeadline}
                    placeholder="Select due date"
                />

                <div className="task-form-field task-form-field-full">
                    <label className="form-label task-form-label">
                        Description <span className="text-muted">(Optional)</span>
                    </label>
                    <textarea
                        className="form-control task-form-control task-form-textarea"
                        rows="4"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Enter task description"
                    />
                </div>
            </div>
        </>
    );
}

function TaskDetailModal({ show, task, onClose, refreshTasks, currentUserId }) {
    const [taskName, setTaskName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [deadline, setDeadline] = React.useState("");
    const [priority, setPriority] = React.useState("Low");
    const [status, setStatus] = React.useState("Ongoing");
    const [isSaving, setIsSaving] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    React.useEffect(() => {
        if (!task) return;

        setTaskName(task.title || "");
        setDescription(task.description || "");
        setStartDate(task.start_date || "");
        setDeadline(task.deadline || "");
        setPriority(task.priority || "Low");
        setStatus(task.status || "Ongoing");
    }, [task]);

    if (!show || !task) return null;

    async function handleSave() {
        if (!taskName.trim()) {
            showToast("error", "Validation error", "Task name is required.");
            return;
        }

        if (startDate && deadline && deadline < startDate) {
            showToast("error", "Validation error", "Due date cannot be earlier than start date.");
            return;
        }

        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append("task_id", task.id);
            formData.append("task_name", taskName.trim());
            formData.append("description", description.trim());
            formData.append("start_date", startDate);
            formData.append("deadline", deadline);
            formData.append("priority", priority);
            formData.append("status", status);

            const res = await fetch(`${API_BASE}/update_task.php`, {
                method: "POST",
                body: formData
            });

            const message = await parseServerResponse(res, "Failed to update task.");

            await refreshTasks();
            onClose();

            showToast("success", "Task updated", message || "Task updated successfully.");
        } catch (error) {
            console.error(error);
            showToast("error", "Update failed", error.message || "Failed to update task.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this task?")) return;

        setIsDeleting(true);

        try {
            const formData = new FormData();
            formData.append("task_id", task.id);

            const res = await fetch(`${API_BASE}/delete_task.php`, {
                method: "POST",
                body: formData
            });

            const message = await parseServerResponse(res, "Failed to delete task.");

            await refreshTasks();
            onClose();

            showToast("success", "Task deleted", message || "Task deleted successfully.");
        } catch (error) {
            console.error(error);
            showToast("error", "Delete failed", error.message || "Failed to delete task.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <>
        <div className="task-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered task-modal-dialog">
                <div className="modal-content task-modal-card">
                    <div className="task-modal-headerbar">
                        <div>
                            <h5 className="modal-title task-modal-title">Task Details</h5>
                            <div className="task-modal-subtitle">
                                Edit task information, update status, or remove task
                            </div>
                        </div>
                    </div>

                    <div className="task-modal-body">
                        <div className="task-modal-section-label">Task Information</div>

                        <div className="task-modal-panel">
                            <TaskFormFields
                                taskName={taskName}
                                setTaskName={setTaskName}
                                description={description}
                                setDescription={setDescription}
                                startDate={startDate}
                                setStartDate={setStartDate}
                                deadline={deadline}
                                setDeadline={setDeadline}
                                priority={priority}
                                setPriority={setPriority}
                            />

                            <div className="task-form-field task-form-field-full task-form-status-block">
                                <ModalStatusPicker
                                    value={status}
                                    onChange={setStatus}
                                />
                            </div>

                            <div className="task-modal-actions">
                                <button
                                    type="button"
                                    className="btn task-btn task-btn-danger"
                                    onClick={handleDelete}
                                    disabled={isSaving || isDeleting}
                                >
                                    {isDeleting ? "Deleting..." : "Delete"}
                                </button>

                                <button
                                    type="button"
                                    className="btn task-btn task-btn-neutral"
                                    onClick={onClose}
                                    disabled={isSaving || isDeleting}
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    className="btn task-btn task-btn-primary"
                                    onClick={handleSave}
                                    disabled={isSaving || isDeleting}
                                >
                                    {isSaving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        </>
    );
}

function getStatusMeta(status = "") {
    const normalized = normalizeText(status);

    if (normalized === "completed") {
        return {
            label: "Completed",
            chipClass: "status-chip-completed"
        };
    }

    return {
        label: "Ongoing",
        chipClass: "status-chip-ongoing"
    };
}

function ModalStatusPicker({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef(null);

    const closeMenu = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenu);

    const currentMeta = getStatusMeta(value);

    return (
        <>
            <label className="form-label task-form-label">Status</label>

            <div className="modal-picker-shell" ref={rootRef}>
                <button
                    type="button"
                    className={`modal-picker-trigger modal-status-trigger ${open ? "is-open" : ""}`}
                    onClick={() => setOpen(current => !current)}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className={`modal-status-chip ${currentMeta.chipClass}`}>
                        {currentMeta.label}
                    </span>

                    <span className="modal-picker-trigger-icon">
                        <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                    </span>
                </button>

                {open && (
                    <div className="modal-status-popover" role="listbox" aria-label="Choose status">
                        {STATUS_OPTIONS.map(option => {
                            const meta = getStatusMeta(option);
                            const active = option === value;

                            return (
                                <button
                                    key={option}
                                    type="button"
                                    className={`modal-status-option ${active ? "is-active" : ""}`}
                                    aria-selected={active}
                                    onClick={() => {
                                        onChange(option);
                                        closeMenu();
                                    }}
                                >
                                    <span className={`modal-status-chip ${meta.chipClass}`}>
                                        {meta.label}
                                    </span>

                                    {active && (
                                        <i className="bi bi-check2 modal-status-check"></i>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

function AddTaskModal({ show, onClose, refreshTasks }) {
    const [taskName, setTaskName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [deadline, setDeadline] = React.useState("");
    const [priority, setPriority] = React.useState("Low");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    if (!show) return null;

    async function handleSubmit() {
        if (!taskName.trim()) {
            showToast("error", "Validation error", "Task name is required.");
            return;
        }

        if (startDate && deadline && deadline < startDate) {
            showToast("error", "Validation error", "Due date cannot be earlier than start date.");
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("task_name", taskName.trim());
        formData.append("description", description.trim());
        formData.append("start_date", startDate);
        formData.append("deadline", deadline);
        formData.append("priority", priority);

        try {
            const response = await fetch(`${API_BASE}/create_task.php`, {
                method: "POST",
                body: formData
            });

            const message = await parseServerResponse(response, "Failed to create task.");

            await refreshTasks();

            setTaskName("");
            setDescription("");
            setStartDate("");
            setDeadline("");
            setPriority("Low");

            onClose();

            showToast("success", "Task created", message || "Task created successfully.");
        } catch (error) {
            console.error("Error:", error);
            showToast("error", "Create failed", error.message || "Failed to create task.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="task-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered task-modal-dialog">
                <div className="modal-content task-modal-card">
                    <div className="task-modal-headerbar">
                        <h5 className="modal-title task-modal-title">Add Task</h5>
                    </div>

                    <div className="task-modal-body">
                        <div className="task-modal-section-label">Task Information</div>

                        <div className="task-modal-panel">
                            <TaskFormFields
                                taskName={taskName}
                                setTaskName={setTaskName}
                                description={description}
                                setDescription={setDescription}
                                startDate={startDate}
                                setStartDate={setStartDate}
                                deadline={deadline}
                                setDeadline={setDeadline}
                                priority={priority}
                                setPriority={setPriority}
                            />

                            <div className="task-modal-actions">
                                <button
                                    type="button"
                                    className="btn task-btn task-btn-neutral"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    className="btn task-btn task-btn-primary"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Adding..." : "Add Task"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalController({ refreshTasks }) {
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const btn = document.getElementById("openReactModalBtn");

        if (btn) {
            btn.onclick = () => setShow(true);
        }

        return () => {
            if (btn) btn.onclick = null;
        };
    }, []);

    return (
        <AddTaskModal
            show={show}
            onClose={() => setShow(false)}
            refreshTasks={refreshTasks}
        />
    );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error('Root element with id "root" was not found.');
}

createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);