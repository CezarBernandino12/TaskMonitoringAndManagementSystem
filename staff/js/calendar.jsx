const { useState, useEffect } = React;

// ====================================================================
// CONSTANTS
// ====================================================================
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const STATUS_CFG = {
    Upcoming:  { bg: '#FDECEA', text: '#C0392B', badge: '#E74C3C', icon: '📋', filter: '#FF8A80' },
    Ongoing:   { bg: '#EAF7EC', text: '#1E8449', badge: '#27AE60', icon: '↗',  filter: '#69F0AE' },
    Completed: { bg: '#EEE8F8', text: '#5B2C9B', badge: '#7D3C98', icon: '✓',  filter: '#CE93D8' },
    Cancelled: { bg: '#FEF9E7', text: '#B7770D', badge: '#F39C12', icon: '🔔', filter: '#FFD54F' },
};

const PRIORITY_COLORS = {
    High: '#E74C3C',
    Medium: '#F39C12',
    Low: '#27AE60'
};

// ====================================================================
// HELPERS
// ====================================================================
function ModalPortal({ children }) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    return ReactDOM.createPortal(children, document.body);
}

function fromDateStr(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function startOfWeek(date) {
    return addDays(date, -date.getDay());
}

function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function getDaysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
}

function getFirstDay(y, m) {
    return new Date(y, m, 1).getDay();
}

function toDateStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toDateOnly(date) {
    return toDateStr(date.getFullYear(), date.getMonth(), date.getDate());
}

function fmtShort(s) {
    if (!s) return '—';
    const [y, mo, d] = s.split('-');
    return `${MONTH_NAMES[+mo - 1].slice(0, 3)} ${+d}, ${y}`;
}

function fmtLong(s) {
    if (!s) return '—';
    const [y, mo, d] = s.split('-');
    return `${MONTH_NAMES[+mo - 1]} ${+d}, ${y}`;
}

