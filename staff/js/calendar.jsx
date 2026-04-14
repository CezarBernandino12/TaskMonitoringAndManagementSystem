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


function useOutsideClick(ref, onClose, when = true) {
    useEffect(() => {
        if (!when) return;

        const handler = e => {
            if (ref.current && !ref.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, onClose, when]);
}

function getCalendarMatrix(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const first = new Date(year, month, 1);
    const firstDay = first.getDay(); // 0 = Sun
    const startOffset = (firstDay + 6) % 7; // make Monday first

    const start = new Date(year, month, 1 - startOffset);
    const weeks = [];

    for (let w = 0; w < 6; w++) {
        const row = [];
        for (let d = 0; d < 7; d++) {
            const cell = new Date(start);
            cell.setDate(start.getDate() + w * 7 + d);
            row.push(cell);
        }
        weeks.push(row);
    }

    return weeks;
}

function fmtPickerMonth(date) {
    return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function fmtPickerValue(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y}`;
}

function CalendarIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

function ChevronLeftIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}

function FloatingLayer({ anchorRef, children, open, width = 370, offset = 8 }) {
    const [pos, setPos] = useState(null);

    useEffect(() => {
        if (!open || !anchorRef.current) return;

        const update = () => {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + offset + window.scrollY,
                left: rect.left + window.scrollX,
                width: Math.max(width, rect.width)
            });
        };

        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);

        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, anchorRef, width, offset]);

    if (!open || !pos) return null;

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                width: pos.width,
                zIndex: 100000
            }}
        >
            {children}
        </div>,
        document.body
    );
}

function CustomSelect({
    value,
    options,
    onChange,
    placeholder = 'Select',
    width = '100%',
    selectedColor = '#222',
    panelWidth = 250
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = React.useRef(null);
    const btnRef = React.useRef(null);

    useOutsideClick(wrapRef, () => setOpen(false), open);

    const selected = options.find(opt => opt.value === value);

    return (
        <div ref={wrapRef} style={{ position: 'relative', width }}>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%',
                    height: 38,
                    border: '1px solid #E5E5E8',
                    borderRadius: 12,
                    background: '#fff',
                    padding: '0 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: value ? selectedColor : '#9A9AA1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                }}
            >
                <span>{selected ? selected.label : placeholder}</span>
                <span style={{ color: '#777', display: 'inline-flex' }}>
                    <ChevronDownIcon />
                </span>
            </button>

            <FloatingLayer anchorRef={btnRef} open={open} width={panelWidth} offset={6}>
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #EAEAF0',
                        borderRadius: 18,
                        padding: '6px 0',
                        boxShadow: '0 14px 34px rgba(0,0,0,.10)'
                    }}
                >
                    {options.map(opt => {
                        const active = opt.value === value;

                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    background: active ? '#F7F7FA' : '#fff',
                                    padding: '13px 20px',
                                    textAlign: 'left',
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    color: active ? selectedColor : '#2B2B31',
                                    cursor: 'pointer'
                                }}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </FloatingLayer>
        </div>
    );
}

function CustomDatePicker({ value, onChange, placeholder = 'MM/DD/YYYY' }) {
    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(value ? fromDateStr(value) : new Date());
    const wrapRef = React.useRef(null);
    const btnRef = React.useRef(null);

    useOutsideClick(wrapRef, () => setOpen(false), open);

    useEffect(() => {
        if (value) setViewMonth(fromDateStr(value));
    }, [value]);

    const selectedDate = value ? fromDateStr(value) : null;
    const today = new Date();
    const weeks = getCalendarMatrix(viewMonth);

    const prevMonth = () =>
        setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));

    const nextMonth = () =>
        setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    return (
        <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%',
                    height: 38,
                    border: '1px solid #E5E5E8',
                    borderRadius: 12,
                    background: '#fff',
                    padding: '0 10px 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    cursor: 'pointer'
                }}
            >
                <span
                    style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: value ? '#222' : '#9A9AA1'
                    }}
                >
                    {value ? fmtPickerValue(value) : placeholder}
                </span>

                <span style={{ color: '#111', display: 'inline-flex', flexShrink: 0 }}>
                    <CalendarIcon />
                </span>
            </button>

            <FloatingLayer anchorRef={btnRef} open={open} width={330} offset={6}>
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #E8E8EE',
                        borderRadius: 22,
                        padding: '14px 14px 12px',
                        boxShadow: '0 16px 40px rgba(0,0,0,.10)'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 10
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {}}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: '#2C2C33',
                                cursor: 'default'
                            }}
                        >
                            {fmtPickerMonth(viewMonth)}
                            <span style={{ color: '#666', display: 'inline-flex' }}>
                                <ChevronDownIcon />
                            </span>
                        </button>

                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                type="button"
                                onClick={prevMonth}
                                style={{
                                    width: 26,
                                    height: 26,
                                    border: 'none',
                                    borderRadius: 999,
                                    background: 'transparent',
                                    color: '#4C4C52',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <ChevronLeftIcon />
                            </button>

                            <button
                                type="button"
                                onClick={nextMonth}
                                style={{
                                    width: 26,
                                    height: 26,
                                    border: 'none',
                                    borderRadius: 999,
                                    background: 'transparent',
                                    color: '#4C4C52',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <ChevronRightIcon />
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            marginBottom: 4
                        }}
                    >
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div
                                key={day}
                                style={{
                                    textAlign: 'center',
                                    fontSize: 9.5,
                                    fontWeight: 600,
                                    color: '#6E6E75',
                                    padding: '6px 0 8px'
                                }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gap: 0 }}>
                        {weeks.map((week, wi) => (
                            <div
                                key={wi}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)'
                                }}
                            >
                                {week.map(day => {
                                    const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
                                    const isSelected =
                                        selectedDate && isSameDay(day, selectedDate);
                                    const isTodayCell = isSameDay(day, today);

                                    return (
                                        <button
                                            key={day.toISOString()}
                                            type="button"
                                            onClick={() => {
                                                onChange(toDateOnly(day));
                                                setOpen(false);
                                            }}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                height: 32,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 2,
                                                cursor: 'pointer',
                                                borderRadius: 10,
                                                color: isSelected
                                                    ? '#E33B3B'
                                                    : isCurrentMonth
                                                    ? '#2F2F35'
                                                    : '#C9C9CF',
                                                fontSize: 10.5,
                                                fontWeight: isSelected ? 700 : 600
                                            }}
                                        >
                                            <span>{day.getDate()}</span>
                                            <span
                                                style={{
                                                    width: 4,
                                                    height: 4,
                                                    borderRadius: '50%',
                                                    background: isSelected
                                                        ? '#E33B3B'
                                                        : isTodayCell
                                                        ? '#D9D9DE'
                                                        : 'transparent'
                                                }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </FloatingLayer>
        </div>
    );
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

function EmployeeAvatar({ employee, size = 24, fontSize = 10, style = {} }) {
    const [imgError, setImgError] = useState(false);
    const src = normalizeProfileImageUrl(
        employee?.profile_image_url || employee?.profile_image || null
    );
    const initials = employee?.initials || getInitials(employee?.name || '');

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={employee?.name || 'User'}
                onError={() => setImgError(true)}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    flexShrink: 0,
                    ...style
                }}
            />
        );
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: getAvatarColor(employee?.name || ''),
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize,
                fontWeight: 700,
                flexShrink: 0,
                ...style
            }}
        >
            {initials}
        </div>
    );
}

function AvatarStack({ employees = [], size = 18, max = 3 }) {
    const shown = employees.slice(0, max);
    const extra = employees.length - shown.length;

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {shown.map((emp, idx) => (
                <div
                    key={emp.id}
                    style={{
                        marginLeft: idx === 0 ? 0 : -5,
                        borderRadius: '50%'
                    }}
                >
                    <EmployeeAvatar employee={emp} size={size} fontSize={Math.max(8, size * 0.38)} />
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
                        background: '#F2F2F4',
                        border: '1.5px solid #fff',
                        color: '#6B7280',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700
                    }}
                >
                    +{extra}
                </div>
            )}
        </div>
    );
}

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
        setForm(prev => ({
            ...prev,
            tagged_employees: prev.tagged_employees.includes(id)
                ? prev.tagged_employees.filter(e => e !== id)
                : [...prev.tagged_employees, id]
        }));
    };

    const filtered = employees.filter(e =>
        `${e.name} ${e.department}`.toLowerCase().includes(empQ.toLowerCase())
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

    const L = {
        shell: {
            position: 'relative',
            background: '#F8F8FA',
            borderRadius: 20,
            width: '100%',
            maxWidth: 660,
            maxHeight: '86vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 56px rgba(0,0,0,.14)'
        },
        body: {
            padding: '22px 24px 14px',
            overflowY: 'auto',
            flex: 1
        },
        footer: {
            padding: '12px 24px 16px',
            borderTop: '1px solid #ECECF0',
            background: '#F8F8FA',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
        },
        title: {
            fontSize: 22,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: '-.02em',
            color: '#222',
            marginBottom: 14
        },
        label: {
            fontSize: 10,
            fontWeight: 700,
            color: '#76767C',
            letterSpacing: '.02em',
            marginBottom: 6
        },
        input: {
            width: '100%',
            height: 38,
            border: '1px solid #E5E5E8',
            borderRadius: 12,
            background: '#fff',
            padding: '0 12px',
            fontSize: 11.5,
            fontWeight: 500,
            color: '#222',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'inherit'
        },
        section: {
            background: '#fff',
            border: '1px solid #EFEFF2',
            borderRadius: 14,
            padding: '12px'
        },
        rowIcon: {
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8D8D92',
            fontSize: 15,
            flexShrink: 0
        },
        rowText: {
            fontSize: 13,
            fontWeight: 600,
            color: '#2A2A2E'
        },
        employeeList: {
            maxHeight: 118,
            overflowY: 'auto',
            border: '1px solid #EBEBEB',
            borderRadius: 10,
            padding: '5px',
            background: '#fff'
        },
        smallBtn: {
            height: 32,
            padding: '0 11px',
            borderRadius: 9,
            border: '1px solid #DCDCDC',
            background: '#fff',
            color: '#555',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer'
        },
        softBtn: {
            height: 38,
            padding: '0 16px',
            borderRadius: 11,
            border: 'none',
            background: '#EEF0F4',
            color: '#222',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer'
        },
        primaryBtn: {
            height: 38,
            padding: '0 16px',
            borderRadius: 11,
            border: 'none',
            background: '#2F6DF6',
            color: '#fff',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(47,109,246,.16)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
        }
    };

    return (
        <ModalPortal>
            <div
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
                <div style={L.shell}>
                    <button
                        className="btn-close"
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 2,
                            fontSize: 10
                        }}
                    />

                    <div style={L.body}>
                        <div style={L.title}>
                            {isEdit ? 'Edit Event' : 'Add Event'}
                        </div>

                        {error && <div style={{ ...S.errBox, marginBottom: 14 }}>{error}</div>}

                        <div style={{ marginBottom: 14 }}>
                            <div style={L.label}>Event name</div>
                            <input
                                style={L.input}
                                value={form.title}
                                onChange={e => set('title', e.target.value)}
                                placeholder="Enter event name"
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
                            <div style={L.section}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        marginBottom: 12
                                    }}
                                >
                                    <span style={L.rowIcon}>
                                        <i className="bi bi-calendar4-event" />
                                    </span>
                                    <div style={L.rowText}>
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
                                    <div>
                                        <div style={L.label}>Start date</div>
                                        <CustomDatePicker
                                            value={form.start_date}
                                            onChange={v => set('start_date', v)}
                                        />
                                    </div>

                                    <div>
                                        <div style={L.label}>End date</div>
                                        <CustomDatePicker
                                            value={form.end_date}
                                            onChange={v => set('end_date', v)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: 14 }}>
                                <div style={L.section}>
                                    <div style={L.label}>Status</div>
                                    <CustomSelect
                                        value={form.status}
                                        onChange={v => set('status', v)}
                                        selectedColor={(STATUS_CFG[form.status] ?? STATUS_CFG.Upcoming).text}
                                        panelWidth={245}
                                        options={Object.keys(STATUS_CFG).map(s => ({
                                            value: s,
                                            label: s
                                        }))}
                                    />
                                </div>
                                <div style={L.section}>
                                    <div style={L.label}>Priority</div>
                                    <CustomSelect
                                        value={form.priority}
                                        onChange={v => set('priority', v)}
                                        selectedColor={PRIORITY_COLORS[form.priority] ?? '#666'}
                                        panelWidth={245}
                                        options={[
                                            { value: 'High', label: 'High' },
                                            { value: 'Medium', label: 'Medium' },
                                            { value: 'Low', label: 'Low' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ ...L.section, marginBottom: 14 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 10
                                }}
                            >
                                <span style={L.rowIcon}>
                                    <i className="bi bi-geo-alt" />
                                </span>
                                <div style={{ ...L.label, marginBottom: 0, fontSize: 12 }}>Location</div>
                            </div>

                            <input
                                style={L.input}
                                value={form.location}
                                onChange={e => set('location', e.target.value)}
                                placeholder="Venue or link"
                            />
                        </div>

                        <div style={L.section}>
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
                                    <span style={L.rowIcon}>
                                        <i className="bi bi-people" />
                                    </span>
                                    <div style={{ ...L.label, marginBottom: 0, fontSize: 12 }}>
                                        Tag employees
                                    </div>
                                </div>

                                {form.tagged_employees.length > 0 && (
                                    <span style={L.chip}>{form.tagged_employees.length}</span>
                                )}
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: 10,
                                    marginBottom: 10
                                }}
                            >
                                <input
                                    style={L.input}
                                    placeholder="Search employees"
                                    value={empQ}
                                    onChange={e => setEmpQ(e.target.value)}
                                />

                                {filtered.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        style={{
                                            ...L.smallBtn,
                                            border: `1px solid ${allFilteredSelected ? cfg.badge + '66' : '#DCDCDC'}`,
                                            background: allFilteredSelected ? cfg.bg : '#fff',
                                            color: allFilteredSelected ? cfg.text : '#555'
                                        }}
                                    >
                                        {allFilteredSelected ? 'Deselect' : 'Select all'}
                                    </button>
                                )}
                            </div>

                            <div style={L.employeeList}>
                                {filtered.length === 0 ? (
                                    <div
                                        style={{
                                            color: '#aaa',
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
                                                    gap: 8,
                                                    padding: '8px 7px',
                                                    borderRadius: 10,
                                                    cursor: 'pointer',
                                                    background: chk ? cfg.bg : 'transparent',
                                                    marginBottom: 4
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    readOnly
                                                    checked={chk}
                                                    style={{ pointerEvents: 'none', accentColor: cfg.badge }}
                                                />
                                                <>
                                                    <EmployeeAvatar employee={emp} size={24} fontSize={9} />
                                                    <span style={{ fontSize: 12, color: '#2A2A2E' }}>
                                                        <strong>{emp.name}</strong>
                                                    </span>
                                                </>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                                {form.tagged_employees.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                        {form.tagged_employees.map(id => {
                                            const emp = employees.find(e => e.id === id);
                                            return emp ? (
                                                <div
                                                    key={id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 7,
                                                        background: '#F7F7F8',
                                                        border: '1px solid #ECECEE',
                                                        borderRadius: 999,
                                                        padding: '4px 8px 4px 4px'
                                                    }}
                                                >
                                                    <EmployeeAvatar employee={emp} size={22} fontSize={9} />
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            color: '#444',
                                                            lineHeight: 1
                                                        }}
                                                    >
                                                        {emp.name}
                                                    </span>
                                                    <span
                                                        onClick={() => toggleEmp(id)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            opacity: 0.65,
                                                            fontSize: 11,
                                                            lineHeight: 1
                                                        }}
                                                    >
                                                        ✕
                                                    </span>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                        </div>
                    </div>

                    <div style={L.footer}>
                        <div>
                            {isEdit && (
                                <button
                                    onClick={del}
                                    disabled={deling}
                                    style={{
                                        ...L.softBtn,
                                        background: '#fff',
                                        border: '1px solid #F0C8C8',
                                        color: '#D64343'
                                    }}
                                >
                                    {deling ? 'Deleting…' : 'Delete'}
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={onClose} style={L.softBtn}>
                                Cancel
                            </button>

                            <button onClick={save} disabled={saving} style={L.primaryBtn}>
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
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {tagged.slice(0, SHOW_MAX).map(emp => (
                                                <div
                                                    key={emp.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 7,
                                                        background: '#F5F5F5',
                                                        borderRadius: 999,
                                                        padding: '4px 10px 4px 4px',
                                                        color: '#444'
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
                                        
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {tagged.map(emp => (
                                            <div
                                                key={emp.id}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 7,
                                                    background: '#F5F5F5',
                                                    borderRadius: 999,
                                                    padding: '4px 10px 4px 4px',
                                                    color: '#444'
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
            <i
                className="bi bi-pin-fill"
                style={{
                    fontSize: 12,
                    lineHeight: 1
                }}
            />
        </span>
            </div>

            {tagged.length > 0 && (
                <div
                    style={{
                        marginTop: 4,
                        paddingLeft: 14,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <AvatarStack employees={tagged} size={16} max={3} />
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
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    marginBottom: 20
                }}
            >
                <div />

                <div
                    style={{
                        justifySelf: 'center',
                        display: 'flex',
                        background: '#EFEFEF',
                        borderRadius: 12,
                        padding: 4,
                        gap: 2
                    }}
                >
                    {['Day', 'Week', 'Month'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            style={{
                                background: view === v ? '#111' : 'transparent',
                                color: view === v ? '#fff' : '#666',
                                border: 'none',
                                borderRadius: 10,
                                padding: '8px 28px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all .15s',
                                minWidth: 88
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
                                    end_date: selectedDateStr
                                });
                                setShowForm(true);
                            }}
                            style={{
                                background: '#000000',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 10,
                                padding: '9px 18px',
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
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            View Only
                        </span>
                    )}
                </div>
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