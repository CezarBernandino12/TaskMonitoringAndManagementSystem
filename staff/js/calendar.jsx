const { useState, useEffect, useRef } = React;

// ====================================================================
// CONSTANTS
// ====================================================================
const DAYS_OF_WEEK_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES      = ["January","February","March","April","May","June",
                          "July","August","September","October","November","December"];
const MONTH_SHORT      = ["Jan","Feb","Mar","Apr","May","Jun",
                          "Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUS_COLORS = {
    Upcoming:  { bg: '#1a73e8', light: '#e8f0fe', text: '#1967d2', pill: '#fff' },
    Ongoing:   { bg: '#0f9d58', light: '#e6f4ea', text: '#137333', pill: '#fff' },
    Completed: { bg: '#70757a', light: '#f1f3f4', text: '#5f6368', pill: '#fff' },
    Cancelled: { bg: '#d93025', light: '#fce8e6', text: '#c5221f', pill: '#fff' },
};
const PRIORITY_COLORS = {
    High:   '#d93025',
    Medium: '#f9ab00',
    Low:    '#0f9d58',
};
const EVENT_BAR_COLORS = [
    '#1a73e8','#0f9d58','#d93025','#f9ab00','#9c27b0',
    '#00897b','#e91e63','#3949ab','#00acc1','#7cb342',
];

