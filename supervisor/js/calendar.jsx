
const { useState, useEffect, useRef } = React;

// ====================================================================
// CONSTANTS
// ====================================================================
const DAYS_OF_WEEK   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES    = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
const STATUS_COLORS  = {
    Upcoming:   { bg: '#0d6efd', text: '#fff' },
    Ongoing:    { bg: '#28a745', text: '#fff' },
    Completed:  { bg: '#6c757d', text: '#fff' },
    Cancelled:  { bg: '#dc3545', text: '#fff' },
};
const PRIORITY_COLORS = {
    High:   '#dc3545',
    Medium: '#ffc107',
    Low:    '#198754',
};

// ====================================================================
// HELPERS
// ====================================================================
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${MONTH_NAMES[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}
function isSameOrBefore(a, b) { return a <= b; }
function isSameOrAfter(a, b) { return a >= b; }

// ====================================================================
// EVENT BADGE — small pill used in calendar cells
// ====================================================================
function EventPill({ event }) {
    const color = STATUS_COLORS[event.status] ?? STATUS_COLORS['Upcoming'];
    return (
        <div style={{
            background: color.bg,
            color: color.text,
            borderRadius: 3,
            fontSize: 10,
            padding: '1px 5px',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            cursor: 'pointer',
        }}>
            {event.title}
        </div>
    );
}

// ====================================================================
// EVENT FORM MODAL — create or edit an event (MarketingHR only)
// ====================================================================
function EventFormModal({ event, employees, onSave, onDelete, onClose }) {
    const isEdit = !!event?.id;
    const blank  = {
        title: '', description: '', location: '',
        start_date: '', end_date: '', status: 'Upcoming',
        priority: 'Medium', tagged_employees: [],
    };
    const [form, setForm]       = useState(event ? { ...event, tagged_employees: event.tagged_employees ?? [] } : blank);
    const [saving, setSaving]   = useState(false);
    const [deleting, setDelete] = useState(false);
    const [error, setError]     = useState(null);
    const [empSearch, setEmpSearch] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const toggleEmployee = (id) => {
        set('tagged_employees',
            form.tagged_employees.includes(id)
                ? form.tagged_employees.filter(e => e !== id)
                : [...form.tagged_employees, id]
        );
    };

    const filteredEmployees = employees.filter(e =>
        `${e.name} ${e.department}`.toLowerCase().includes(empSearch.toLowerCase())
    );

    const handleSave = () => {
        if (!form.title.trim())      { setError('Title is required.');               return; }
        if (!form.start_date)        { setError('Start date is required.');          return; }
        if (!form.end_date)          { setError('End date is required.');            return; }
        if (form.end_date < form.start_date) { setError('End date must be on or after start date.'); return; }
        setSaving(true);
        setError(null);
        fetch('php/save_event.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            onSave(d.event);
        })
        .catch(e => { setError(e.message); setSaving(false); });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete this event? This cannot be undone.')) return;
        setDelete(true);
        fetch('php/delete_event.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: form.id }),
        })
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            onDelete(form.id);
        })
        .catch(e => { setError(e.message); setDelete(false); });
    };

    const backdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    return (
        <div onClick={backdropClick} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
            zIndex:1060, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
        }}>
            <div style={{
                background:'#fff', borderRadius:12, width:'100%', maxWidth:620,
                maxHeight:'90vh', display:'flex', flexDirection:'column',
                boxShadow:'0 8px 32px rgba(0,0,0,0.22)',
            }}>
                {/* Header */}
                <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #dee2e6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                    <h5 style={{ margin:0, fontWeight:600 }}>{isEdit ? 'Edit Event' : 'New Event'}</h5>
                    <button className="btn-close" onClick={onClose} />
                </div>

                {/* Body */}
                <div style={{ overflowY:'auto', padding:'1.25rem', flex:1 }}>
                    {error && <div className="alert alert-danger py-2">{error}</div>}

                    {/* Title */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Title <span className="text-danger">*</span></label>
                        <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Event title" />
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Description</label>
                        <textarea className="form-control" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details…" />
                    </div>

                    {/* Location */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Location</label>
                        <input className="form-control" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Venue or link" />
                    </div>

                    {/* Dates */}
                    <div className="row mb-3">
                        <div className="col">
                            <label className="form-label fw-semibold">Start Date <span className="text-danger">*</span></label>
                            <input type="date" className="form-control" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                        </div>
                        <div className="col">
                            <label className="form-label fw-semibold">End Date <span className="text-danger">*</span></label>
                            <input type="date" className="form-control" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                        </div>
                    </div>

                    {/* Status + Priority */}
                    <div className="row mb-3">
                        <div className="col">
                            <label className="form-label fw-semibold">Status</label>
                            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                                {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="col">
                            <label className="form-label fw-semibold">Priority</label>
                            <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                                <option>High</option><option>Medium</option><option>Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Employee Tagging */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Tag Employees</label>
                        <input
                            className="form-control form-control-sm mb-2"
                            placeholder="Search by name or department…"
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                        />
                        <div style={{ maxHeight:180, overflowY:'auto', border:'1px solid #dee2e6', borderRadius:6, padding:'0.25rem 0.5rem' }}>
                            {filteredEmployees.length === 0 ? (
                                <div className="text-muted small py-2 text-center">No employees found.</div>
                            ) : filteredEmployees.map(emp => {
                                const checked = form.tagged_employees.includes(emp.id);
                                return (
                                    <div key={emp.id}
                                        onClick={() => toggleEmployee(emp.id)}
                                        style={{
                                            display:'flex', alignItems:'center', gap:8, padding:'5px 4px',
                                            borderRadius:4, cursor:'pointer',
                                            background: checked ? '#e8f4fd' : 'transparent',
                                        }}
                                    >
                                        <input type="checkbox" readOnly checked={checked} style={{ pointerEvents:'none' }} />
                                        <span style={{ fontSize:13 }}>
                                            <strong>{emp.name}</strong>
                                            <span className="text-muted ms-1">— {emp.department}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        {form.tagged_employees.length > 0 && (
                            <div className="mt-2 d-flex gap-1 flex-wrap">
                                {form.tagged_employees.map(id => {
                                    const emp = employees.find(e => e.id === id);
                                    return emp ? (
                                        <span key={id} className="badge bg-primary" style={{ fontSize:11 }}>
                                            {emp.name}
                                            <span
                                                style={{ marginLeft:5, cursor:'pointer', opacity:0.75 }}
                                                onClick={() => toggleEmployee(id)}
                                            >✕</span>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid #dee2e6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                    <div>
                        {isEdit && (
                            <button className="btn btn-sm btn-outline-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? 'Deleting…' : 'Delete Event'}
                            </button>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// EVENT DETAIL MODAL — read-only view for non-MarketingHr users
// ====================================================================
function EventDetailModal({ event, employees, canEdit, onEdit, onClose }) {
    const color    = STATUS_COLORS[event.status] ?? STATUS_COLORS['Upcoming'];
    const pColor   = PRIORITY_COLORS[event.priority] ?? '#6c757d';
    const tagged   = (event.tagged_employees ?? [])
        .map(id => employees.find(e => e.id === id))
        .filter(Boolean);

    const backdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    return (
        <div onClick={backdropClick} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
            zIndex:1060, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
        }}>
            <div style={{
                background:'#fff', borderRadius:12, width:'100%', maxWidth:520,
                boxShadow:'0 8px 32px rgba(0,0,0,0.22)',
            }}>
                {/* Coloured header strip */}
                <div style={{ background: color.bg, borderRadius:'12px 12px 0 0', padding:'1rem 1.25rem', color: color.text, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                        <h5 style={{ margin:0, fontWeight:700 }}>{event.title}</h5>
                        <small style={{ opacity:0.85 }}>{formatDateDisplay(event.start_date)} – {formatDateDisplay(event.end_date)}</small>
                    </div>
                    <button className="btn-close btn-close-white" onClick={onClose} style={{ marginTop:2 }} />
                </div>

                {/* Body */}
                <div style={{ padding:'1.25rem' }}>
                    <div className="d-flex gap-2 mb-3 flex-wrap">
                        <span className="badge" style={{ background: color.bg, color: color.text }}>{event.status}</span>
                        <span className="badge" style={{ background: pColor, color: event.priority === 'Medium' ? '#333' : '#fff' }}>{event.priority} Priority</span>
                    </div>

                    {event.description && (
                        <p style={{ fontSize:14, color:'#444', marginBottom:'0.75rem' }}>{event.description}</p>
                    )}

                    {event.location && (
                        <div style={{ fontSize:13, color:'#555', marginBottom:'0.75rem' }}>
                            📍 {event.location}
                        </div>
                    )}

                    {/* Tagged employees */}
                    {tagged.length > 0 && (
                        <div style={{ marginTop:'0.5rem' }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#888', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Tagged Employees</div>
                            <div className="d-flex gap-2 flex-wrap">
                                {tagged.map(emp => (
                                    <span key={emp.id} style={{ fontSize:12, background:'#f0f4ff', border:'1px solid #c7d7f5', borderRadius:20, padding:'2px 10px', color:'#2856c8' }}>
                                        {emp.name} <span style={{ color:'#888' }}>· {emp.department}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid #dee2e6', display:'flex', justifyContent:'flex-end', gap:8 }}>
                    {canEdit && (
                        <button className="btn btn-sm btn-outline-primary" onClick={onEdit}>Edit Event</button>
                    )}
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// DAY EVENTS MODAL — shows all events on a clicked day
// ====================================================================
function DayEventsModal({ dateStr, events, employees, canEdit, onSelectEvent, onClose }) {
    const backdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };
    return (
        <div onClick={backdropClick} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
            zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
        }}>
            <div style={{
                background:'#fff', borderRadius:12, width:'100%', maxWidth:440,
                maxHeight:'80vh', display:'flex', flexDirection:'column',
                boxShadow:'0 8px 32px rgba(0,0,0,0.2)',
            }}>
                <div style={{ padding:'0.875rem 1.25rem', borderBottom:'1px solid #dee2e6', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                    <h6 style={{ margin:0, fontWeight:600 }}>{formatDateDisplay(dateStr)}</h6>
                    <button className="btn-close" onClick={onClose} />
                </div>
                <div style={{ overflowY:'auto', padding:'0.75rem 1rem', flex:1 }}>
                    {events.map(ev => {
                        const color = STATUS_COLORS[ev.status] ?? STATUS_COLORS['Upcoming'];
                        return (
                            <div key={ev.id}
                                onClick={() => onSelectEvent(ev)}
                                style={{
                                    display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                                    borderRadius:8, cursor:'pointer', marginBottom:6,
                                    border:'1px solid #e9ecef', transition:'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background='#f8f9fa'}
                                onMouseLeave={e => e.currentTarget.style.background=''}
                            >
                                <div style={{ width:10, height:10, borderRadius:'50%', background:color.bg, flexShrink:0 }} />
                                <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontWeight:500, fontSize:13 }}>{ev.title}</div>
                                    <div style={{ fontSize:11, color:'#888' }}>
                                        {formatDateDisplay(ev.start_date)} – {formatDateDisplay(ev.end_date)}
                                        {ev.location ? ` · ${ev.location}` : ''}
                                    </div>
                                </div>
                                <span className="badge" style={{ background:color.bg, color:color.text, fontSize:10 }}>{ev.status}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// SIDEBAR EVENT LIST / SUMMARY PANEL
// ====================================================================
function EventSidebar({ events, employees, currentMonth, currentYear, isMarketingHr, onSelectEvent, onNewEvent }) {
    const [filter, setFilter]  = useState('all');   // all | mine | month
    const [search, setSearch]  = useState('');
    const [sortBy, setSortBy]  = useState('date');  // date | status | priority

    // Events for the current displayed month
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-01`;
    const lastDay    = getDaysInMonth(currentYear, currentMonth);
    const monthEnd   = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

    const filtered = events
        .filter(ev => {
            if (filter === 'month') return ev.start_date <= monthEnd && ev.end_date >= monthStart;
            return true;
        })
        .filter(ev => {
            if (!search.trim()) return true;
            return ev.title.toLowerCase().includes(search.toLowerCase()) ||
                   (ev.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
                   (ev.description ?? '').toLowerCase().includes(search.toLowerCase());
        })
        .sort((a, b) => {
            if (sortBy === 'status')   return a.status.localeCompare(b.status);
            if (sortBy === 'priority') {
                const order = { High:0, Medium:1, Low:2 };
                return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
            }
            return a.start_date.localeCompare(b.start_date);
        });

    // Summary counts
    const counts = events.reduce((acc, ev) => {
        acc[ev.status] = (acc[ev.status] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

            {/* Summary chips */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                {Object.entries(STATUS_COLORS).map(([status, col]) => (
                    <div key={status} style={{
                        background: col.bg, color: col.text,
                        borderRadius:20, fontSize:11, padding:'2px 10px', fontWeight:500,
                    }}>
                        {counts[status] ?? 0} {status}
                    </div>
                ))}
            </div>

            {/* Controls */}
            <input
                className="form-control form-control-sm mb-2"
                placeholder="Search events…"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            <div className="d-flex gap-2 mb-3">
                <select className="form-select form-select-sm" value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All Events</option>
                    <option value="month">This Month</option>
                </select>
                <select className="form-select form-select-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="date">By Date</option>
                    <option value="status">By Status</option>
                    <option value="priority">By Priority</option>
                </select>
            </div>

            {/* New Event button — MarketingHr only */}
            {isMarketingHr && (
                <button className="btn btn-sm btn-primary w-100 mb-3" onClick={onNewEvent}>
                    + New Event
                </button>
            )}

            {/* Event list */}
            <div style={{ overflowY:'auto', flex:1 }}>
                {filtered.length === 0 ? (
                    <div className="text-muted text-center small py-4">No events found.</div>
                ) : filtered.map(ev => {
                    const color  = STATUS_COLORS[ev.status] ?? STATUS_COLORS['Upcoming'];
                    const pColor = PRIORITY_COLORS[ev.priority] ?? '#aaa';
                    const tagged = (ev.tagged_employees ?? [])
                        .map(id => employees.find(e => e.id === id))
                        .filter(Boolean);

                    return (
                        <div key={ev.id}
                            onClick={() => onSelectEvent(ev)}
                            style={{
                                border:'1px solid #e9ecef', borderRadius:8, padding:'10px 12px',
                                marginBottom:8, cursor:'pointer', borderLeft:`4px solid ${color.bg}`,
                                transition:'box-shadow 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
                        >
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:4 }}>
                                <div style={{ fontWeight:600, fontSize:13, flex:1 }}>{ev.title}</div>
                                <span style={{ fontSize:10, fontWeight:600, color: pColor, flexShrink:0 }}>
                                    ● {ev.priority}
                                </span>
                            </div>
                            <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
                                {formatDateDisplay(ev.start_date)}
                                {ev.end_date !== ev.start_date ? ` – ${formatDateDisplay(ev.end_date)}` : ''}
                            </div>
                            {ev.location && <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>📍 {ev.location}</div>}
                            <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap', alignItems:'center' }}>
                                <span className="badge" style={{ background:color.bg, color:color.text, fontSize:10 }}>{ev.status}</span>
                                {tagged.length > 0 && (
                                    <span style={{ fontSize:10, color:'#888' }}>
                                        👤 {tagged.slice(0,2).map(e => e.name).join(', ')}{tagged.length > 2 ? ` +${tagged.length - 2}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ====================================================================
// MAIN CALENDAR COMPONENT
// ====================================================================
function Calendar() {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear,  setCurrentYear]  = useState(today.getFullYear());

    const [events,       setEvents]       = useState([]);
    const [employees,    setEmployees]    = useState([]);
    const [currentUser,  setCurrentUser]  = useState(null);   // { id, name, department, department_id }

    // Modal state
    const [dayModal,    setDayModal]    = useState(null);  // { dateStr, events[] }
    const [detailEvent, setDetailEvent] = useState(null);  // event object for detail view
    const [editEvent,   setEditEvent]   = useState(null);  // event object (or {}) for form
    const [showForm,    setShowForm]    = useState(false);

    // Derived
    const isMarketingHr  = currentUser?.department?.toLowerCase() === 'marketing' || currentUser?.department?.toLowerCase() === 'human resources';  

    // ----------------------------------------------------------------
    // Bootstrap: fetch current user, events, employees
    // ----------------------------------------------------------------
    useEffect(() => {
        // Fetch current logged-in user
        fetch('php/get_current_user.php')
            .then(r => r.json())
            .then(d => { if (!d.error) setCurrentUser(d); })
            .catch(() => {});

        // Fetch all employees (for tagging)
        fetch('php/get_employees.php')
            .then(r => r.json())
            .then(d => setEmployees(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);
// Fetch all events once current user is loaded
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

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
    function getEventsForDay(day) {
        const dateStr = toDateStr(currentYear, currentMonth, day);
        return events.filter(ev =>
            isSameOrBefore(ev.start_date, dateStr) && isSameOrAfter(ev.end_date, dateStr)
        );
    }

    // ----------------------------------------------------------------
    // Event CRUD callbacks
    // ----------------------------------------------------------------
    const handleSaveEvent = (savedEvent) => {
        setEvents(prev => {
            const idx = prev.findIndex(e => e.id === savedEvent.id);
            return idx >= 0
                ? prev.map(e => e.id === savedEvent.id ? savedEvent : e)
                : [...prev, savedEvent];
        });
        setShowForm(false);
        setEditEvent(null);
    };

    const handleDeleteEvent = (id) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setShowForm(false);
        setEditEvent(null);
    };

    // ----------------------------------------------------------------
    // Navigation
    // ----------------------------------------------------------------
    const prevMonth = () => {
        setCurrentMonth(m => {
            if (m === 0) { setCurrentYear(y => y - 1); return 11; }
            return m - 1;
        });
        setDayModal(null);
    };
    const nextMonth = () => {
        setCurrentMonth(m => {
            if (m === 11) { setCurrentYear(y => y + 1); return 0; }
            return m + 1;
        });
        setDayModal(null);
    };
    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
        setDayModal(null);
    };

    // ----------------------------------------------------------------
    // Build calendar grid
    // ----------------------------------------------------------------
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay    = getFirstDayOfMonth(currentYear, currentMonth);

    const calendarRows = [];
    let cells = [];

    for (let i = 0; i < firstDay; i++) {
        cells.push(
            <td key={`empty-${i}`} style={{ background:'#fafafa', borderColor:'#f0f0f0' }}></td>
        );
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const isToday   = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        const dateStr   = toDateStr(currentYear, currentMonth, d);
        const dayEvents = getEventsForDay(d);

        cells.push(
            <td key={d}
                onClick={() => {
                    if (dayEvents.length > 0) {
                        setDayModal({ dateStr, events: dayEvents });
                    } else if (isMarketingHr) {
                        // MarketingHr can click an empty day to quickly create an event
                        setEditEvent({ start_date: dateStr, end_date: dateStr });
                        setShowForm(true);
                    }
                }}
                style={{
                    verticalAlign:'top', padding:'4px 5px', cursor: dayEvents.length > 0 || isMarketingHr ? 'pointer' : 'default',
                    minWidth: 80, maxWidth: 120,
                    background: isToday ? '#fff8e1' : '#fff',
                    outline: isToday ? '2px solid #ffc107' : 'none',
                    outlineOffset: -2,
                    transition:'background 0.12s',
                }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = '#f5f7ff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isToday ? '#fff8e1' : '#fff'; }}
            >
                {/* Day number */}
                <div style={{
                    fontWeight: isToday ? 700 : 400,
                    fontSize: 13,
                    color: isToday ? '#e6a200' : '#333',
                    marginBottom: 2,
                    display:'flex', alignItems:'center', gap:4,
                }}>
                    {isToday && <span style={{ fontSize:9, background:'#ffc107', color:'#333', borderRadius:3, padding:'0 4px', fontWeight:700 }}>TODAY</span>}
                    {d}
                </div>
                {/* Event pills — show up to 2, then "+N more" */}
                {dayEvents.slice(0, 2).map(ev => <EventPill key={ev.id} event={ev} />)}
                {dayEvents.length > 2 && (
                    <div style={{ fontSize:10, color:'#888', marginTop:1 }}>+{dayEvents.length - 2} more</div>
                )}
            </td>
        );

        if (cells.length % 7 === 0 || d === daysInMonth) {
            // Pad last row
            if (d === daysInMonth && cells.length % 7 !== 0) {
                const remaining = 7 - (cells.length % 7);
                for (let p = 0; p < remaining; p++) {
                    cells.push(<td key={`pad-${p}`} style={{ background:'#fafafa', borderColor:'#f0f0f0' }}></td>);
                }
            }
            calendarRows.push(<tr key={`row-${d}`}>{cells}</tr>);
            cells = [];
        }
    }

    // ----------------------------------------------------------------
    // RENDER
    // ----------------------------------------------------------------
    return (
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', padding:'1.25rem' }}>

            {/* ── CALENDAR ── */}
            <div style={{ flex:'1 1 0', minWidth:0 }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <button className="btn btn-sm btn-outline-secondary" onClick={prevMonth}>‹</button>
                        <h5 style={{ margin:0, fontWeight:700, fontSize:'1.1rem' }}>
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </h5>
                        <button className="btn btn-sm btn-outline-secondary" onClick={nextMonth}>›</button>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button className="btn btn-sm btn-outline-primary" onClick={goToToday}>Today</button>
                        {isMarketingHr && (
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => { setEditEvent({}); setShowForm(true); }}
                            >
                                + New Event
                            </button>
                        )}
                        {currentUser && !isMarketingHr && (
                            <span className="badge bg-secondary" style={{ fontSize:11 }}>View Only</span>
                        )}
                    </div>
                </div>

                {/* Role notice for non-MarketingHr */}
                {currentUser && !isMarketingHr && (
                    <div className="alert alert-info py-2 mb-3" style={{ fontSize:12 }}>
                        You are viewing events visible to your account. Only <strong>Marketing & HR</strong> staff can create or edit events.
                    </div>
                )}

                {/* Calendar table */}
                <div style={{ overflowX:'auto' }}>
                    <table style={{
                        width:'100%', borderCollapse:'collapse',
                        border:'1px solid #dee2e6', borderRadius:8, overflow:'hidden',
                        tableLayout:'fixed',
                    }}>
                        <thead>
                            <tr style={{ background:'#f8f9fa' }}>
                                {DAYS_OF_WEEK.map(d => (
                                    <th key={d} style={{ textAlign:'center', padding:'8px 4px', fontSize:12, fontWeight:600, color:'#555', borderBottom:'1px solid #dee2e6' }}>
                                        {d}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody style={{ border:'1px solid #dee2e6' }}>
                            {calendarRows}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap' }}>
                    {Object.entries(STATUS_COLORS).map(([status, col]) => (
                        <div key={status} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#555' }}>
                            <div style={{ width:10, height:10, borderRadius:2, background:col.bg }} />
                            {status}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── SIDEBAR ── */}
            <div style={{
                width: 300, flexShrink: 0,
                border:'1px solid #dee2e6', borderRadius:10,
                padding:'1rem', background:'#fff',
                maxHeight:'calc(100vh - 2.5rem)', display:'flex', flexDirection:'column',
                position:'sticky', top:'1.25rem',
            }}>
                <h6 style={{ fontWeight:700, marginBottom:12 }}>Events</h6>
                <EventSidebar
                    events={events}
                    employees={employees}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    isMarketingHr={isMarketingHr}
                    onSelectEvent={(ev) => setDetailEvent(ev)}
                    onNewEvent={() => { setEditEvent({}); setShowForm(true); }}
                />
            </div>

            {/* ── MODALS ── */}

            {/* Day click → list of events on that day */}
            {dayModal && !detailEvent && !showForm && (
                <DayEventsModal
                    dateStr={dayModal.dateStr}
                    events={dayModal.events}
                    employees={employees}
                    canEdit={isMarketingHr}
                    onSelectEvent={(ev) => { setDetailEvent(ev); setDayModal(null); }}
                    onClose={() => setDayModal(null)}
                />
            )}

            {/* Event detail (read or edit entry point) */}
            {detailEvent && !showForm && (
                <EventDetailModal
                    event={detailEvent}
                    employees={employees}
                    canEdit={isMarketingHr}
                    onEdit={() => { setEditEvent(detailEvent); setDetailEvent(null); setShowForm(true); }}
                    onClose={() => { setDetailEvent(null); setDayModal(null); }}
                />
            )}

            {/* Event form — MarketingHr only */}
            {showForm && isMarketingHr && (
                <EventFormModal
                    event={editEvent}
                    employees={employees}
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                    onClose={() => { setShowForm(false); setEditEvent(null); }}
                />
            )}
        </div>
    );
}

// ====================================================================
// MOUNT
// ====================================================================
const rootElement = document.getElementById('calendarRoot');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Calendar />);
}

