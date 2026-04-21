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

    const modalRoot = document.getElementById('react-modal-root') || document.body;
    return ReactDOM.createPortal(children, modalRoot);
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

function fmtTime(timeStr) {
    if (!timeStr) return '—';
    const [rawHour = '0', rawMinute = '00'] = String(timeStr).split(':');
    let hour = Number(rawHour);
    const minute = String(rawMinute).padStart(2, '0');
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
}

function fmtTimeRange(startTime, endTime) {
    if (!startTime && !endTime) return '';
    if (!startTime) return fmtTime(endTime);
    if (!endTime) return fmtTime(startTime);
    return `${fmtTime(startTime)} – ${fmtTime(endTime)}`;
}

function fmtDayShort(dateStr) {
    if (!dateStr) return '';
    return DAY_ABBR[fromDateStr(dateStr).getDay()];
}

function fmtDayRange(startDate, endDate) {
    if (!startDate || !endDate) return '';
    const startDay = fmtDayShort(startDate);
    const endDay = fmtDayShort(endDate);

    if (startDate === endDate) return startDay;
    if (startDay === endDay) return startDay;

    return `${startDay}–${endDay}`;
}

function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function colorWithAlpha(hex, alpha = '22') {
    if (!hex || typeof hex !== 'string') return hex;

    let normalized = hex.trim();
    if (!normalized.startsWith('#')) return normalized;

    if (normalized.length === 4) {
        normalized =
            '#' +
            normalized[1] + normalized[1] +
            normalized[2] + normalized[2] +
            normalized[3] + normalized[3];
    }

    if (normalized.length !== 7) return normalized;
    return normalized + alpha;
}

function getInitials(name = '') {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function getAvatarColor(name = '') {
    const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function normalizeProfileImageUrl(src) {
    if (!src) return null;

    const raw = String(src).trim();
    if (!raw) return null;

    if (
        raw.startsWith('data:') ||
        raw.startsWith('blob:') ||
        /^https?:\/\//i.test(raw)
    ) {
        return raw;
    }

    try {
        return new URL(raw, window.location.href).href;
    } catch {
        return raw;
    }
}

function combineDateTime(dateStr, timeStr = '00:00') {
    if (!dateStr) return null;
    const value = new Date(`${dateStr}T${timeStr || '00:00'}`);
    return Number.isNaN(value.getTime()) ? null : value;
}

function getEventStatus(event) {
    if (event?.status === 'Cancelled') return 'Cancelled';

    const start = combineDateTime(event?.start_date, event?.start_time || '00:00');
    const end = combineDateTime(event?.end_date, event?.end_time || '23:59');
    const now = new Date();

    if (!start || !end) return 'Upcoming';
    if (now < start) return 'Upcoming';
    if (now > end) return 'Completed';
    return 'Ongoing';
}

function EmployeeAvatar({ employee, size = 24, fontSize = 10, style = {} }) {
    const [imgError, setImgError] = useState(false);
    const src = normalizeProfileImageUrl(
        employee?.profile_image_url || employee?.profile_image || null
    );
    const initials = employee?.initials || getInitials(employee?.name || '');

    return (
        <span
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: getAvatarColor(employee?.name || ''),
                color: '#fff',
                fontSize,
                fontWeight: 700,
                lineHeight: 1,
                boxSizing: 'border-box',
                ...style
            }}
        >
            {src && !imgError ? (
                <img
                    src={src}
                    alt={employee?.name || 'User'}
                    onError={() => setImgError(true)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />
            ) : (
                initials
            )}
        </span>
    );
}

function AvatarStack({ employees = [], size = 18, max = 3 }) {
    const shown = employees.filter(Boolean).slice(0, max);
    const extra = employees.length - shown.length;
    const darkMode = isDarkMode();

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: size
            }}
        >
            {shown.map((emp, idx) => (
                <div
                    key={emp.id}
                    style={{
                        width: size,
                        height: size,
                        marginLeft: idx === 0 ? 0 : -6,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `1.5px solid ${darkMode ? 'var(--cal-panel)' : '#fff'}`,
                        background: 'var(--cal-panel)',
                        boxShadow: darkMode
                            ? '0 0 0 1px rgba(255,255,255,.05)'
                            : '0 0 0 1px rgba(0,0,0,.04)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative',
                        zIndex: shown.length - idx
                    }}
                >
                    <EmployeeAvatar
                        employee={emp}
                        size={size}
                        fontSize={Math.max(8, size * 0.38)}
                    />
                </div>
            ))}

            {extra > 0 && (
                <div
                    style={{
                        marginLeft: shown.length ? -6 : 0,
                        minWidth: size,
                        height: size,
                        padding: '0 6px',
                        borderRadius: 999,
                        background: 'var(--cal-panel-2)',
                        border: `1.5px solid ${darkMode ? 'var(--cal-panel)' : '#fff'}`,
                        color: 'var(--cal-text-2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1,
                        flexShrink: 0
                    }}
                >
                    +{extra}
                </div>
            )}
        </div>
    );
}