// ====================================================================
// HELPERS
// ====================================================================
function getDaysInMonth(year, month)   { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayMon(year, month)   {
    const d = new Date(year, month, 1).getDay(); // 0=Sun
    return d === 0 ? 6 : d - 1;                 // Mon=0 … Sun=6
}
function toDateStr(year, month, day)   {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function formatShort(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${MONTH_SHORT[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}
function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${MONTH_NAMES[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}
// Stable color per event id
function eventColor(ev) {
    const col = STATUS_COLORS[ev.status];
    return col ? col.bg : '#1a73e8';
}
function eventLightColor(ev) {
    const col = STATUS_COLORS[ev.status];
    return col ? col.light : '#e8f0fe';
}
function eventTextColor(ev) {
    const col = STATUS_COLORS[ev.status];
    return col ? col.text : '#1967d2';
}

// ====================================================================
// EVENT BAR — inside calendar cell
// ====================================================================
function EventBar({ event, onClick }) {
    const bg   = eventColor(event);
    const text = '#fff';
    return (
        <div
            onClick={e => { e.stopPropagation(); onClick(event); }}
            title={event.title}
            style={{
                background: bg,
                color: text,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                padding: '1px 6px',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
                lineHeight: '18px',
                letterSpacing: '0.01em',
            }}
        >
            {event.title}
        </div>
    );
}

// ====================================================================
// EVENT FORM MODAL
// ====================================================================
function EventFormModal({ event, employees, onSave, onDelete, onClose }) {
    const isEdit = !!event?.id;
    const blank  = { title:'', description:'', location:'', start_date:'', end_date:'', status:'Upcoming', priority:'Medium', tagged_employees:[] };
    const [form,    setForm]    = useState(event ? { ...event, tagged_employees: event.tagged_employees ?? [] } : blank);
    const [saving,  setSaving]  = useState(false);
    const [deleting,setDel]     = useState(false);
    const [error,   setError]   = useState(null);
    const [empQ,    setEmpQ]    = useState('');

    const set = (k,v) => setForm(f => ({ ...f, [k]: v }));
    const toggleEmp = id => set('tagged_employees',
        form.tagged_employees.includes(id)
            ? form.tagged_employees.filter(e => e !== id)
            : [...form.tagged_employees, id]);

    const filteredEmps = employees.filter(e =>
        `${e.name} ${e.department}`.toLowerCase().includes(empQ.toLowerCase()));

    const handleSave = () => {
        if (!form.title.trim())              { setError('Title is required.');               return; }
        if (!form.start_date)                { setError('Start date is required.');          return; }
        if (!form.end_date)                  { setError('End date is required.');            return; }
        if (form.end_date < form.start_date) { setError('End date must be on or after start date.'); return; }
        setSaving(true); setError(null);
        fetch('php/save_event.php', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify(form),
        }).then(r=>r.json()).then(d => {
            if (d.error) throw new Error(d.error);
            onSave(d.event);
        }).catch(e => { setError(e.message); setSaving(false); });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete this event?')) return;
        setDel(true);
        fetch('php/delete_event.php', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ id: form.id }),
        }).then(r=>r.json()).then(d => {
            if (d.error) throw new Error(d.error);
            onDelete(form.id);
        }).catch(e => { setError(e.message); setDel(false); });
    };

    return (
        <div onClick={e=>{ if(e.target===e.currentTarget) onClose(); }} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
            zIndex:1060, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
        }}>
            <div style={{
                background:'#fff', borderRadius:16, width:'100%', maxWidth:580,
                maxHeight:'90vh', display:'flex', flexDirection:'column',
                boxShadow:'0 24px 64px rgba(0,0,0,0.18)',
            }}>
                <div style={{ padding:'1.125rem 1.5rem', borderBottom:'1px solid #e0e0e0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:600, fontSize:15, color:'#202124' }}>{isEdit ? 'Edit event' : 'New event'}</span>
                    <button className="btn-close" onClick={onClose} style={{ fontSize:12 }} />
                </div>
                <div style={{ overflowY:'auto', padding:'1.25rem 1.5rem', flex:1 }}>
                    {error && <div className="alert alert-danger py-2 mb-3" style={{fontSize:13}}>{error}</div>}
                    <div className="mb-3">
                        <label style={labelStyle}>Title <span style={{color:'#d93025'}}>*</span></label>
                        <input className="form-control" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Add title" style={inputStyle} />
                    </div>
                    <div className="mb-3">
                        <label style={labelStyle}>Description</label>
                        <textarea className="form-control" rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Add description" style={inputStyle} />
                    </div>
                    <div className="mb-3">
                        <label style={labelStyle}>Location</label>
                        <input className="form-control" value={form.location} onChange={e=>set('location',e.target.value)} placeholder="Add location or link" style={inputStyle} />
                    </div>
                    <div className="row mb-3">
                        <div className="col">
                            <label style={labelStyle}>Start date <span style={{color:'#d93025'}}>*</span></label>
                            <input type="date" className="form-control" value={form.start_date} onChange={e=>set('start_date',e.target.value)} style={inputStyle} />
                        </div>
                        <div className="col">
                            <label style={labelStyle}>End date <span style={{color:'#d93025'}}>*</span></label>
                            <input type="date" className="form-control" value={form.end_date} onChange={e=>set('end_date',e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    <div className="row mb-3">
                        <div className="col">
                            <label style={labelStyle}>Status</label>
                            <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)} style={inputStyle}>
                                {Object.keys(STATUS_COLORS).map(s=><option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="col">
                            <label style={labelStyle}>Priority</label>
                            <select className="form-select" value={form.priority} onChange={e=>set('priority',e.target.value)} style={inputStyle}>
                                <option>High</option><option>Medium</option><option>Low</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-2">
                        <label style={labelStyle}>Tag employees</label>
                        <input className="form-control form-control-sm mb-2" placeholder="Search name or department…" value={empQ} onChange={e=>setEmpQ(e.target.value)} style={inputStyle} />
                        <div style={{ maxHeight:160, overflowY:'auto', border:'1px solid #e0e0e0', borderRadius:8, padding:'4px 8px' }}>
                            {filteredEmps.length === 0
                                ? <div style={{color:'#9aa0a6',fontSize:12,padding:'6px 0',textAlign:'center'}}>No employees found.</div>
                                : filteredEmps.map(emp => {
                                    const checked = form.tagged_employees.includes(emp.id);
                                    return (
                                        <div key={emp.id} onClick={()=>toggleEmp(emp.id)} style={{
                                            display:'flex', alignItems:'center', gap:8, padding:'5px 4px',
                                            borderRadius:4, cursor:'pointer',
                                            background: checked ? '#e8f0fe' : 'transparent',
                                        }}>
                                            <input type="checkbox" readOnly checked={checked} style={{pointerEvents:'none'}} />
                                            <span style={{fontSize:13}}><strong>{emp.name}</strong> <span style={{color:'#9aa0a6'}}>— {emp.department}</span></span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        {form.tagged_employees.length > 0 && (
                            <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
                                {form.tagged_employees.map(id => {
                                    const emp = employees.find(e=>e.id===id);
                                    return emp ? (
                                        <span key={id} style={{
                                            background:'#e8f0fe', color:'#1967d2', border:'none',
                                            borderRadius:20, fontSize:11, padding:'2px 10px', cursor:'pointer',
                                        }}>
                                            {emp.name} <span onClick={()=>toggleEmp(id)} style={{marginLeft:4,opacity:.7}}>✕</span>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ padding:'0.875rem 1.5rem', borderTop:'1px solid #e0e0e0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                        {isEdit && (
                            <button onClick={handleDelete} disabled={deleting} style={dangerBtnStyle}>
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        )}
                    </div>
                    <div style={{display:'flex',gap:8}}>
                        <button onClick={onClose} style={ghostBtnStyle}>Cancel</button>
                        <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create event'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// EVENT DETAIL MODAL
// ====================================================================
function EventDetailModal({ event, employees, canEdit, onEdit, onClose }) {
    const col    = STATUS_COLORS[event.status] ?? STATUS_COLORS['Upcoming'];
    const pColor = PRIORITY_COLORS[event.priority] ?? '#9aa0a6';
    const tagged = (event.tagged_employees ?? []).map(id=>employees.find(e=>e.id===id)).filter(Boolean);

    return (
        <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
            zIndex:1060, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
        }}>
            <div style={{
                background:'#fff', borderRadius:16, width:'100%', maxWidth:480,
                boxShadow:'0 24px 64px rgba(0,0,0,0.18)', overflow:'hidden',
            }}>
                <div style={{ background: col.bg, padding:'1.25rem 1.5rem', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                        <div style={{fontWeight:700, fontSize:16, marginBottom:2}}>{event.title}</div>
                        <div style={{fontSize:12, opacity:.85}}>
                            {formatShort(event.start_date)} – {formatShort(event.end_date)}
                        </div>
                    </div>
                    <button className="btn-close btn-close-white" onClick={onClose} style={{fontSize:11,marginTop:2}} />
                </div>
                <div style={{padding:'1.25rem 1.5rem'}}>
                    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                        <span style={{...chipStyle, background:col.light, color:col.text}}>{event.status}</span>
                        <span style={{...chipStyle, background: event.priority==='Medium'?'#fef9e0':'', color:pColor, border:`1px solid ${pColor}33`}}>
                            ● {event.priority}
                        </span>
                    </div>
                    {event.description && <p style={{fontSize:13,color:'#444',marginBottom:10}}>{event.description}</p>}
                    {event.location && <div style={{fontSize:13,color:'#555',marginBottom:10}}>📍 {event.location}</div>}
                    {tagged.length > 0 && (
                        <div>
                            <div style={{fontSize:11,fontWeight:600,color:'#9aa0a6',marginBottom:6,textTransform:'uppercase',letterSpacing:'.05em'}}>Tagged</div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                                {tagged.map(emp=>(
                                    <span key={emp.id} style={{fontSize:12,background:'#f1f3f4',borderRadius:20,padding:'2px 10px',color:'#3c4043'}}>
                                        {emp.name} <span style={{color:'#9aa0a6'}}>· {emp.department}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{padding:'0.75rem 1.5rem',borderTop:'1px solid #e0e0e0',display:'flex',justifyContent:'flex-end',gap:8}}>
                    {canEdit && <button onClick={onEdit} style={ghostBtnStyle}>Edit event</button>}
                    <button onClick={onClose} style={primaryBtnStyle}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// DAY EVENTS MODAL
// ====================================================================
function DayEventsModal({ dateStr, events, employees, canEdit, onSelectEvent, onClose }) {
    return (
        <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
            zIndex:1055, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
        }}>
            <div style={{
                background:'#fff', borderRadius:16, width:'100%', maxWidth:400,
                maxHeight:'78vh', display:'flex', flexDirection:'column',
                boxShadow:'0 24px 64px rgba(0,0,0,0.18)',
            }}>
                <div style={{padding:'0.875rem 1.25rem',borderBottom:'1px solid #e0e0e0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontWeight:600,fontSize:14,color:'#202124'}}>{formatDateDisplay(dateStr)}</span>
                    <button className="btn-close" onClick={onClose} style={{fontSize:11}} />
                </div>
                <div style={{overflowY:'auto',padding:'0.75rem 1rem',flex:1}}>
                    {events.map(ev => {
                        const col = STATUS_COLORS[ev.status] ?? STATUS_COLORS['Upcoming'];
                        return (
                            <div key={ev.id} onClick={()=>onSelectEvent(ev)} style={{
                                display:'flex', alignItems:'center', gap:10, padding:'9px 10px',
                                borderRadius:10, cursor:'pointer', marginBottom:4,
                                border:'1px solid #f1f3f4', transition:'background .12s',
                            }}
                            onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'}
                            onMouseLeave={e=>e.currentTarget.style.background=''}
                            >
                                <div style={{width:10,height:10,borderRadius:'50%',background:col.bg,flexShrink:0}} />
                                <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontWeight:500,fontSize:13,color:'#202124'}}>{ev.title}</div>
                                    <div style={{fontSize:11,color:'#9aa0a6'}}>{formatShort(ev.start_date)} – {formatShort(ev.end_date)}</div>
                                </div>
                                <span style={{...chipStyle, background:col.light, color:col.text, fontSize:10}}>{ev.status}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MINI SIDEBAR LEFT PANEL
// ====================================================================
function LeftPanel({ currentYear, currentMonth, today, events }) {
    const counts = events.reduce((acc, ev) => {
        acc[ev.status] = (acc[ev.status] ?? 0) + 1;
        return acc;
    }, {});
    const lastDay = getDaysInMonth(currentYear, currentMonth);
    const monthStr = MONTH_NAMES[currentMonth];

    return (
        <div style={{
            width: 220, flexShrink: 0,
            borderRight: '1px solid #e0e0e0',
            padding: '1.5rem 1.25rem',
            display: 'flex', flexDirection: 'column', gap: 24,
        }}>
            {/* Date chip */}
            <div>
                <div style={{
                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                    background: '#1a73e8', borderRadius: 12, padding: '10px 18px',
                    color: '#fff', marginBottom: 12,
                }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .85 }}>
                        {MONTH_SHORT[currentMonth]}
                    </span>
                    <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1 }}>{today.getDate()}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#202124', marginBottom: 2 }}>{monthStr} {currentYear}</div>
                <div style={{ fontSize: 12, color: '#9aa0a6' }}>
                    {MONTH_SHORT[currentMonth]} 1, {currentYear} – {MONTH_SHORT[currentMonth]} {lastDay}, {currentYear}
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#e0e0e0' }} />

            {/* Status summary */}
            <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Overview</div>
                {Object.entries(STATUS_COLORS).map(([status, col]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 9, height: 9, borderRadius: 2, background: col.bg }} />
                            <span style={{ fontSize: 12, color: '#5f6368' }}>{status}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#202124' }}>{counts[status] ?? 0}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Priority</div>
                {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                        <span style={{ fontSize: 12, color: '#5f6368' }}>{p}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ====================================================================
// SHARED BUTTON STYLES
// ====================================================================
const primaryBtnStyle = {
    background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 20, padding: '6px 18px', fontSize: 13,
    fontWeight: 500, cursor: 'pointer', letterSpacing: '.01em',
};
const ghostBtnStyle = {
    background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0',
    borderRadius: 20, padding: '6px 18px', fontSize: 13,
    fontWeight: 500, cursor: 'pointer',
};
const dangerBtnStyle = {
    background: 'transparent', color: '#d93025', border: '1px solid #d9302533',
    borderRadius: 20, padding: '6px 18px', fontSize: 13,
    fontWeight: 500, cursor: 'pointer',
};
const labelStyle = {
    fontSize: 12, fontWeight: 600, color: '#5f6368',
    marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '.04em',
};
const inputStyle = {
    fontSize: 13, borderRadius: 8, border: '1px solid #dadce0',
    color: '#202124',
};
const chipStyle = {
    display: 'inline-flex', alignItems: 'center',
    borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500,
};

// ====================================================================
// MAIN CALENDAR
// ====================================================================
function Calendar() {
    const today = new Date();

    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
    const [activeTab,    setActiveTab]    = useState('all');
    const [searchQ,      setSearchQ]      = useState('');
    const [viewMode,     setViewMode]     = useState('Month view');

    const [events,      setEvents]      = useState([]);
    const [employees,   setEmployees]   = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const [dayModal,    setDayModal]    = useState(null);
    const [detailEvent, setDetailEvent] = useState(null);
    const [editEvent,   setEditEvent]   = useState(null);
    const [showForm,    setShowForm]    = useState(false);

    const isMarketingHr = currentUser?.department?.toLowerCase() === 'marketing'
                       || currentUser?.department?.toLowerCase() === 'human resources';

    // ── Fetch bootstrap data ──────────────────────────────────────────
    useEffect(() => {
        fetch('php/get_current_user.php').then(r=>r.json()).then(d=>{ if(!d.error) setCurrentUser(d); }).catch(()=>{});
        fetch('php/get_employees.php').then(r=>r.json()).then(d=>setEmployees(Array.isArray(d)?d:[])).catch(()=>{});
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const url = isMarketingHr ? 'php/get_events.php' : `php/get_events.php?user_id=${currentUser.id}`;
        fetch(url).then(r=>r.json()).then(d=>setEvents(Array.isArray(d)?d:[])).catch(()=>{});
    }, [currentUser]);

    // ── Helpers ───────────────────────────────────────────────────────
    function getEventsForDay(dateStr) {
        return events.filter(ev => ev.start_date <= dateStr && ev.end_date >= dateStr);
    }

    // ── CRUD ─────────────────────────────────────────────────────────
    const handleSaveEvent = (saved) => {
        setEvents(prev => {
            const idx = prev.findIndex(e=>e.id===saved.id);
            return idx >= 0 ? prev.map(e=>e.id===saved.id?saved:e) : [...prev, saved];
        });
        setShowForm(false); setEditEvent(null);
    };
    const handleDeleteEvent = (id) => {
        setEvents(prev=>prev.filter(e=>e.id!==id));
        setShowForm(false); setEditEvent(null);
    };

    // ── Navigation ────────────────────────────────────────────────────
    const prevMonth = () => { setCurrentMonth(m=>{ if(m===0){setCurrentYear(y=>y-1);return 11;} return m-1; }); setDayModal(null); };
    const nextMonth = () => { setCurrentMonth(m=>{ if(m===11){setCurrentYear(y=>y+1);return 0;} return m+1; }); setDayModal(null); };
    const goToday   = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setDayModal(null); };

    // ── Build grid ────────────────────────────────────────────────────
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay    = getFirstDayMon(currentYear, currentMonth); // 0=Mon

    const rows = [];
    let cells  = [];

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
        cells.push(
            <td key={`e${i}`} style={emptyCell}></td>
        );
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr   = toDateStr(currentYear, currentMonth, d);
        const dayEvents = getEventsForDay(dateStr);
        const isToday   = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        const isSun     = (firstDay + d - 1) % 7 === 6; // Sunday column

        cells.push(
            <td key={d}
                onClick={() => {
                    if (dayEvents.length > 0) {
                        setDayModal({ dateStr, events: dayEvents });
                    } else if (isMarketingHr) {
                        setEditEvent({ start_date: dateStr, end_date: dateStr });
                        setShowForm(true);
                    }
                }}
                style={{
                    ...dayCell,
                    cursor: dayEvents.length > 0 || isMarketingHr ? 'pointer' : 'default',
                    background: '#fff',
                }}
                onMouseEnter={e => { if(!isToday) e.currentTarget.style.background='#f8f9fa'; }}
                onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
            >
                {/* Day number */}
                <div style={{ display:'flex', alignItems:'center', marginBottom:2, gap:3 }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: '50%', fontSize: 12,
                        fontWeight: isToday ? 700 : 400,
                        background: isToday ? '#1a73e8' : 'transparent',
                        color: isToday ? '#fff' : isSun ? '#d93025' : '#3c4043',
                        transition: 'background .1s',
                    }}>{d}</span>
                </div>
                {/* Event bars — up to 3 then "+N more" */}
                {dayEvents.slice(0, 3).map(ev => (
                    <EventBar key={ev.id} event={ev} onClick={(ev) => { setDetailEvent(ev); setDayModal(null); }} />
                ))}
                {dayEvents.length > 3 && (
                    <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 2, paddingLeft: 2 }}>
                        +{dayEvents.length - 3} more
                    </div>
                )}
            </td>
        );

        if (cells.length % 7 === 0 || d === daysInMonth) {
            if (d === daysInMonth && cells.length % 7 !== 0) {
                const rem = 7 - (cells.length % 7);
                for (let p = 0; p < rem; p++) {
                    cells.push(<td key={`p${p}`} style={emptyCell}></td>);
                }
            }
            rows.push(<tr key={`r${d}`}>{cells}</tr>);
            cells = [];
        }
    }

    const TABS = [
        { key:'all', label:'All events' },
        { key:'shared', label:'Shared' },
        { key:'public', label:'Public' },
        { key:'archived', label:'Archived' },
    ];

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#fff', fontFamily:"'Google Sans', Roboto, sans-serif" }}>

            {/* ── TOP HEADER ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px 0 20px',
                borderBottom: '1px solid #e0e0e0',
            }}>
                {/* Left: title + tabs */}
                <div>
                    <div style={{ fontWeight: 700, fontSize: 22, color: '#202124', marginBottom: 8, letterSpacing: '-.01em' }}>
                        Calendar
                    </div>
                    <div style={{ display: 'flex', gap: 0 }}>
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '6px 16px',
                                fontSize: 13, fontWeight: 500,
                                color: activeTab === t.key ? '#1a73e8' : '#5f6368',
                                borderBottom: activeTab === t.key ? '2px solid #1a73e8' : '2px solid transparent',
                                transition: 'color .15s, border-color .15s',
                                marginBottom: -1,
                            }}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: search */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#f1f3f4', borderRadius: 24, padding: '7px 16px',
                    width: 240,
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                        placeholder="Search"
                        style={{ background:'none', border:'none', outline:'none', fontSize:13, color:'#202124', width:'100%' }}
                    />
                    <kbd style={{ fontSize:10, color:'#9aa0a6', background:'none', border:'none' }}>⌘K</kbd>
                </div>
            </div>

            {/* ── BODY: left panel + calendar ── */}
            <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

                {/* Left panel */}
                <LeftPanel currentYear={currentYear} currentMonth={currentMonth} today={today} events={events} />

                {/* Calendar area */}
                <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

                    {/* Calendar nav bar */}
                    <div style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'12px 20px', borderBottom:'1px solid #e0e0e0', flexShrink:0,
                    }}>
                        {/* Nav arrows + today */}
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <button onClick={prevMonth} style={navArrowStyle}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button onClick={goToday} style={{
                                ...ghostBtnStyle, padding:'5px 14px', fontSize:13,
                                borderRadius: 20, fontWeight: 500,
                            }}>Today</button>
                            <button onClick={nextMonth} style={navArrowStyle}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>

                        {/* Right controls */}
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {currentUser && !isMarketingHr && (
                                <span style={{ fontSize:11, color:'#9aa0a6', background:'#f1f3f4', borderRadius:12, padding:'3px 10px' }}>View only</span>
                            )}
                            {/* Month view selector */}
                            <div style={{
                                display:'flex', alignItems:'center', gap:4,
                                border:'1px solid #dadce0', borderRadius:20, padding:'5px 12px',
                                fontSize:13, color:'#3c4043', cursor:'pointer', userSelect:'none',
                            }}>
                                {viewMode}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2" style={{marginLeft:2}}>
                                    <path d="m6 9 6 6 6-6"/>
                                </svg>
                            </div>
                            {/* Add event */}
                            {isMarketingHr && (
                                <button onClick={()=>{ setEditEvent({}); setShowForm(true); }} style={{
                                    ...primaryBtnStyle,
                                    display:'flex', alignItems:'center', gap:6,
                                    borderRadius: 20, padding:'7px 18px',
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                    Add event
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info alert for non-MarketingHr */}
                    {currentUser && !isMarketingHr && (
                        <div style={{ margin:'0 20px', padding:'6px 14px', background:'#e8f0fe', borderRadius:8, fontSize:12, color:'#1967d2', marginTop:8 }}>
                            You're in <strong>view-only mode</strong>. Only Marketing & HR staff can create or edit events.
                        </div>
                    )}

                    {/* Calendar grid */}
                    <div style={{ flex:1, overflowY:'auto', padding:'0 0 12px 0' }}>
                        <table style={{
                            width:'100%', borderCollapse:'collapse',
                            tableLayout:'fixed', minWidth:600,
                        }}>
                            <thead>
                                <tr>
                                    {DAYS_OF_WEEK_MON.map((d,i) => (
                                        <th key={d} style={{
                                            padding:'8px 4px', textAlign:'center',
                                            fontSize:11, fontWeight:600, letterSpacing:'.06em',
                                            color: i === 6 ? '#d93025' : '#9aa0a6',
                                            textTransform:'uppercase',
                                            borderBottom:'1px solid #e0e0e0',
                                            position:'sticky', top:0, background:'#fff', zIndex:2,
                                        }}>{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── MODALS ── */}
            {dayModal && !detailEvent && !showForm && (
                <DayEventsModal
                    dateStr={dayModal.dateStr}
                    events={dayModal.events}
                    employees={employees}
                    canEdit={isMarketingHr}
                    onSelectEvent={(ev)=>{ setDetailEvent(ev); setDayModal(null); }}
                    onClose={()=>setDayModal(null)}
                />
            )}
            {detailEvent && !showForm && (
                <EventDetailModal
                    event={detailEvent}
                    employees={employees}
                    canEdit={isMarketingHr}
                    onEdit={()=>{ setEditEvent(detailEvent); setDetailEvent(null); setShowForm(true); }}
                    onClose={()=>{ setDetailEvent(null); setDayModal(null); }}
                />
            )}
            {showForm && isMarketingHr && (
                <EventFormModal
                    event={editEvent}
                    employees={employees}
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                    onClose={()=>{ setShowForm(false); setEditEvent(null); }}
                />
            )}
        </div>
    );
}

// ── Cell styles ──────────────────────────────────────────────────────
const dayCell = {
    verticalAlign:'top', padding:'4px 6px',
    minHeight:90, height:90,
    borderBottom:'1px solid #e0e0e0', borderRight:'1px solid #e0e0e0',
    transition:'background .1s',
};
const emptyCell = {
    background:'#fafafa', borderBottom:'1px solid #e0e0e0', borderRight:'1px solid #e0e0e0',
};
const navArrowStyle = {
    background:'none', border:'none', cursor:'pointer',
    color:'#5f6368', borderRadius:'50%',
    width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
    transition:'background .1s',
};

// ====================================================================
// MOUNT
// ====================================================================
const rootElement = document.getElementById('calendarRoot');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Calendar />);
}