function fmtHeaderDate(date, view) {
    if (view === 'Month') return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// ====================================================================
// EVENT FORM MODAL
// ====================================================================
function EventFormModal({ event, employees, onSave, onDelete, onClose }) {
    const isEdit = !!event?.id;

    const blank = {
        title: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        status: 'Upcoming',
        priority: 'Medium',
        tagged_employees: []
    };

    const [form, setForm] = useState({
        ...blank,
        ...(event || {}),
        tagged_employees: event?.tagged_employees ?? []
    });

    const [saving, setSaving] = useState(false);
    const [deling, setDeling] = useState(false);
    const [error, setError] = useState(null);
    const [empQ, setEmpQ] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const toggleEmp = id => {
        set(
            'tagged_employees',
            form.tagged_employees.includes(id)
                ? form.tagged_employees.filter(e => e !== id)
                : [...form.tagged_employees, id]
        );
    };

    const filtered = employees.filter(e =>
        `${e.name} ${e.department}`.toLowerCase().includes(empQ.toLowerCase())
    );

    // Are all currently-visible (filtered) employees already tagged?
    const allFilteredSelected =
        filtered.length > 0 &&
        filtered.every(e => form.tagged_employees.includes(e.id));

    // Select all visible employees (merges with any already-tagged ones outside the filter)
    const selectAllFiltered = () => {
        const filteredIds = filtered.map(e => e.id);
        const merged = Array.from(new Set([...form.tagged_employees, ...filteredIds]));
        set('tagged_employees', merged);
    };

    // Deselect all visible employees (keeps any tagged ones outside the current filter)
    const deselectAllFiltered = () => {
        const filteredIds = new Set(filtered.map(e => e.id));
        set('tagged_employees', form.tagged_employees.filter(id => !filteredIds.has(id)));
    };

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            deselectAllFiltered();
        } else {
            selectAllFiltered();
        }
    };

    const save = () => {
        if (!form.title.trim()) {
            setError('Title is required.');
            return;
        }
        if (!form.start_date) {
            setError('Start date is required.');
            return;
        }
        if (!form.end_date) {
            setError('End date is required.');
            return;
        }
        if (form.end_date < form.start_date) {
            setError('End must be on or after start.');
            return;
        }

        setSaving(true);
        setError(null);

        fetch('php/save_event.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                onSave(d.event);
            })
            .catch(e => {
                setError(e.message);
                setSaving(false);
            });
    };

    const del = () => {
        if (!window.confirm('Delete this event?')) return;

        setDeling(true);

        fetch('php/delete_event.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: form.id })
        })
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                onDelete(form.id);
            })
            .catch(e => {
                setError(e.message);
                setDeling(false);
            });
    };

    const cfg = STATUS_CFG[form.status] ?? STATUS_CFG.Upcoming;

    return (
        <ModalPortal>
            <div
                onClick={e => {
                    if (e.target === e.currentTarget) onClose();
                }}
                style={S.backdrop}
            >
                <div style={{ ...S.modal, maxWidth: 560 }}>
                    <div style={{ ...S.mHead, background: cfg.bg, borderBottom: `2px solid ${cfg.badge}33` }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: cfg.text }}>
                            {isEdit ? 'Edit Event' : 'New Event'}
                        </span>
                        <button className="btn-close" onClick={onClose} style={{ fontSize: 11 }} />
                    </div>

                    <div style={S.mBody}>
                        {error && <div style={S.errBox}>{error}</div>}

                        <Fg label="Title *">
                            <input
                                style={S.inp}
                                value={form.title}
                                onChange={e => set('title', e.target.value)}
                                placeholder="Event title"
                            />
                        </Fg>

                        <Fg label="Description">
                            <textarea
                                style={{ ...S.inp, resize: 'vertical' }}
                                rows={3}
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                                placeholder="Optional details…"
                            />
                        </Fg>

                        <Fg label="Location">
                            <input
                                style={S.inp}
                                value={form.location}
                                onChange={e => set('location', e.target.value)}
                                placeholder="Venue or link"
                            />
                        </Fg>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <Fg label="Start Date *" style={{ flex: 1 }}>
                                <input
                                    type="date"
                                    style={S.inp}
                                    value={form.start_date}
                                    onChange={e => set('start_date', e.target.value)}
                                />
                            </Fg>

                            <Fg label="End Date *" style={{ flex: 1 }}>
                                <input
                                    type="date"
                                    style={S.inp}
                                    value={form.end_date}
                                    onChange={e => set('end_date', e.target.value)}
                                />
                            </Fg>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <Fg label="Status" style={{ flex: 1 }}>
                                <select
                                    style={S.inp}
                                    value={form.status}
                                    onChange={e => set('status', e.target.value)}
                                >
                                    {Object.keys(STATUS_CFG).map(s => (
                                        <option key={s}>{s}</option>
                                    ))}
                                </select>
                            </Fg>

                            <Fg label="Priority" style={{ flex: 1 }}>
                                <select
                                    style={S.inp}
                                    value={form.priority}
                                    onChange={e => set('priority', e.target.value)}
                                >
                                    <option>High</option>
                                    <option>Medium</option>
                                    <option>Low</option>
                                </select>
                            </Fg>
                        </div>

                        <Fg label="Tag Employees">
                            <input
                                style={{ ...S.inp, marginBottom: 6 }}
                                placeholder="Search…"
                                value={empQ}
                                onChange={e => setEmpQ(e.target.value)}
                            />

                            {/* Select All / Deselect All row */}
                            {filtered.length > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 5,
                                        padding: '0 2px'
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            background: allFilteredSelected ? cfg.bg : '#F5F5F5',
                                            border: `1.5px solid ${allFilteredSelected ? cfg.badge + '88' : '#DCDCDC'}`,
                                            borderRadius: 6,
                                            padding: '4px 10px',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            color: allFilteredSelected ? cfg.text : '#555',
                                            cursor: 'pointer',
                                            transition: 'all .15s'
                                        }}
                                    >
                                        {/* Mini checkbox indicator */}
                                        <span
                                            style={{
                                                width: 13,
                                                height: 13,
                                                borderRadius: 3,
                                                border: `1.5px solid ${allFilteredSelected ? cfg.badge : '#AAAAAA'}`,
                                                background: allFilteredSelected ? cfg.badge : '#fff',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all .15s'
                                            }}
                                        >
                                            {allFilteredSelected && (
                                                <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>
                                            )}
                                        </span>
                                        {allFilteredSelected
                                            ? empQ
                                                ? `Deselect all ${filtered.length} shown`
                                                : 'Deselect all'
                                            : empQ
                                                ? `Select all ${filtered.length} shown`
                                                : 'Select all'
                                        }
                                    </button>

                                    {/* Live count badge */}
                                    {form.tagged_employees.length > 0 && (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: cfg.text,
                                                background: cfg.bg,
                                                border: `1px solid ${cfg.badge}44`,
                                                borderRadius: 20,
                                                padding: '2px 8px',
                                                fontWeight: 600
                                            }}
                                        >
                                            {form.tagged_employees.length} tagged
                                        </span>
                                    )}
                                </div>
                            )}

                            <div
                                style={{
                                    maxHeight: 148,
                                    overflowY: 'auto',
                                    border: '1px solid #EBEBEB',
                                    borderRadius: 8,
                                    padding: '4px 8px'
                                }}
                            >
                                {filtered.length === 0 ? (
                                    <div
                                        style={{
                                            color: '#aaa',
                                            fontSize: 12,
                                            padding: '6px 0',
                                            textAlign: 'center'
                                        }}
                                    >
                                        No employees found.
                                    </div>
                                ) : (
                                    filtered.map(emp => {
                                        const chk = form.tagged_employees.includes(emp.id);

                                        return (
                                            <div
                                                key={emp.id}
                                                onClick={() => toggleEmp(emp.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '5px 4px',
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                    background: chk ? cfg.bg : 'transparent'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    readOnly
                                                    checked={chk}
                                                    style={{ pointerEvents: 'none', accentColor: cfg.badge }}
                                                />
                                                <span style={{ fontSize: 13 }}>
                                                    <strong>{emp.name}</strong>{' '}
                                                    <span style={{ color: '#aaa' }}>— {emp.department}</span>
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {form.tagged_employees.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                    {form.tagged_employees.map(id => {
                                        const emp = employees.find(e => e.id === id);
                                        return emp ? (
                                            <span
                                                key={id}
                                                style={{
                                                    background: cfg.bg,
                                                    color: cfg.text,
                                                    border: `1px solid ${cfg.badge}44`,
                                                    borderRadius: 20,
                                                    fontSize: 11,
                                                    padding: '2px 10px'
                                                }}
                                            >
                                                {emp.name}{' '}
                                                <span
                                                    onClick={() => toggleEmp(id)}
                                                    style={{ marginLeft: 4, cursor: 'pointer', opacity: 0.7 }}
                                                >
                                                    ✕
                                                </span>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </Fg>
                    </div>

                    <div style={S.mFoot}>
                        <div>
                            {isEdit && (
                                <button onClick={del} disabled={deling} style={S.btnDanger}>
                                    {deling ? 'Deleting…' : 'Delete'}
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={onClose} style={S.btnGhost}>
                                Cancel
                            </button>
                            <button
                                onClick={save}
                                disabled={saving}
                                style={{ ...S.btnPrimary, background: cfg.badge }}
                            >
                                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

function Fg({ label, children, style }) {
    return (
        <div style={{ marginBottom: 14, ...style }}>
            <div
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    marginBottom: 4
                }}
            >
                {label}
            </div>
            {children}
        </div>
    );
}

// ====================================================================
// EVENT DETAIL MODAL
// ====================================================================
function EventDetailModal({ event, employees, canEdit, onEdit, onClose }) {
    const cfg = STATUS_CFG[event.status] ?? STATUS_CFG.Upcoming;
    const pColor = PRIORITY_COLORS[event.priority] ?? '#888';
    const tagged = (event.tagged_employees ?? [])
        .map(id => employees.find(e => e.id === id))
        .filter(Boolean);

    return (
        <ModalPortal>
            <div
                onClick={e => {
                    if (e.target === e.currentTarget) onClose();
                }}
                style={S.backdrop}
            >
                <div style={{ ...S.modal, maxWidth: 440, overflow: 'hidden' }}>
                    <div
                        style={{
                            background: cfg.bg,
                            padding: '1.125rem 1.5rem',
                            borderBottom: `2px solid ${cfg.badge}33`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: cfg.text }}>
                                {event.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                                {fmtShort(event.start_date)} – {fmtShort(event.end_date)}
                            </div>
                        </div>
                        <button className="btn-close" onClick={onClose} style={{ fontSize: 11 }} />
                    </div>

                    <div style={{ padding: '1.125rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    ...S.chip,
                                    background: cfg.bg,
                                    color: cfg.text,
                                    border: `1px solid ${cfg.badge}33`
                                }}
                            >
                                {cfg.icon} {event.status}
                            </span>

                            <span
                                style={{
                                    ...S.chip,
                                    color: pColor,
                                    border: `1px solid ${pColor}44`
                                }}
                            >
                                ● {event.priority}
                            </span>
                        </div>

                        {event.description && (
                            <p style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>
                                {event.description}
                            </p>
                        )}

                        {event.location && (
                            <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                                📍 {event.location}
                            </div>
                        )}

                        {tagged.length > 0 && (() => {
                            // When all employees are tagged, or the list is very large,
                            // show a compact summary instead of individual chips.
                            const isAll     = tagged.length === employees.length && employees.length > 0;
                            const SHOW_MAX  = 6; // max individual chips before collapsing
                            const isLarge   = !isAll && tagged.length > SHOW_MAX;

                            return (
                                <div style={{ marginTop: 8 }}>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#bbb',
                                            marginBottom: 6,
                                            textTransform: 'uppercase',
                                            letterSpacing: '.05em'
                                        }}
                                    >
                                        Tagged
                                    </div>

                                    {isAll ? (
                                        // All employees — single pill
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: 12,
                                                background: cfg.bg,
                                                border: `1px solid ${cfg.badge}44`,
                                                borderRadius: 20,
                                                padding: '3px 12px',
                                                color: cfg.text,
                                                fontWeight: 600
                                            }}
                                        >
                                            👥 All Employees
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    background: cfg.badge,
                                                    color: '#fff',
                                                    borderRadius: 20,
                                                    padding: '0px 7px',
                                                    fontWeight: 700
                                                }}
                                            >
                                                {tagged.length}
                                            </span>
                                        </span>
                                    ) : isLarge ? (
                                        // Large partial group — show first few + overflow count
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {tagged.slice(0, SHOW_MAX).map(emp => (
                                                <span
                                                    key={emp.id}
                                                    style={{
                                                        fontSize: 12,
                                                        background: '#F5F5F5',
                                                        borderRadius: 20,
                                                        padding: '2px 10px',
                                                        color: '#444'
                                                    }}
                                                >
                                                    {emp.name} <span style={{ color: '#aaa' }}>· {emp.department}</span>
                                                </span>
                                            ))}
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    background: '#EDEDF0',
                                                    borderRadius: 20,
                                                    padding: '2px 10px',
                                                    color: '#666',
                                                    fontWeight: 600
                                                }}
                                            >
                                                +{tagged.length - SHOW_MAX} more
                                            </span>
                                        </div>
                                    ) : (
                                        // Small list — show all chips normally
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {tagged.map(emp => (
                                                <span
                                                    key={emp.id}
                                                    style={{
                                                        fontSize: 12,
                                                        background: '#F5F5F5',
                                                        borderRadius: 20,
                                                        padding: '2px 10px',
                                                        color: '#444'
                                                    }}
                                                >
                                                    {emp.name} <span style={{ color: '#aaa' }}>· {emp.department}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <div style={{ ...S.mFoot, justifyContent: 'flex-end', gap: 8 }}>
                        {canEdit && (
                            <button onClick={onEdit} style={S.btnGhost}>
                                Edit Event
                            </button>
                        )}
                        <button onClick={onClose} style={{ ...S.btnPrimary, background: cfg.badge }}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

// ====================================================================
// DAY EVENTS MODAL
// ====================================================================
function DayEventsModal({ dateStr, events, onSelectEvent, onClose }) {
    return (
        <ModalPortal>
            <div
                onClick={e => {
                    if (e.target === e.currentTarget) onClose();
                }}
                style={S.backdrop}
            >
                <div style={{ ...S.modal, maxWidth: 360 }}>
                    <div style={S.mHead}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#222' }}>
                            {fmtLong(dateStr)}
                        </span>
                        <button className="btn-close" onClick={onClose} style={{ fontSize: 11 }} />
                    </div>

                    <div style={{ padding: '0.75rem 1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                        {events.map(ev => {
                            const cfg = STATUS_CFG[ev.status] ?? STATUS_CFG.Upcoming;

                            return (
                                <div
                                    key={ev.id}
                                    onClick={() => onSelectEvent(ev)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '9px 10px',
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        marginBottom: 4,
                                        border: '1px solid #F0F0F0'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)}
                                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                                >
                                    <div
                                        style={{
                                            width: 9,
                                            height: 9,
                                            borderRadius: '50%',
                                            background: cfg.badge,
                                            flexShrink: 0
                                        }}
                                    />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#222' }}>
                                            {ev.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#bbb' }}>
                                            {fmtShort(ev.start_date)} – {fmtShort(ev.end_date)}
                                        </div>
                                    </div>

                                    <span
                                        style={{
                                            ...S.chip,
                                            background: cfg.bg,
                                            color: cfg.text,
                                            fontSize: 10
                                        }}
                                    >
                                        {ev.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

// ====================================================================
// FILTER SIDEBAR
// ====================================================================
function FilterSidebar({ activeFilters, onToggle }) {
    return (
        <div
            style={{
                width: 155,
                flexShrink: 0,
                background: '#fff',
                border: '1px solid #EBEBEB',
                borderRadius: 14,
                padding: '16px 14px',
                alignSelf: 'flex-start'
            }}
        >
            <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 14 }}>
                Filters
            </div>

            {Object.entries(STATUS_CFG).map(([status, cfg]) => {
                const active = activeFilters.includes(status);

                return (
                    <div
                        key={status}
                        onClick={() => onToggle(status)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            marginBottom: 12,
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <div
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 5,
                                flexShrink: 0,
                                background: active ? cfg.filter : '#F0F0F0',
                                border: `1.5px solid ${active ? cfg.filter : '#DDD'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all .15s'
                            }}
                        >
                            {active && (
                                <span
                                    style={{
                                        color: '#fff',
                                        fontSize: 11,
                                        fontWeight: 900,
                                        lineHeight: 1
                                    }}
                                >
                                    ✓
                                </span>
                            )}
                        </div>

                        <span
                            style={{
                                fontSize: 12.5,
                                color: active ? '#222' : '#BBB',
                                fontWeight: active ? 500 : 400,
                                transition: 'color .15s'
                            }}
                        >
                            {status}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ====================================================================
// EVENT CARD — inside a calendar cell
// ====================================================================
function EventCard({ event, employees, onClick }) {
    const cfg = STATUS_CFG[event.status] ?? STATUS_CFG.Upcoming;
    const tagged = (event.tagged_employees ?? [])
        .map(id => employees.find(e => e.id === id))
        .filter(Boolean);

    return (
        <div
            onClick={e => {
                e.stopPropagation();
                onClick(event);
            }}
            style={{
                background: cfg.bg,
                border: `1px solid ${cfg.badge}22`,
                borderRadius: 7,
                padding: '4px 7px',
                marginTop: 3,
                cursor: 'pointer',
                transition: 'opacity .12s'
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.82')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 10, flexShrink: 0 }}>{cfg.icon}</span>
                    <span
                        style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: cfg.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        {event.title}
                    </span>
                </div>

                <div
                    style={{
                        background: cfg.badge,
                        color: '#fff',
                        borderRadius: 10,
                        minWidth: 17,
                        height: 17,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 700,
                        flexShrink: 0,
                        padding: '0 4px'
                    }}
                >
                    ●
                </div>
            </div>

            {tagged.length > 0 && (
                <div
                    style={{
                        fontSize: 9.5,
                        color: cfg.text,
                        opacity: 0.72,
                        marginTop: 1.5,
                        paddingLeft: 14,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    ↗ {tagged[0].name}{tagged.length > 1 ? ` +${tagged.length - 1}` : ''}
                </div>
            )}
        </div>
    );
}

// ====================================================================
// MAIN CALENDAR
// ====================================================================
function Calendar() {
    const today = new Date();

    const [currentDate, setCurrentDate] = useState(
        new Date(today.getFullYear(), today.getMonth(), today.getDate())
    );
    const [view, setView] = useState('Month');
    const [filters, setFilters] = useState(Object.keys(STATUS_CFG));

    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [currentUser, setUser] = useState(null);

    const [dayModal, setDayModal] = useState(null);
    const [detailEvent, setDetail] = useState(null);
    const [editEvent, setEdit] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const isEditor =
        currentUser?.department?.toLowerCase() === 'marketing' ||
        currentUser?.department?.toLowerCase() === 'human resources';

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    useEffect(() => {
        fetch('php/get_current_user.php')
            .then(r => r.json())
            .then(d => {
                if (!d.error) setUser(d);
            })
            .catch(() => {});

        fetch('php/get_employees.php')
            .then(r => r.json())
            .then(d => setEmployees(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        fetch('php/get_events.php')
            .then(r => r.json())
            .then(d => setEvents(Array.isArray(d) ? d : []))
            .catch(err => {
                console.error('Failed to fetch events:', err);
                setEvents([]);
            });
    }, [currentUser]);

    const toggleFilter = status =>
        setFilters(prev =>
            prev.includes(status)
                ? prev.filter(x => x !== status)
                : [...prev, status]
        );

    const getEventsInRange = (startStr, endStr) =>
        events.filter(
            ev =>
                ev.start_date <= endStr &&
                ev.end_date >= startStr &&
                filters.includes(ev.status)
        );

    const getDay = dateStr => getEventsInRange(dateStr, dateStr);

    const handleSave = saved => {
        setEvents(prev => {
            const index = prev.findIndex(e => e.id === saved.id);
            return index >= 0
                ? prev.map(e => (e.id === saved.id ? saved : e))
                : [...prev, saved];
        });

        setShowForm(false);
        setEdit(null);
    };

    const handleDel = id => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setShowForm(false);
        setEdit(null);
    };

    const prev = () => {
        setCurrentDate(prevDate => {
            if (view === 'Day') return addDays(prevDate, -1);
            if (view === 'Week') return addDays(prevDate, -7);
            return new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1);
        });
        setDayModal(null);
    };

    const next = () => {
        setCurrentDate(prevDate => {
            if (view === 'Day') return addDays(prevDate, 1);
            if (view === 'Week') return addDays(prevDate, 7);
            return new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
        });
        setDayModal(null);
    };

    const selectedDateStr = toDateOnly(currentDate);
    const weekStart = startOfWeek(currentDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const activeRange =
        view === 'Day'
            ? {
                  start: selectedDateStr,
                  end: selectedDateStr
              }
            : view === 'Week'
            ? {
                  start: toDateOnly(weekDates[0]),
                  end: toDateOnly(weekDates[6])
              }
            : {
                  start: toDateStr(year, month, 1),
                  end: toDateStr(year, month, getDaysInMonth(year, month))
              };

    const totalEvents = getEventsInRange(activeRange.start, activeRange.end).length;

    const summaryLabel =
        view === 'Day'
            ? totalEvents === 1 ? 'total event today' : 'total events today'
            : view === 'Week'
            ? totalEvents === 1 ? 'total event this week' : 'total events this week'
            : totalEvents === 1 ? 'total event this month' : 'total events this month';

    const openDate = dateStr => {
        setCurrentDate(fromDateStr(dateStr));
        const dayEvs = getDay(dateStr);

        if (view === 'Day') return;

        if (dayEvs.length > 0) {
            setDayModal({ dateStr, events: dayEvs });
        } else if (isEditor) {
            setEdit({ start_date: dateStr, end_date: dateStr });
            setShowForm(true);
        }
    };

    const renderMonthView = () => {
        const dim = getDaysInMonth(year, month);
        const firstDay = getFirstDay(year, month);
        let cellArr = [];
        const rows = [];

        for (let i = 0; i < firstDay; i++) {
            cellArr.push(<td key={`e${i}`} style={G.empty} />);
        }

        for (let d = 1; d <= dim; d++) {
            const dateStr = toDateStr(year, month, d);
            const dayEvs = getDay(dateStr);
            const colIndex = (firstDay + d - 1) % 7;
            const isTodayCell =
                d === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
            const isSun = colIndex === 0;
            const isFirstRow = d <= 7 - firstDay;
            const dayName = DAY_ABBR[colIndex];

            cellArr.push(
                <td
                    key={d}
                    onClick={() => openDate(dateStr)}
                    style={{ ...G.cell, cursor: dayEvs.length > 0 || isEditor ? 'pointer' : 'default' }}
                    onMouseEnter={e => {
                        if (!isTodayCell) e.currentTarget.style.background = '#FAFAFA';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = '#fff';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                fontSize: 12,
                                fontWeight: isTodayCell ? 700 : 500,
                                background: isTodayCell ? '#111' : 'transparent',
                                color: isTodayCell ? '#fff' : isSun ? '#E53935' : '#222',
                                flexShrink: 0
                            }}
                        >
                            {d}
                        </span>

                        {isFirstRow && (
                            <span style={{ fontSize: 10, color: '#CCCCCC', fontWeight: 500 }}>
                                {dayName}
                            </span>
                        )}
                    </div>

                    {dayEvs.slice(0, 3).map(ev => (
                        <EventCard
                            key={ev.id}
                            event={ev}
                            employees={employees}
                            onClick={clickedEvent => {
                                setDetail(clickedEvent);
                                setDayModal(null);
                            }}
                        />
                    ))}

                    {dayEvs.length > 3 && (
                        <div style={{ fontSize: 9.5, color: '#BBB', marginTop: 3, paddingLeft: 2 }}>
                            +{dayEvs.length - 3} more
                        </div>
                    )}
                </td>
            );

            if (cellArr.length % 7 === 0 || d === dim) {
                if (d === dim && cellArr.length % 7 !== 0) {
                    const rem = 7 - (cellArr.length % 7);
                    for (let p = 0; p < rem; p++) {
                        cellArr.push(<td key={`p${p}`} style={G.empty} />);
                    }
                }
                rows.push(<tr key={`r${d}`}>{cellArr}</tr>);
                cellArr = [];
            }
        }

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 520 }}>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        );
    };

    const renderWeekView = () => {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: 840 }}>
                {weekDates.map((date, idx) => {
                    const dateStr = toDateOnly(date);
                    const dayEvs = getDay(dateStr);
                    const isTodayCell = isSameDay(date, today);

                    return (
                        <div
                            key={dateStr}
                            onClick={() => openDate(dateStr)}
                            style={{
                                minHeight: 420,
                                padding: '10px 8px',
                                borderRight: idx === 6 ? 'none' : '1px solid #F0F0F0',
                                cursor: dayEvs.length > 0 || isEditor ? 'pointer' : 'default',
                                background: '#fff'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                <span style={{ fontSize: 11, color: '#B5B5B5', fontWeight: 600 }}>
                                    {DAY_ABBR[date.getDay()]}
                                </span>

                                <span
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isTodayCell ? '#111' : '#F7F7F7',
                                        color: isTodayCell ? '#fff' : '#222',
                                        fontSize: 13,
                                        fontWeight: 700
                                    }}
                                >
                                    {date.getDate()}
                                </span>
                            </div>

                            {dayEvs.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#C8C8C8', marginTop: 10 }}>
                                    No events
                                </div>
                            ) : (
                                dayEvs.map(ev => (
                                    <EventCard
                                        key={ev.id}
                                        event={ev}
                                        employees={employees}
                                        onClick={clickedEvent => {
                                            setDetail(clickedEvent);
                                            setDayModal(null);
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const dayEvs = getDay(selectedDateStr);

        return (
            <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ fontSize: 12, color: '#A5A5A5', marginBottom: 12 }}>
                    {fmtLong(selectedDateStr)}
                </div>

                {dayEvs.length === 0 ? (
                    <div
                        onClick={() => {
                            if (!isEditor) return;
                            setEdit({ start_date: selectedDateStr, end_date: selectedDateStr });
                            setShowForm(true);
                        }}
                        style={{
                            border: '1px dashed #E3E3E3',
                            borderRadius: 12,
                            padding: '22px 16px',
                            textAlign: 'center',
                            color: '#B8B8B8',
                            fontSize: 13,
                            cursor: isEditor ? 'pointer' : 'default'
                        }}
                    >
                        No events for this day
                    </div>
                ) : (
                    dayEvs.map(ev => {
                        const cfg = STATUS_CFG[ev.status] ?? STATUS_CFG.Upcoming;

                        return (
                            <div
                                key={ev.id}
                                onClick={() => setDetail(ev)}
                                style={{
                                    border: '1px solid #EFEFEF',
                                    borderLeft: `4px solid ${cfg.badge}`,
                                    borderRadius: 12,
                                    padding: '14px 16px',
                                    marginBottom: 10,
                                    cursor: 'pointer',
                                    background: '#fff'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>
                                            {ev.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#999', marginTop: 3 }}>
                                            {fmtShort(ev.start_date)} – {fmtShort(ev.end_date)}
                                        </div>

                                        {ev.location && (
                                            <div style={{ fontSize: 12, color: '#777', marginTop: 6 }}>
                                                📍 {ev.location}
                                            </div>
                                        )}
                                    </div>

                                    <span
                                        style={{
                                            ...S.chip,
                                            background: cfg.bg,
                                            color: cfg.text,
                                            height: 'fit-content'
                                        }}
                                    >
                                        {ev.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    return (
        <div
            style={{
                padding: '20px 24px',
                background: '#F7F8FA',
                minHeight: '100%',
                fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
                boxSizing: 'border-box'
            }}
        >
            {/* TOP BAR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-.02em' }}>
                    Calendar
                </div>

                <div style={{ display: 'flex', background: '#EFEFEF', borderRadius: 10, padding: 3, gap: 2 }}>
                    {['Day', 'Week', 'Month'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            style={{
                                background: view === v ? '#111' : 'transparent',
                                color: view === v ? '#fff' : '#666',
                                border: 'none',
                                borderRadius: 8,
                                padding: '6px 20px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all .15s'
                            }}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {isEditor ? (
                    <button
                        onClick={() => {
                            setEdit({
                                start_date: selectedDateStr,
                                end_date: selectedDateStr
                            });
                            setShowForm(true);
                        }}
                        style={{
                            background: '#FF6B4E',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '9px 22px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 10px rgba(255,107,78,.35)',
                            transition: 'opacity .15s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        + Add Event
                    </button>
                ) : (
                    <span
                        style={{
                            fontSize: 11,
                            background: '#EEE',
                            borderRadius: 8,
                            padding: '7px 14px',
                            color: '#999',
                            fontWeight: 500
                        }}
                    >
                        View Only
                    </span>
                )}
            </div>

            {/* BODY */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <FilterSidebar activeFilters={filters} onToggle={toggleFilter} />

                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        background: '#fff',
                        border: '1px solid #EBEBEB',
                        borderRadius: 14,
                        overflow: 'hidden'
                    }}
                >
                    {/* HEADER */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderBottom: '1px solid #F0F0F0',
                            background: '#fff'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={prev} style={G.navBtn}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="m15 18-6-6 6-6" />
                                </svg>
                            </button>

                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 12px',
                                    border: '1px solid #E8E8E8',
                                    borderRadius: 10,
                                    background: '#fff',
                                    color: '#666',
                                    fontSize: 13,
                                    fontWeight: 600
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                {fmtHeaderDate(currentDate, view)}
                            </div>

                            <button onClick={next} style={G.navBtn}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="m9 18 6-6-6-6" />
                                </svg>
                            </button>
                        </div>

                        <div style={{ justifySelf: 'center', color: '#6B6B6B', fontSize: 14 }}>
                            <strong style={{ fontSize: 18, color: '#111', marginRight: 6 }}>
                                {totalEvents}
                            </strong>
                            {summaryLabel}
                        </div>

                        <div />
                    </div>

                    {currentUser && !isEditor && (
                        <div
                            style={{
                                margin: '10px 16px 0',
                                padding: '6px 12px',
                                background: '#FEF9E7',
                                borderRadius: 8,
                                fontSize: 12,
                                color: '#B7770D',
                                fontWeight: 500
                            }}
                        >
                            View-only mode — Marketing & HR staff can create events.
                        </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                        {view === 'Month' && renderMonthView()}
                        {view === 'Week' && renderWeekView()}
                        {view === 'Day' && renderDayView()}
                    </div>
                </div>
            </div>

            {dayModal && !detailEvent && !showForm && view !== 'Day' && (
                <DayEventsModal
                    dateStr={dayModal.dateStr}
                    events={dayModal.events}
                    onSelectEvent={ev => {
                        setDetail(ev);
                        setDayModal(null);
                    }}
                    onClose={() => setDayModal(null)}
                />
            )}

            {detailEvent && !showForm && (
                <EventDetailModal
                    event={detailEvent}
                    employees={employees}
                    canEdit={isEditor}
                    onEdit={() => {
                        setEdit(detailEvent);
                        setDetail(null);
                        setShowForm(true);
                    }}
                    onClose={() => {
                        setDetail(null);
                        setDayModal(null);
                    }}
                />
            )}

            {showForm && isEditor && (
                <EventFormModal
                    event={editEvent}
                    employees={employees}
                    onSave={handleSave}
                    onDelete={handleDel}
                    onClose={() => {
                        setShowForm(false);
                        setEdit(null);
                    }}
                />
            )}
        </div>
    );
}

// ── Grid cell styles ──────────────────────────────────────────────────
const G = {
    cell: {
        verticalAlign: 'top',
        padding: '6px 8px',
        borderBottom: '1px solid #F0F0F0',
        borderRight: '1px solid #F0F0F0',
        background: '#fff',
        minHeight: 100,
        height: 100,
        transition: 'background .1s'
    },

    empty: {
        borderBottom: '1px solid #F0F0F0',
        borderRight: '1px solid #F0F0F0',
        background: '#FAFAFA',
        minHeight: 100,
        height: 100
    },

    navBtn: {
        background: '#F5F5F5',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#555'
    }
};

// ── Shared style tokens ───────────────────────────────────────────────
const S = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.44)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: '88px 16px 24px',
        boxSizing: 'border-box'
    },

    modal: {
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxHeight: 'calc(100vh - 112px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,.18)',
        margin: '0 auto'
    },

    mHead: {
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #F0F0F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },

    mBody: {
        overflowY: 'auto',
        padding: '1.125rem 1.5rem',
        flex: 1
    },

    mFoot: {
        padding: '0.75rem 1.5rem',
        borderTop: '1px solid #F0F0F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
    },

    inp: {
        width: '100%',
        padding: '8px 11px',
        border: '1px solid #EBEBEB',
        borderRadius: 8,
        fontSize: 13,
        color: '#222',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        background: '#fff'
    },

    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 20,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 500
    },

    btnPrimary: {
        background: '#FF6B4E',
        color: '#fff',
        border: 'none',
        borderRadius: 20,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer'
    },

    btnGhost: {
        background: '#fff',
        color: '#555',
        border: '1px solid #E0E0E0',
        borderRadius: 20,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer'
    },

    btnDanger: {
        background: '#fff',
        color: '#E74C3C',
        border: '1px solid #E74C3C44',
        borderRadius: 20,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer'
    },

    errBox: {
        background: '#FDECEA',
        border: '1px solid #F5C6C4',
        color: '#C0392B',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        marginBottom: 12
    }
};

// ====================================================================
// MOUNT
// ====================================================================
const rootElement = document.getElementById('calendarRoot');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Calendar />);
}