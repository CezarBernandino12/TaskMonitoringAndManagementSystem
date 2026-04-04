const { useState, useEffect, useRef } = React;

// ====================================================================
// CONSTANTS
// ====================================================================
const DAY_ABBR    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

const STATUS_CFG = {
    Upcoming:  { bg:'#FDECEA', text:'#C0392B', badge:'#E74C3C', icon:'📋', filter:'#FF8A80' },
    Ongoing:   { bg:'#EAF7EC', text:'#1E8449', badge:'#27AE60', icon:'↗',  filter:'#69F0AE' },
    Completed: { bg:'#EEE8F8', text:'#5B2C9B', badge:'#7D3C98', icon:'✓',  filter:'#CE93D8' },
    Cancelled: { bg:'#FEF9E7', text:'#B7770D', badge:'#F39C12', icon:'🔔', filter:'#FFD54F' },
};
const PRIORITY_COLORS = { High:'#E74C3C', Medium:'#F39C12', Low:'#27AE60' };

// ====================================================================
// HELPERS
// ====================================================================
function getDaysInMonth(y,m)  { return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m)     { return new Date(y,m,1).getDay(); }
function toDateStr(y,m,d)     { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function fmtShort(s)          { if(!s)return'—'; const[y,mo,d]=s.split('-'); return `${MONTH_NAMES[+mo-1].slice(0,3)} ${+d}, ${y}`; }
function fmtLong(s)           { if(!s)return'—'; const[y,mo,d]=s.split('-'); return `${MONTH_NAMES[+mo-1]} ${+d}, ${y}`; }

// ====================================================================
// EVENT FORM MODAL
// ====================================================================
function EventFormModal({ event, employees, onSave, onDelete, onClose }) {
    const isEdit = !!event?.id;
    const blank  = { title:'', description:'', location:'', start_date:'', end_date:'', status:'Upcoming', priority:'Medium', tagged_employees:[] };
    const [form,   setForm]   = useState(event ? {...event, tagged_employees:event.tagged_employees??[]} : blank);
    const [saving, setSaving] = useState(false);
    const [deling, setDeling] = useState(false);
    const [error,  setError]  = useState(null);
    const [empQ,   setEmpQ]   = useState('');

    const set = (k,v) => setForm(f=>({...f,[k]:v}));
    const toggleEmp = id => set('tagged_employees',
        form.tagged_employees.includes(id)
            ? form.tagged_employees.filter(e=>e!==id)
            : [...form.tagged_employees,id]);

    const filtered = employees.filter(e=>`${e.name} ${e.department}`.toLowerCase().includes(empQ.toLowerCase()));

    const save = () => {
        if(!form.title.trim())             { setError('Title is required.'); return; }
        if(!form.start_date)               { setError('Start date is required.'); return; }
        if(!form.end_date)                 { setError('End date is required.'); return; }
        if(form.end_date<form.start_date)  { setError('End must be on or after start.'); return; }
        setSaving(true); setError(null);
        fetch('php/save_event.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
            .then(r=>r.json()).then(d=>{ if(d.error)throw new Error(d.error); onSave(d.event); })
            .catch(e=>{ setError(e.message); setSaving(false); });
    };

    const del = () => {
        if(!window.confirm('Delete this event?')) return;
        setDeling(true);
        fetch('php/delete_event.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.id})})
            .then(r=>r.json()).then(d=>{ if(d.error)throw new Error(d.error); onDelete(form.id); })
            .catch(e=>{ setError(e.message); setDeling(false); });
    };

    const cfg = STATUS_CFG[form.status] ?? STATUS_CFG.Upcoming;

    return (
        <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={S.backdrop}>
            <div style={{...S.modal,maxWidth:560}}>
                <div style={{...S.mHead,background:cfg.bg,borderBottom:`2px solid ${cfg.badge}33`}}>
                    <span style={{fontWeight:700,fontSize:15,color:cfg.text}}>{isEdit?'Edit Event':'New Event'}</span>
                    <button className="btn-close" onClick={onClose} style={{fontSize:11}}/>
                </div>
                <div style={S.mBody}>
                    {error && <div style={S.errBox}>{error}</div>}
                    <Fg label="Title *"><input style={S.inp} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Event title"/></Fg>
                    <Fg label="Description"><textarea style={{...S.inp,resize:'vertical'}} rows={3} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Optional details…"/></Fg>
                    <Fg label="Location"><input style={S.inp} value={form.location} onChange={e=>set('location',e.target.value)} placeholder="Venue or link"/></Fg>
                    <div style={{display:'flex',gap:12}}>
                        <Fg label="Start Date *" style={{flex:1}}><input type="date" style={S.inp} value={form.start_date} onChange={e=>set('start_date',e.target.value)}/></Fg>
                        <Fg label="End Date *"   style={{flex:1}}><input type="date" style={S.inp} value={form.end_date}   onChange={e=>set('end_date',  e.target.value)}/></Fg>
                    </div>
                    <div style={{display:'flex',gap:12}}>
                        <Fg label="Status" style={{flex:1}}>
                            <select style={S.inp} value={form.status} onChange={e=>set('status',e.target.value)}>
                                {Object.keys(STATUS_CFG).map(s=><option key={s}>{s}</option>)}
                            </select>
                        </Fg>
                        <Fg label="Priority" style={{flex:1}}>
                            <select style={S.inp} value={form.priority} onChange={e=>set('priority',e.target.value)}>
                                <option>High</option><option>Medium</option><option>Low</option>
                            </select>
                        </Fg>
                    </div>
                    <Fg label="Tag Employees">
                        <input style={{...S.inp,marginBottom:6}} placeholder="Search…" value={empQ} onChange={e=>setEmpQ(e.target.value)}/>
                        <div style={{maxHeight:148,overflowY:'auto',border:'1px solid #EBEBEB',borderRadius:8,padding:'4px 8px'}}>
                            {filtered.length===0
                                ? <div style={{color:'#aaa',fontSize:12,padding:'6px 0',textAlign:'center'}}>No employees found.</div>
                                : filtered.map(emp=>{
                                    const chk=form.tagged_employees.includes(emp.id);
                                    return (
                                        <div key={emp.id} onClick={()=>toggleEmp(emp.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 4px',borderRadius:6,cursor:'pointer',background:chk?cfg.bg:'transparent'}}>
                                            <input type="checkbox" readOnly checked={chk} style={{pointerEvents:'none',accentColor:cfg.badge}}/>
                                            <span style={{fontSize:13}}><strong>{emp.name}</strong> <span style={{color:'#aaa'}}>— {emp.department}</span></span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        {form.tagged_employees.length>0&&(
                            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                                {form.tagged_employees.map(id=>{
                                    const emp=employees.find(e=>e.id===id);
                                    return emp?(
                                        <span key={id} style={{background:cfg.bg,color:cfg.text,border:`1px solid ${cfg.badge}44`,borderRadius:20,fontSize:11,padding:'2px 10px'}}>
                                            {emp.name} <span onClick={()=>toggleEmp(id)} style={{marginLeft:4,cursor:'pointer',opacity:.7}}>✕</span>
                                        </span>
                                    ):null;
                                })}
                            </div>
                        )}
                    </Fg>
                </div>
                <div style={S.mFoot}>
                    <div>{isEdit&&<button onClick={del} disabled={deling} style={S.btnDanger}>{deling?'Deleting…':'Delete'}</button>}</div>
                    <div style={{display:'flex',gap:8}}>
                        <button onClick={onClose} style={S.btnGhost}>Cancel</button>
                        <button onClick={save} disabled={saving} style={{...S.btnPrimary,background:cfg.badge}}>{saving?'Saving…':isEdit?'Save Changes':'Create Event'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
function Fg({ label, children, style }) {
    return (
        <div style={{marginBottom:14,...style}}>
            <div style={{fontSize:11,fontWeight:600,color:'#999',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{label}</div>
            {children}
        </div>
    );
}

// ====================================================================
// EVENT DETAIL MODAL
// ====================================================================
function EventDetailModal({ event, employees, canEdit, onEdit, onClose }) {
    const cfg    = STATUS_CFG[event.status] ?? STATUS_CFG.Upcoming;
    const pColor = PRIORITY_COLORS[event.priority] ?? '#888';
    const tagged = (event.tagged_employees??[]).map(id=>employees.find(e=>e.id===id)).filter(Boolean);
    return (
        <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={S.backdrop}>
            <div style={{...S.modal,maxWidth:440,overflow:'hidden'}}>
                <div style={{background:cfg.bg,padding:'1.125rem 1.5rem',borderBottom:`2px solid ${cfg.badge}33`,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                        <div style={{fontWeight:700,fontSize:16,color:cfg.text}}>{event.title}</div>
                        <div style={{fontSize:12,color:'#999',marginTop:2}}>{fmtShort(event.start_date)} – {fmtShort(event.end_date)}</div>
                    </div>
                    <button className="btn-close" onClick={onClose} style={{fontSize:11}}/>
                </div>
                <div style={{padding:'1.125rem 1.5rem'}}>
                    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                        <span style={{...S.chip,background:cfg.bg,color:cfg.text,border:`1px solid ${cfg.badge}33`}}>{cfg.icon} {event.status}</span>
                        <span style={{...S.chip,color:pColor,border:`1px solid ${pColor}44`}}>● {event.priority}</span>
                    </div>
                    {event.description&&<p style={{fontSize:13,color:'#555',marginBottom:10}}>{event.description}</p>}
                    {event.location&&<div style={{fontSize:13,color:'#666',marginBottom:10}}>📍 {event.location}</div>}
                    {tagged.length>0&&(
                        <div style={{marginTop:8}}>
                            <div style={{fontSize:11,fontWeight:600,color:'#bbb',marginBottom:6,textTransform:'uppercase',letterSpacing:'.05em'}}>Tagged</div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                                {tagged.map(emp=>(
                                    <span key={emp.id} style={{fontSize:12,background:'#F5F5F5',borderRadius:20,padding:'2px 10px',color:'#444'}}>
                                        {emp.name} <span style={{color:'#aaa'}}>· {emp.department}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{...S.mFoot,justifyContent:'flex-end',gap:8}}>
                    {canEdit&&<button onClick={onEdit} style={S.btnGhost}>Edit Event</button>}
                    <button onClick={onClose} style={{...S.btnPrimary,background:cfg.badge}}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// DAY EVENTS MODAL
// ====================================================================
function DayEventsModal({ dateStr, events, onSelectEvent, onClose }) {
    return (
        <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={S.backdrop}>
            <div style={{...S.modal,maxWidth:360}}>
                <div style={S.mHead}>
                    <span style={{fontWeight:700,fontSize:14,color:'#222'}}>{fmtLong(dateStr)}</span>
                    <button className="btn-close" onClick={onClose} style={{fontSize:11}}/>
                </div>
                <div style={{padding:'0.75rem 1rem',maxHeight:'60vh',overflowY:'auto'}}>
                    {events.map(ev=>{
                        const cfg=STATUS_CFG[ev.status]??STATUS_CFG.Upcoming;
                        return (
                            <div key={ev.id} onClick={()=>onSelectEvent(ev)} style={{
                                display:'flex',alignItems:'center',gap:10,padding:'9px 10px',
                                borderRadius:10,cursor:'pointer',marginBottom:4,border:'1px solid #F0F0F0',
                            }}
                            onMouseEnter={e=>e.currentTarget.style.background=cfg.bg}
                            onMouseLeave={e=>e.currentTarget.style.background=''}
                            >
                                <div style={{width:9,height:9,borderRadius:'50%',background:cfg.badge,flexShrink:0}}/>
                                <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontWeight:600,fontSize:13,color:'#222'}}>{ev.title}</div>
                                    <div style={{fontSize:11,color:'#bbb'}}>{fmtShort(ev.start_date)} – {fmtShort(ev.end_date)}</div>
                                </div>
                                <span style={{...S.chip,background:cfg.bg,color:cfg.text,fontSize:10}}>{ev.status}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// FILTER SIDEBAR
// ====================================================================
function FilterSidebar({ activeFilters, onToggle }) {
    return (
        <div style={{
            width:155,flexShrink:0,background:'#fff',
            border:'1px solid #EBEBEB',borderRadius:14,
            padding:'16px 14px',alignSelf:'flex-start',
        }}>
            <div style={{fontWeight:700,fontSize:13,color:'#111',marginBottom:14}}>Filters</div>
            {Object.entries(STATUS_CFG).map(([status,cfg])=>{
                const active=activeFilters.includes(status);
                return (
                    <div key={status} onClick={()=>onToggle(status)} style={{
                        display:'flex',alignItems:'center',gap:9,
                        marginBottom:12,cursor:'pointer',userSelect:'none',
                    }}>
                        <div style={{
                            width:18,height:18,borderRadius:5,flexShrink:0,
                            background:active?cfg.filter:'#F0F0F0',
                            border:`1.5px solid ${active?cfg.filter:'#DDD'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            transition:'all .15s',
                        }}>
                            {active&&<span style={{color:'#fff',fontSize:11,fontWeight:900,lineHeight:1}}>✓</span>}
                        </div>
                        <span style={{fontSize:12.5,color:active?'#222':'#BBB',fontWeight:active?500:400,transition:'color .15s'}}>
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
    const cfg    = STATUS_CFG[event.status] ?? STATUS_CFG.Upcoming;
    const tagged = (event.tagged_employees??[]).map(id=>employees.find(e=>e.id===id)).filter(Boolean);
    return (
        <div onClick={e=>{ e.stopPropagation(); onClick(event); }} style={{
            background:cfg.bg,border:`1px solid ${cfg.badge}22`,
            borderRadius:7,padding:'4px 7px',marginTop:3,cursor:'pointer',
            transition:'opacity .12s',
        }}
        onMouseEnter={e=>e.currentTarget.style.opacity='.82'}
        onMouseLeave={e=>e.currentTarget.style.opacity='1'}
        >
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4}}>
                <div style={{display:'flex',alignItems:'center',gap:4,minWidth:0,flex:1}}>
                    <span style={{fontSize:10,flexShrink:0}}>{cfg.icon}</span>
                    <span style={{fontSize:10.5,fontWeight:600,color:cfg.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {event.title}
                    </span>
                </div>
                <div style={{
                    background:cfg.badge,color:'#fff',borderRadius:10,
                    minWidth:17,height:17,display:'flex',alignItems:'center',
                    justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0,padding:'0 4px',
                }}>
                    ●
                </div>
            </div>
            {tagged.length>0&&(
                <div style={{fontSize:9.5,color:cfg.text,opacity:.72,marginTop:1.5,paddingLeft:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    ↗ {tagged[0].name}{tagged.length>1?` +${tagged.length-1}`:''}
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
    const [month,  setMonth]  = useState(today.getMonth());
    const [year,   setYear]   = useState(today.getFullYear());
    const [view,   setView]   = useState('Month');
    const [filters,setFilters]= useState(Object.keys(STATUS_CFG));

    const [events,      setEvents]    = useState([]);
    const [employees,   setEmployees] = useState([]);
    const [currentUser, setUser]      = useState(null);

    const [dayModal,    setDayModal]  = useState(null);
    const [detailEvent, setDetail]    = useState(null);
    const [editEvent,   setEdit]      = useState(null);
    const [showForm,    setShowForm]  = useState(false);

    const isEditor = currentUser?.department?.toLowerCase()==='marketing'
                  || currentUser?.department?.toLowerCase()==='human resources';

    useEffect(()=>{
        fetch('php/get_current_user.php').then(r=>r.json()).then(d=>{ if(!d.error)setUser(d); }).catch(()=>{});
        fetch('php/get_employees.php').then(r=>r.json()).then(d=>setEmployees(Array.isArray(d)?d:[])).catch(()=>{});
    },[]);

    useEffect(()=>{
        if(!currentUser) return;
        const url=isEditor?'php/get_events.php':`php/get_events.php?user_id=${currentUser.id}`;
        fetch(url).then(r=>r.json()).then(d=>setEvents(Array.isArray(d)?d:[])).catch(()=>{});
    },[currentUser]);

    const toggleFilter = s => setFilters(f=>f.includes(s)?f.filter(x=>x!==s):[...f,s]);

    const getDay = dateStr =>
        events.filter(ev=>ev.start_date<=dateStr&&ev.end_date>=dateStr&&filters.includes(ev.status));

    const handleSave = saved => {
        setEvents(p=>{ const i=p.findIndex(e=>e.id===saved.id); return i>=0?p.map(e=>e.id===saved.id?saved:e):[...p,saved]; });
        setShowForm(false); setEdit(null);
    };
    const handleDel = id => {
        setEvents(p=>p.filter(e=>e.id!==id));
        setShowForm(false); setEdit(null);
    };

    const prev = () => { setMonth(m=>{ if(m===0){setYear(y=>y-1);return 11;} return m-1; }); setDayModal(null); };
    const next = () => { setMonth(m=>{ if(m===11){setYear(y=>y+1);return 0;} return m+1; }); setDayModal(null); };

    // ── Grid ─────────────────────────────────────────────────────────
    const dim      = getDaysInMonth(year,month);
    const firstDay = getFirstDay(year,month); // 0=Sun
    let   cellArr  = [];
    const rows     = [];

    for(let i=0;i<firstDay;i++) cellArr.push(<td key={`e${i}`} style={G.empty}/>);

    for(let d=1;d<=dim;d++){
        const dateStr    = toDateStr(year,month,d);
        const dayEvs     = getDay(dateStr);
        const colIndex   = (firstDay+d-1)%7;
        const isToday    = d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
        const isSun      = colIndex===0;
        const isFirstRow = d <= 7-firstDay;
        const dayName    = DAY_ABBR[colIndex];

        cellArr.push(
            <td key={d}
                onClick={()=>{
                    if(dayEvs.length>0) setDayModal({dateStr,events:dayEvs});
                    else if(isEditor){ setEdit({start_date:dateStr,end_date:dateStr}); setShowForm(true); }
                }}
                style={{...G.cell,cursor:dayEvs.length>0||isEditor?'pointer':'default'}}
                onMouseEnter={e=>{ if(!isToday)e.currentTarget.style.background='#FAFAFA'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='#fff'; }}
            >
                {/* Date number + day abbr on first row */}
                <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                    <span style={{
                        display:'inline-flex',alignItems:'center',justifyContent:'center',
                        width:24,height:24,borderRadius:'50%',
                        fontSize:12,fontWeight:isToday?700:500,
                        background:isToday?'#111':'transparent',
                        color:isToday?'#fff':isSun?'#E53935':'#222',
                        flexShrink:0,
                    }}>{d}</span>
                    {isFirstRow&&<span style={{fontSize:10,color:'#CCCCCC',fontWeight:500}}>{dayName}</span>}
                </div>
                {dayEvs.slice(0,3).map(ev=>(
                    <EventCard key={ev.id} event={ev} employees={employees}
                        onClick={ev=>{ setDetail(ev); setDayModal(null); }}/>
                ))}
                {dayEvs.length>3&&(
                    <div style={{fontSize:9.5,color:'#BBB',marginTop:3,paddingLeft:2}}>+{dayEvs.length-3} more</div>
                )}
            </td>
        );

        if(cellArr.length%7===0||d===dim){
            if(d===dim&&cellArr.length%7!==0){
                const rem=7-(cellArr.length%7);
                for(let p=0;p<rem;p++) cellArr.push(<td key={`p${p}`} style={G.empty}/>);
            }
            rows.push(<tr key={`r${d}`}>{cellArr}</tr>);
            cellArr=[];
        }
    }

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div style={{padding:'20px 24px',background:'#F7F8FA',minHeight:'100%',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",boxSizing:'border-box'}}>

            {/* TOP BAR */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <div style={{fontSize:28,fontWeight:800,color:'#111',letterSpacing:'-.02em'}}>Calendar</div>

                {/* Day / Week / Month toggle */}
                <div style={{display:'flex',background:'#EFEFEF',borderRadius:10,padding:3,gap:2}}>
                    {['Day','Week','Month'].map(v=>(
                        <button key={v} onClick={()=>setView(v)} style={{
                            background:view===v?'#111':'transparent',
                            color:view===v?'#fff':'#666',border:'none',
                            borderRadius:8,padding:'6px 20px',fontSize:13,fontWeight:600,cursor:'pointer',
                            transition:'all .15s',
                        }}>{v}</button>
                    ))}
                </div>

                {/* Add Event */}
                {isEditor?(
                    <button onClick={()=>{ setEdit({}); setShowForm(true); }} style={{
                        background:'#FF6B4E',color:'#fff',border:'none',borderRadius:10,
                        padding:'9px 22px',fontSize:13,fontWeight:700,cursor:'pointer',
                        display:'flex',alignItems:'center',gap:6,
                        boxShadow:'0 2px 10px rgba(255,107,78,.35)',transition:'opacity .15s',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.opacity='.88'}
                    onMouseLeave={e=>e.currentTarget.style.opacity='1'}
                    >+ Add Event</button>
                ):(
                    <span style={{fontSize:11,background:'#EEE',borderRadius:8,padding:'7px 14px',color:'#999',fontWeight:500}}>View Only</span>
                )}
            </div>

            {/* BODY */}
            <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>

                {/* Filter sidebar */}
                <FilterSidebar activeFilters={filters} onToggle={toggleFilter}/>

                {/* Calendar card */}
                <div style={{flex:1,minWidth:0,background:'#fff',border:'1px solid #EBEBEB',borderRadius:14,overflow:'hidden'}}>

                    {/* Calendar header */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #F0F0F0'}}>
                        <span style={{fontWeight:700,fontSize:17,color:'#111'}}>{MONTH_NAMES[month]} {year}</span>
                        <div style={{display:'flex',gap:6}}>
                            <button onClick={prev} style={G.navBtn}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button onClick={next} style={G.navBtn}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>
                    </div>

                    {currentUser&&!isEditor&&(
                        <div style={{margin:'10px 16px 0',padding:'6px 12px',background:'#FEF9E7',borderRadius:8,fontSize:12,color:'#B7770D',fontWeight:500}}>
                            View-only mode — Marketing & HR staff can create events.
                        </div>
                    )}

                    {/* Grid */}
                    <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',minWidth:520}}>
                            <tbody>{rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {dayModal&&!detailEvent&&!showForm&&(
                <DayEventsModal
                    dateStr={dayModal.dateStr} events={dayModal.events}
                    onSelectEvent={ev=>{ setDetail(ev); setDayModal(null); }}
                    onClose={()=>setDayModal(null)}
                />
            )}
            {detailEvent&&!showForm&&(
                <EventDetailModal
                    event={detailEvent} employees={employees} canEdit={isEditor}
                    onEdit={()=>{ setEdit(detailEvent); setDetail(null); setShowForm(true); }}
                    onClose={()=>{ setDetail(null); setDayModal(null); }}
                />
            )}
            {showForm&&isEditor&&(
                <EventFormModal
                    event={editEvent} employees={employees}
                    onSave={handleSave} onDelete={handleDel}
                    onClose={()=>{ setShowForm(false); setEdit(null); }}
                />
            )}
        </div>
    );
}

// ── Grid cell styles ──────────────────────────────────────────────────
const G = {
    cell: {
        verticalAlign:'top',padding:'6px 8px',
        borderBottom:'1px solid #F0F0F0',borderRight:'1px solid #F0F0F0',
        background:'#fff',minHeight:100,height:100,transition:'background .1s',
    },
    empty: {
        borderBottom:'1px solid #F0F0F0',borderRight:'1px solid #F0F0F0',
        background:'#FAFAFA',minHeight:100,height:100,
    },
    navBtn: {
        background:'#F5F5F5',border:'1px solid #E8E8E8',borderRadius:8,
        width:30,height:30,display:'inline-flex',alignItems:'center',
        justifyContent:'center',cursor:'pointer',color:'#555',
    },
};

// ── Shared style tokens ───────────────────────────────────────────────
const S = {
    backdrop: { position:'fixed',inset:0,background:'rgba(0,0,0,0.44)',zIndex:1060,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' },
    modal:    { background:'#fff',borderRadius:16,width:'100%',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.18)' },
    mHead:    { padding:'1rem 1.5rem',borderBottom:'1px solid #F0F0F0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 },
    mBody:    { overflowY:'auto',padding:'1.125rem 1.5rem',flex:1 },
    mFoot:    { padding:'0.75rem 1.5rem',borderTop:'1px solid #F0F0F0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 },
    inp:      { width:'100%',padding:'8px 11px',border:'1px solid #EBEBEB',borderRadius:8,fontSize:13,color:'#222',outline:'none',boxSizing:'border-box',fontFamily:'inherit',background:'#fff' },
    chip:     { display:'inline-flex',alignItems:'center',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:500 },
    btnPrimary:{ background:'#FF6B4E',color:'#fff',border:'none',borderRadius:20,padding:'7px 18px',fontSize:13,fontWeight:600,cursor:'pointer' },
    btnGhost:  { background:'#fff',color:'#555',border:'1px solid #E0E0E0',borderRadius:20,padding:'7px 18px',fontSize:13,fontWeight:500,cursor:'pointer' },
    btnDanger: { background:'#fff',color:'#E74C3C',border:'1px solid #E74C3C44',borderRadius:20,padding:'7px 18px',fontSize:13,fontWeight:500,cursor:'pointer' },
    errBox:    { background:'#FDECEA',border:'1px solid #F5C6C4',color:'#C0392B',borderRadius:8,padding:'8px 12px',fontSize:13,marginBottom:12 },
};

// ====================================================================
// MOUNT
// ====================================================================
const rootElement = document.getElementById('calendarRoot');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Calendar />);
}