function Fg({ label, children, style }) {
    return (
        <div style={{ marginBottom: 14, ...style }}>
            <div
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--cal-text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    marginBottom: 6
                }}
            >
                {label}
            </div>
            {children}
        </div>
    );
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
        start_time: '',
        end_time: '',
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
        setForm(prev => ({
            ...prev,
            tagged_employees: prev.tagged_employees.includes(id)
                ? prev.tagged_employees.filter(e => e !== id)
                : [...prev.tagged_employees, id]
        }));
    };

    const filtered = employees.filter(e =>
        `${e.name} ${e.department || ''}`.toLowerCase().includes(empQ.toLowerCase())
    );

    const allFilteredSelected =
        filtered.length > 0 &&
        filtered.every(e => form.tagged_employees.includes(e.id));

    const selectAllFiltered = () => {
        const filteredIds = filtered.map(e => e.id);
        const merged = Array.from(new Set([...form.tagged_employees, ...filteredIds]));
        set('tagged_employees', merged);
    };

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
        if (!form.start_time) {
            setError('Start time is required.');
            return;
        }
        if (!form.end_time) {
            setError('End time is required.');
            return;
        }

        const startDateTime = combineDateTime(form.start_date, form.start_time);
        const endDateTime = combineDateTime(form.end_date, form.end_time);

        if (!startDateTime || !endDateTime) {
            setError('Please enter a valid date and time.');
            return;
        }

        if (endDateTime < startDateTime) {
            setError('End date/time must be on or after start date/time.');
            return;
        }

        setSaving(true);
        setError(null);

        const payload = {
            ...form,
            status: form.status === 'Cancelled' ? 'Cancelled' : 'Upcoming'
        };

        fetch('php/save_event.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                onSave(d.event);
            })
            .catch(e => {
                setError(e.message || 'Failed to save event.');
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
                setError(e.message || 'Failed to delete event.');
                setDeling(false);
            });
    };

    const derivedStatus = getEventStatus(form);
    const cfg = STATUS_CFG[derivedStatus] ?? STATUS_CFG.Upcoming;
    const darkMode = isDarkMode();
    const activeRowBg = darkMode ? colorWithAlpha(cfg.badge, '16') : cfg.bg;
    const selectedToggleBg = darkMode ? colorWithAlpha(cfg.badge, '14') : cfg.bg;
    const selectedToggleBorder = darkMode ? colorWithAlpha(cfg.badge, '50') : `${cfg.badge}66`;
    const modalCloseFilter = darkMode ? 'invert(1) opacity(.72)' : 'opacity(.75)';

    return (
        <ModalPortal>
            <div
                className="hide-scrollbar"
                onClick={e => {
                    if (e.target === e.currentTarget) onClose();
                }}
                style={{
                    ...S.backdrop,
                    padding: '14px',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,.18)'
                }}
            >
                <div style={{ ...S.modal, maxWidth: 720, maxHeight: '90vh', overflow: 'hidden' }}>
                    <button
                        className="btn-close"
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 2,
                            fontSize: 10,
                            filter: modalCloseFilter
                        }}
                    />

                    <div
                        className="hide-scrollbar"
                        style={{
                            ...S.mBody,
                            padding: '22px 24px 16px'
                        }}
                    >
                        <div
                            style={{
                                fontSize: 22,
                                lineHeight: 1.08,
                                fontWeight: 700,
                                letterSpacing: '-.02em',
                                color: 'var(--cal-text)',
                                marginBottom: 14
                            }}
                        >
                            {isEdit ? 'Edit Event' : 'Add Event'}
                        </div>

                        {error && <div style={{ ...S.errBox, marginBottom: 14 }}>{error}</div>}

                        <div style={{ marginBottom: 14 }}>
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: 'var(--cal-text-3)',
                                    letterSpacing: '.02em',
                                    marginBottom: 6
                                }}
                            >
                                Event name
                            </div>
                            <input
                                style={{ ...S.inp, height: 40, borderRadius: 12 }}
                                value={form.title}
                                onChange={e => set('title', e.target.value)}
                                placeholder="Enter event name"
                            />
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: 'var(--cal-text-3)',
                                    letterSpacing: '.02em',
                                    marginBottom: 6
                                }}
                            >
                                Description
                            </div>
                            <textarea
                                rows={3}
                                style={{
                                    ...S.inp,
                                    minHeight: 92,
                                    padding: '10px 12px',
                                    borderRadius: 12,
                                    resize: 'vertical'
                                }}
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                                placeholder="Optional details"
                            />
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1.35fr) minmax(210px, .9fr)',
                                gap: 14,
                                marginBottom: 14
                            }}
                        >
                            <div
                                style={{
                                    background: 'var(--cal-panel)',
                                    border: '1px solid var(--cal-border)',
                                    borderRadius: 14,
                                    padding: '14px'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        marginBottom: 12
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 18,
                                            height: 18,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--cal-text-3)',
                                            fontSize: 15,
                                            flexShrink: 0
                                        }}
                                    >
                                        <i className="bi bi-calendar4-event" />
                                    </span>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: 'var(--cal-text)'
                                        }}
                                    >
                                        {form.start_date ? fmtLong(form.start_date) : 'Select event date'}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12
                                    }}
                                >
                                    <Fg label="Start date" style={{ marginBottom: 0 }}>
                                        <input
                                            type="date"
                                            style={{ ...S.inp, height: 40, borderRadius: 12 }}
                                            value={form.start_date}
                                            onChange={e => set('start_date', e.target.value)}
                                        />
                                    </Fg>

                                    <Fg label="End date" style={{ marginBottom: 0 }}>
                                        <input
                                            type="date"
                                            style={{ ...S.inp, height: 40, borderRadius: 12 }}
                                            value={form.end_date}
                                            onChange={e => set('end_date', e.target.value)}
                                        />
                                    </Fg>
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12,
                                        marginTop: 12
                                    }}
                                >
                                    <Fg label="Start time" style={{ marginBottom: 0 }}>
                                        <input
                                            type="time"
                                            style={{ ...S.inp, height: 40, borderRadius: 12 }}
                                            value={form.start_time}
                                            onChange={e => set('start_time', e.target.value)}
                                        />
                                    </Fg>

                                    <Fg label="End time" style={{ marginBottom: 0 }}>
                                        <input
                                            type="time"
                                            style={{ ...S.inp, height: 40, borderRadius: 12 }}
                                            value={form.end_time}
                                            onChange={e => set('end_time', e.target.value)}
                                        />
                                    </Fg>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: 14 }}>
                                <div
                                    style={{
                                        background: 'var(--cal-panel)',
                                        border: '1px solid var(--cal-border)',
                                        borderRadius: 14,
                                        padding: '14px'
                                    }}
                                >
                                    <Fg label="Status" style={{ marginBottom: 0 }}>
                                        <div style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
                                            <span
                                                style={{
                                                    ...S.chip,
                                                    background: darkMode ? colorWithAlpha(cfg.badge, '16') : cfg.bg,
                                                    color: cfg.text,
                                                    border: `1px solid ${colorWithAlpha(cfg.badge, '35')}`,
                                                    fontWeight: 700
                                                }}
                                            >
                                                {cfg.icon} {derivedStatus}
                                            </span>
                                        </div>
                                    </Fg>
                                </div>

                                <div
                                    style={{
                                        background: 'var(--cal-panel)',
                                        border: '1px solid var(--cal-border)',
                                        borderRadius: 14,
                                        padding: '14px'
                                    }}
                                >
                                    <Fg label="Priority" style={{ marginBottom: 0 }}>
                                        <select
                                            style={{
                                                ...S.inp,
                                                height: 40,
                                                borderRadius: 12,
                                                fontWeight: 600,
                                                color: PRIORITY_COLORS[form.priority] ?? 'var(--cal-text)'
                                            }}
                                            value={form.priority}
                                            onChange={e => set('priority', e.target.value)}
                                        >
                                            <option>High</option>
                                            <option>Medium</option>
                                            <option>Low</option>
                                        </select>
                                    </Fg>
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                background: 'var(--cal-panel)',
                                border: '1px solid var(--cal-border)',
                                borderRadius: 14,
                                padding: '14px',
                                marginBottom: 14
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 10
                                }}
                            >
                                <span
                                    style={{
                                        width: 18,
                                        height: 18,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--cal-text-3)',
                                        fontSize: 15,
                                        flexShrink: 0
                                    }}
                                >
                                    <i className="bi bi-geo-alt" />
                                </span>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: 'var(--cal-text-3)',
                                        letterSpacing: '.02em'
                                    }}
                                >
                                    Location
                                </div>
                            </div>

                            <input
                                style={{ ...S.inp, height: 40, borderRadius: 12 }}
                                value={form.location}
                                onChange={e => set('location', e.target.value)}
                                placeholder="Venue or link"
                            />
                        </div>

                        <div
                            style={{
                                background: 'var(--cal-panel)',
                                border: '1px solid var(--cal-border)',
                                borderRadius: 14,
                                padding: '14px'
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    marginBottom: 10
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span
                                        style={{
                                            width: 18,
                                            height: 18,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--cal-text-3)',
                                            fontSize: 15,
                                            flexShrink: 0
                                        }}
                                    >
                                        <i className="bi bi-people" />
                                    </span>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: 'var(--cal-text-3)',
                                            letterSpacing: '.02em'
                                        }}
                                    >
                                        Tag employees
                                    </div>
                                </div>

                                {form.tagged_employees.length > 0 && (
                                    <span
                                        style={{
                                            minWidth: 24,
                                            height: 24,
                                            borderRadius: 999,
                                            background: 'var(--cal-panel-2)',
                                            border: '1px solid var(--cal-border)',
                                            color: 'var(--cal-text-2)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 8px',
                                            fontSize: 11,
                                            fontWeight: 700
                                        }}
                                    >
                                        {form.tagged_employees.length}
                                    </span>
                                )}
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                                    gap: 10,
                                    marginBottom: 10
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <input
                                        style={{
                                            ...S.inp,
                                            height: 40,
                                            borderRadius: 12,
                                            paddingRight: empQ ? 34 : 12
                                        }}
                                        placeholder="Search employees"
                                        value={empQ}
                                        onChange={e => setEmpQ(e.target.value)}
                                    />

                                    {empQ && (
                                        <button
                                            type="button"
                                            onClick={() => setEmpQ('')}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                right: 10,
                                                transform: 'translateY(-50%)',
                                                width: 18,
                                                height: 18,
                                                border: 'none',
                                                borderRadius: '50%',
                                                background: 'var(--cal-panel-2)',
                                                color: 'var(--cal-text-3)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1
                                            }}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                {filtered.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        style={{
                                            height: 40,
                                            padding: '0 14px',
                                            borderRadius: 11,
                                            border: `1px solid ${allFilteredSelected ? selectedToggleBorder : 'var(--cal-border)'}`,
                                            background: allFilteredSelected ? selectedToggleBg : 'var(--cal-panel)',
                                            color: allFilteredSelected ? cfg.text : 'var(--cal-text-2)',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {allFilteredSelected ? 'Deselect' : 'Select all'}
                                    </button>
                                )}
                            </div>

                            <div
                                className="hide-scrollbar"
                                style={{
                                    maxHeight: 165,
                                    overflowY: 'auto',
                                    border: '1px solid var(--cal-border)',
                                    borderRadius: 12,
                                    padding: '6px',
                                    background: 'var(--cal-input-bg)'
                                }}
                            >
                                {filtered.length === 0 ? (
                                    <div
                                        style={{
                                            color: 'var(--cal-text-3)',
                                            fontSize: 12,
                                            padding: '12px 0',
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
                                                    gap: 10,
                                                    padding: '9px 8px',
                                                    borderRadius: 10,
                                                    cursor: 'pointer',
                                                    background: chk ? activeRowBg : 'transparent',
                                                    marginBottom: 4
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    readOnly
                                                    checked={chk}
                                                    style={{
                                                        pointerEvents: 'none',
                                                        accentColor: cfg.badge,
                                                        margin: 0
                                                    }}
                                                />

                                                <EmployeeAvatar employee={emp} size={28} fontSize={10} />

                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        color: 'var(--cal-text)',
                                                        fontWeight: 600,
                                                        lineHeight: 1.2
                                                    }}
                                                >
                                                    {emp.name}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {form.tagged_employees.length > 0 && (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                                    {form.tagged_employees.map(id => {
                                        const emp = employees.find(e => e.id === id);

                                        return emp ? (
                                            <div
                                                key={id}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    background: 'var(--cal-panel-2)',
                                                    border: '1px solid var(--cal-border)',
                                                    borderRadius: 999,
                                                    padding: '4px 10px 4px 4px',
                                                    minHeight: 34
                                                }}
                                            >
                                                <EmployeeAvatar employee={emp} size={24} fontSize={9} />
                                                <span
                                                    style={{
                                                        fontSize: 11.5,
                                                        fontWeight: 500,
                                                        color: 'var(--cal-text-2)',
                                                        lineHeight: 1,
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {emp.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleEmp(id)}
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: 'var(--cal-text-3)',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        fontSize: 13,
                                                        lineHeight: 1,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ ...S.mFoot, padding: '12px 24px 16px' }}>
                        <div>
                            {isEdit && (
                                <button
                                    onClick={del}
                                    disabled={deling}
                                    style={{
                                        ...S.btnGhost,
                                        height: 42,
                                        borderRadius: 11,
                                        background: darkMode ? 'rgba(214,67,67,.08)' : '#fff',
                                        border: `1px solid ${colorWithAlpha('#D64343', '45')}`,
                                        color: '#D64343',
                                        fontWeight: 600
                                    }}
                                >
                                    {deling ? 'Deleting…' : 'Delete'}
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={onClose}
                                style={{
                                    ...S.btnGhost,
                                    height: 42,
                                    borderRadius: 11,
                                    background: 'var(--cal-panel-2)',
                                    fontWeight: 600
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={save}
                                disabled={saving}
                                style={{
                                    ...S.btnPrimary,
                                    height: 42,
                                    borderRadius: 11,
                                    padding: '0 18px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 8px 16px rgba(47,109,246,.16)'
                                }}
                            >
                                <i className="bi bi-check2" style={{ fontSize: 16, lineHeight: 1 }} />
                                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

// ====================================================================
// EVENT DETAIL MODAL
// ====================================================================
function EventDetailModal({ event, employees, canEdit, onEdit, onCancel, onClose }) {
    const derivedStatus = getEventStatus(event);
    const cfg = STATUS_CFG[derivedStatus] ?? STATUS_CFG.Upcoming;
    const pColor = PRIORITY_COLORS[event.priority] ?? '#888';
    const tagged = (event.tagged_employees ?? [])
        .map(id => employees.find(e => e.id === id))
        .filter(Boolean);

    const darkMode = isDarkMode();
    const headerBg = darkMode ? colorWithAlpha(cfg.badge, '18') : cfg.bg;
    const headerBorder = darkMode ? colorWithAlpha(cfg.badge, '35') : colorWithAlpha(cfg.badge, '33');
    const statusChipBg = darkMode ? colorWithAlpha(cfg.badge, '16') : cfg.bg;
    const closeBtnFilter = darkMode ? 'invert(1) opacity(.72)' : 'opacity(.75)';

    return (
        <ModalPortal>
            <div
                className="hide-scrollbar"
                onClick={e => {
                    if (e.target === e.currentTarget) onClose();
                }}
                style={{
                    ...S.backdrop,
                    padding: '14px',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,.32)'
                }}
            >
                <div style={{ ...S.modal, maxWidth: 560, overflow: 'hidden' }}>
                    <div
                        style={{
                            background: headerBg,
                            padding: '1.25rem 1.5rem',
                            borderBottom: `1px solid ${headerBorder}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: cfg.text }}>
                                {event.title}
                            </div>

                            <div style={{ fontSize: 12.5, color: 'var(--cal-text-3)', marginTop: 4 }}>
                                {fmtDayRange(event.start_date, event.end_date)} • {fmtShort(event.start_date)}
                                {event.start_date !== event.end_date ? ` – ${fmtShort(event.end_date)}` : ''}
                            </div>

                            {(event.start_time || event.end_time) && (
                                <div style={{ fontSize: 12.5, color: 'var(--cal-text-3)', marginTop: 4 }}>
                                    {fmtTimeRange(event.start_time, event.end_time)}
                                </div>
                            )}
                        </div>

                        <button
                            className="btn-close"
                            onClick={onClose}
                            style={{ fontSize: 11, filter: closeBtnFilter }}
                        />
                    </div>

                    <div style={{ padding: '1.25rem 1.5rem', background: 'var(--cal-panel)' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    ...S.chip,
                                    background: statusChipBg,
                                    color: cfg.text,
                                    border: `1px solid ${headerBorder}`,
                                    fontWeight: 700
                                }}
                            >
                                {cfg.icon} {derivedStatus}
                            </span>

                            <span
                                style={{
                                    ...S.chip,
                                    color: pColor,
                                    border: `1px solid ${colorWithAlpha(pColor, '55')}`,
                                    background: 'transparent',
                                    fontWeight: 700
                                }}
                            >
                                ● {event.priority}
                            </span>
                        </div>

                        {event.description && (
                            <p style={{ fontSize: 13.5, color: 'var(--cal-text-2)', marginBottom: 12 }}>
                                {event.description}
                            </p>
                        )}

                        {event.location && (
                            <div style={{ fontSize: 13.5, color: 'var(--cal-text-2)', marginBottom: 14 }}>
                                📍 {event.location}
                            </div>
                        )}

                        {tagged.length > 0 && (() => {
                            const isAll = tagged.length === employees.length && employees.length > 0;
                            const SHOW_MAX = 6;
                            const isLarge = !isAll && tagged.length > SHOW_MAX;

                            return (
                                <div style={{ marginTop: 8 }}>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: 'var(--cal-text-3)',
                                            marginBottom: 8,
                                            textTransform: 'uppercase',
                                            letterSpacing: '.05em'
                                        }}
                                    >
                                        Tagged
                                    </div>

                                    {isAll ? (
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: 12,
                                                background: statusChipBg,
                                                border: `1px solid ${headerBorder}`,
                                                borderRadius: 20,
                                                padding: '4px 12px',
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
                                                    padding: '0 7px',
                                                    fontWeight: 700
                                                }}
                                            >
                                                {tagged.length}
                                            </span>
                                        </span>
                                    ) : isLarge ? (
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {tagged.slice(0, SHOW_MAX).map(emp => (
                                                <div
                                                    key={emp.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 7,
                                                        background: 'var(--cal-panel-2)',
                                                        border: '1px solid var(--cal-border)',
                                                        borderRadius: 999,
                                                        padding: '4px 10px 4px 4px',
                                                        color: 'var(--cal-text-2)'
                                                    }}
                                                >
                                                    <EmployeeAvatar employee={emp} size={22} fontSize={9} />
                                                    <span style={{ fontSize: 11.5, fontWeight: 500 }}>
                                                        {emp.name}
                                                    </span>
                                                </div>
                                            ))}
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    background: 'var(--cal-panel-2)',
                                                    border: '1px solid var(--cal-border)',
                                                    borderRadius: 20,
                                                    padding: '3px 10px',
                                                    color: 'var(--cal-text-2)',
                                                    fontWeight: 600
                                                }}
                                            >
                                                +{tagged.length - SHOW_MAX} more
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {tagged.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 7,
                                                        background: 'var(--cal-panel-2)',
                                                        border: '1px solid var(--cal-border)',
                                                        borderRadius: 999,
                                                        padding: '4px 10px 4px 4px',
                                                        color: 'var(--cal-text-2)'
                                                    }}
                                                >
                                                    <EmployeeAvatar employee={emp} size={22} fontSize={9} />
                                                    <span style={{ fontSize: 11.5, fontWeight: 500 }}>
                                                        {emp.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <div
                        style={{
                            ...S.mFoot,
                            justifyContent: 'space-between',
                            gap: 10,
                            background: 'var(--cal-panel)',
                            borderTop: '1px solid var(--cal-border-soft)'
                        }}
                    >
                        <div>
                            {canEdit && derivedStatus !== 'Cancelled' && (
                                <button
                                    onClick={() => onCancel(event)}
                                    style={{
                                        ...S.btnGhost,
                                        height: 40,
                                        borderRadius: 999,
                                        padding: '0 18px',
                                        fontWeight: 700,
                                        border: '1px solid rgba(214,67,67,.35)',
                                        color: '#D64343'
                                    }}
                                >
                                    Cancel Event
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            {canEdit && (
                                <button
                                    onClick={onEdit}
                                    style={{
                                        ...S.btnGhost,
                                        height: 40,
                                        borderRadius: 999,
                                        padding: '0 18px',
                                        fontWeight: 700
                                    }}
                                >
                                    Edit Event
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                style={{
                                    ...S.btnPrimary,
                                    background: cfg.badge,
                                    height: 40,
                                    borderRadius: 999,
                                    padding: '0 20px',
                                    fontWeight: 700
                                }}
                            >
                                Close
                            </button>
                        </div>
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
    const darkMode = isDarkMode();
    const closeBtnFilter = darkMode ? 'invert(1) opacity(.72)' : 'opacity(.75)';

    return (
        <ModalPortal>
            <div
                className="hide-scrollbar"
                onClick={e => {
                    if (e.target === e.currentTarget) onClose();
                }}
                style={{
                    ...S.backdrop,
                    padding: '14px',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,.22)'
                }}
            >
                <div style={{ ...S.modal, maxWidth: 360 }}>
                    <div style={S.mHead}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--cal-text)' }}>
                            {fmtLong(dateStr)}
                        </span>
                        <button
                            className="btn-close"
                            onClick={onClose}
                            style={{ fontSize: 11, filter: closeBtnFilter }}
                        />
                    </div>

                    <div
                        className="hide-scrollbar"
                        style={{
                            padding: '0.75rem 1rem',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            background: 'var(--cal-panel)'
                        }}
                    >
                        {events.map(ev => {
                            const derivedStatus = getEventStatus(ev);
                            const cfg = STATUS_CFG[derivedStatus] ?? STATUS_CFG.Upcoming;
                            const hoverBg = darkMode ? colorWithAlpha(cfg.badge, '16') : cfg.bg;

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
                                        border: '1px solid var(--cal-border)',
                                        background: 'transparent'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cal-text)' }}>
                                            {ev.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--cal-text-3)' }}>
                                            {fmtShort(ev.start_date)} – {fmtShort(ev.end_date)}
                                        </div>
                                        {(ev.start_time || ev.end_time) && (
                                            <div style={{ fontSize: 11, color: 'var(--cal-text-3)' }}>
                                                {fmtTimeRange(ev.start_time, ev.end_time)}
                                            </div>
                                        )}
                                    </div>

                                    <span
                                        style={{
                                            ...S.chip,
                                            background: darkMode ? colorWithAlpha(cfg.badge, '16') : cfg.bg,
                                            color: cfg.text,
                                            fontSize: 10,
                                            border: `1px solid ${colorWithAlpha(cfg.badge, '35')}`
                                        }}
                                    >
                                        {derivedStatus}
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
                width: 185,
                flexShrink: 0,
                background: 'var(--cal-panel)',
                border: '1px solid var(--cal-border)',
                borderRadius: 18,
                padding: '18px 16px',
                alignSelf: 'flex-start',
                boxShadow: 'var(--cal-shadow)'
            }}
        >
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--cal-text)', marginBottom: 16 }}>
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
                            marginBottom: 13,
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
                                background: active ? cfg.filter : 'var(--cal-panel-2)',
                                border: `1.5px solid ${active ? cfg.filter : 'var(--cal-border)'}`,
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
                                fontSize: 13,
                                color: active ? 'var(--cal-text)' : 'var(--cal-text-3)',
                                fontWeight: active ? 600 : 500
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
    const derivedStatus = getEventStatus(event);
    const cfg = STATUS_CFG[derivedStatus] ?? STATUS_CFG.Upcoming;
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

                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: cfg.badge,
                        marginLeft: 4
                    }}
                >
                    <i className="bi bi-pin-fill" style={{ fontSize: 12, lineHeight: 1 }} />
                </span>
            </div>

            {(event.start_time || event.end_time) && (
                <div style={{ marginTop: 2, paddingLeft: 14, fontSize: 10, color: 'var(--cal-text-3)' }}>
                    {fmtTimeRange(event.start_time, event.end_time)}
                </div>
            )}

            {tagged.length > 0 && (
                <div
                    style={{
                        marginTop: 4,
                        paddingLeft: 14,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <AvatarStack employees={tagged} size={17} max={3} />
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
    const [filters, setFilters] = useState([]);
    const [hasTouchedFilters, setHasTouchedFilters] = useState(false);

    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [currentUser, setUser] = useState(null);

    const [dayModal, setDayModal] = useState(null);
    const [detailEvent, setDetail] = useState(null);
    const [editEvent, setEdit] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const isEditor = true;

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

    const toggleFilter = status => {
        setHasTouchedFilters(true);
        setFilters(prev =>
            prev.includes(status)
                ? prev.filter(x => x !== status)
                : [...prev, status]
        );
    };

    const getEventsInRange = (startStr, endStr) =>
        events.filter(ev => {
            const derivedStatus = getEventStatus(ev);
            const isInRange = ev.start_date <= endStr && ev.end_date >= startStr;

            if (!isInRange) return false;
            if (!hasTouchedFilters) return true;

            return filters.includes(derivedStatus);
        });

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

    const handleCancel = eventToCancel => {
        if (!window.confirm('Cancel this event?')) return;

        fetch('php/save_event.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...eventToCancel,
                status: 'Cancelled'
            })
        })
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);

                setEvents(prev =>
                    prev.map(ev => (ev.id === d.event.id ? d.event : ev))
                );
                setDetail(d.event);
            })
            .catch(err => {
                alert(err.message || 'Failed to cancel event.');
            });
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
            setEdit({
                start_date: dateStr,
                end_date: dateStr,
                start_time: '09:00',
                end_time: '10:00'
            });
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
                        if (!isTodayCell) e.currentTarget.style.background = 'var(--cal-hover)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--cal-panel)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                fontSize: 12,
                                fontWeight: isTodayCell ? 800 : 600,
                                background: isTodayCell ? 'var(--cal-today)' : 'transparent',
                                color: isTodayCell ? 'var(--cal-today-text)' : isSun ? '#E85B5B' : 'var(--cal-text)',
                                flexShrink: 0
                            }}
                        >
                            {d}
                        </span>

                        {isFirstRow && (
                            <span style={{ fontSize: 10.5, color: 'var(--cal-muted)', fontWeight: 600 }}>
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
                        <div style={{ fontSize: 10, color: 'var(--cal-text-3)', marginTop: 4, paddingLeft: 2 }}>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 }}>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        );
    };

    const renderWeekView = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: 980 }}>
            {weekDates.map((date, idx) => {
                const dateStr = toDateOnly(date);
                const dayEvs = getDay(dateStr);
                const isTodayCell = isSameDay(date, today);

                return (
                    <div
                        key={dateStr}
                        onClick={() => openDate(dateStr)}
                        style={{
                            minHeight: 500,
                            padding: '12px 10px',
                            borderRight: idx === 6 ? 'none' : '1px solid var(--cal-border-soft)',
                            cursor: dayEvs.length > 0 || isEditor ? 'pointer' : 'default',
                            background: 'var(--cal-panel)'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                            <span style={{ fontSize: 11, color: 'var(--cal-text-3)', fontWeight: 600 }}>
                                {DAY_ABBR[date.getDay()]}
                            </span>

                            <span
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isTodayCell ? 'var(--cal-today)' : 'var(--cal-panel-2)',
                                    color: isTodayCell ? 'var(--cal-today-text)' : 'var(--cal-text)',
                                    fontSize: 13,
                                    fontWeight: 700
                                }}
                            >
                                {date.getDate()}
                            </span>
                        </div>

                        {dayEvs.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--cal-text-3)', marginTop: 10 }}>
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

    const renderDayView = () => {
        const dayEvs = getDay(selectedDateStr);

        return (
            <div style={{ padding: '20px 22px 22px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--cal-text-3)', marginBottom: 12 }}>
                    {fmtLong(selectedDateStr)}
                </div>

                {dayEvs.length === 0 ? (
                    <div
                        onClick={() => {
                            if (!isEditor) return;
                            setEdit({
                                start_date: selectedDateStr,
                                end_date: selectedDateStr,
                                start_time: '09:00',
                                end_time: '10:00'
                            });
                            setShowForm(true);
                        }}
                        style={{
                            border: '1px dashed var(--cal-border)',
                            borderRadius: 14,
                            padding: '24px 16px',
                            textAlign: 'center',
                            color: 'var(--cal-text-3)',
                            fontSize: 13,
                            cursor: isEditor ? 'pointer' : 'default',
                            background: 'var(--cal-panel-2)'
                        }}
                    >
                        No events for this day
                    </div>
                ) : (
                    dayEvs.map(ev => {
                        const derivedStatus = getEventStatus(ev);
                        const cfg = STATUS_CFG[derivedStatus] ?? STATUS_CFG.Upcoming;

                        return (
                            <div
                                key={ev.id}
                                onClick={() => setDetail(ev)}
                                style={{
                                    border: '1px solid var(--cal-border)',
                                    borderLeft: `4px solid ${cfg.badge}`,
                                    borderRadius: 14,
                                    padding: '14px 16px',
                                    marginBottom: 10,
                                    cursor: 'pointer',
                                    background: 'var(--cal-panel)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cal-text)' }}>
                                            {ev.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--cal-text-3)', marginTop: 3 }}>
                                            {fmtShort(ev.start_date)} – {fmtShort(ev.end_date)}
                                        </div>

                                        {(ev.start_time || ev.end_time) && (
                                            <div style={{ fontSize: 12, color: 'var(--cal-text-3)', marginTop: 4 }}>
                                                {fmtTimeRange(ev.start_time, ev.end_time)}
                                            </div>
                                        )}

                                        {ev.location && (
                                            <div style={{ fontSize: 12, color: 'var(--cal-text-2)', marginTop: 6 }}>
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
                                        {derivedStatus}
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
                padding: '8px 8px 0',
                background: 'transparent',
                minHeight: 'calc(100vh - 110px)',
                fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
                boxSizing: 'border-box'
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    marginBottom: 14
                }}
            >
                <div />

                <div
                    style={{
                        justifySelf: 'center',
                        display: 'flex',
                        background: 'var(--cal-switch-bg)',
                        borderRadius: 12,
                        padding: 3,
                        gap: 2
                    }}
                >
                    {['Day', 'Week', 'Month'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            style={{
                                background: view === v ? 'var(--cal-switch-active)' : 'transparent',
                                color: view === v ? 'var(--cal-switch-active-text)' : 'var(--cal-text-2)',
                                border: 'none',
                                borderRadius: 10,
                                padding: '8px 24px',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all .15s',
                                minWidth: 78
                            }}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                <div style={{ justifySelf: 'end' }}>
                    {isEditor ? (
                        <button
                            onClick={() => {
                                setEdit({
                                    start_date: selectedDateStr,
                                    end_date: selectedDateStr,
                                    start_time: '09:00',
                                    end_time: '10:00'
                                });
                                setShowForm(true);
                            }}
                            style={{
                                background: 'var(--cal-btn)',
                                color: 'var(--cal-btn-text)',
                                border: 'none',
                                borderRadius: 11,
                                padding: '8px 16px',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 8px 20px rgba(47,109,246,.14)',
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
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 11,
                                background: '#EAF7EC',
                                border: '1px solid #BFE3C8',
                                borderRadius: 8,
                                padding: '7px 14px',
                                color: '#1E8449',
                                fontWeight: 600
                            }}
                        >
                            View Only
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
                <FilterSidebar activeFilters={filters} onToggle={toggleFilter} />

                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 'calc(100vh - 180px)',
                        background: 'var(--cal-panel)',
                        border: '1px solid var(--cal-border)',
                        borderRadius: 18,
                        overflow: 'hidden',
                        boxShadow: 'var(--cal-shadow)'
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'center',
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--cal-border-soft)',
                            background: 'var(--cal-panel)'
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
                                    padding: '10px 14px',
                                    border: '1px solid var(--cal-border)',
                                    borderRadius: 12,
                                    background: 'var(--cal-panel-2)',
                                    color: 'var(--cal-text-2)',
                                    fontSize: 14,
                                    fontWeight: 700
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

                        <div style={{ justifySelf: 'center', color: 'var(--cal-text-2)', fontSize: 15 }}>
                            <strong style={{ fontSize: 19, color: 'var(--cal-text)', marginRight: 6 }}>
                                {totalEvents}
                            </strong>
                            {summaryLabel}
                        </div>

                        <div />
                    </div>

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
                    onCancel={handleCancel}
                    onClose={() => {
                        setDetail(null);
                        setDayModal(null);
                    }}
                />
            )}

            {showForm && (
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
        padding: '10px 12px',
        borderBottom: '1px solid var(--cal-border-soft)',
        borderRight: '1px solid var(--cal-border-soft)',
        background: 'var(--cal-panel)',
        minHeight: 118,
        height: 118,
        transition: 'background .12s'
    },

    empty: {
        borderBottom: '1px solid var(--cal-border-soft)',
        borderRight: '1px solid var(--cal-border-soft)',
        background: 'var(--cal-empty)',
        minHeight: 118,
        height: 118
    },

    navBtn: {
        background: 'var(--cal-nav)',
        border: '1px solid var(--cal-nav-border)',
        borderRadius: 10,
        width: 36,
        height: 36,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--cal-text-2)'
    }
};

// ── Shared style tokens ───────────────────────────────────────────────
const S = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.52)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: '88px 16px 24px',
        boxSizing: 'border-box'
    },

    modal: {
        background: 'var(--cal-panel)',
        borderRadius: 18,
        width: '100%',
        maxHeight: 'calc(100vh - 112px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--cal-shadow)',
        margin: '0 auto',
        border: '1px solid var(--cal-border)',
        position: 'relative'
    },

    mHead: {
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--cal-border-soft)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--cal-panel)'
    },

    mBody: {
        overflowY: 'auto',
        padding: '1.125rem 1.5rem',
        flex: 1,
        background: 'var(--cal-panel)'
    },

    mFoot: {
        padding: '0.75rem 1.5rem',
        borderTop: '1px solid var(--cal-border-soft)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--cal-panel)'
    },

    inp: {
        width: '100%',
        padding: '8px 11px',
        border: '1px solid var(--cal-border)',
        borderRadius: 8,
        fontSize: 13,
        color: 'var(--cal-text)',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        background: 'var(--cal-input-bg)'
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
        background: 'var(--cal-btn)',
        color: 'var(--cal-btn-text)',
        border: 'none',
        borderRadius: 20,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer'
    },

    btnGhost: {
        background: 'var(--cal-panel)',
        color: 'var(--cal-text-2)',
        border: '1px solid var(--cal-border)',
        borderRadius: 20,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer'
    },

    btnDanger: {
        background: 'var(--cal-panel)',
        color: '#E74C3C',
        border: '1px solid #E74C3C44',
        borderRadius: 20,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer'
    },

    errBox: {
        background: 'rgba(231,76,60,.10)',
        border: '1px solid rgba(231,76,60,.24)',
        color: '#E96B61',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        marginBottom: 12
    }
};

// ====================================================================
// MOUNT
// ====================================================================
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Calendar />);
}