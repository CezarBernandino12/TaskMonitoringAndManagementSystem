// ====================================================================
// activity-logs.jsx  –  Admin: Activity Logs page
// Reuses the same helper components (Avatar, Spinner, Toast) used
// across all other admin pages (users.jsx pattern).
// ====================================================================
const { useState, useEffect, useCallback, useRef } = React;

// ---- Action → colour / icon meta -----------------------------------
const ACTION_META = {
    // User management
    'user.created':         { color: '#16a34a', bg: '#dcfce7', icon: 'bi-person-plus',       label: 'User Created' },
    'user.updated':         { color: '#0369a1', bg: '#e0f2fe', icon: 'bi-person-gear',       label: 'User Updated' },
    'user.deleted':         { color: '#dc2626', bg: '#fee2e2', icon: 'bi-person-x',          label: 'User Deleted' },
    'user.activated':       { color: '#16a34a', bg: '#dcfce7', icon: 'bi-person-check',      label: 'User Activated' },
    'user.deactivated':     { color: '#b45309', bg: '#fef3c7', icon: 'bi-person-dash',       label: 'User Deactivated' },
    'user.role_changed':    { color: '#7c3aed', bg: '#f3f0ff', icon: 'bi-shield-check',      label: 'Role Changed' },
    // Department management
    'department.created':   { color: '#16a34a', bg: '#dcfce7', icon: 'bi-diagram-3',         label: 'Dept Created' },
    'department.updated':   { color: '#0369a1', bg: '#e0f2fe', icon: 'bi-diagram-3-fill',    label: 'Dept Updated' },
    'department.deleted':   { color: '#dc2626', bg: '#fee2e2', icon: 'bi-trash3',            label: 'Dept Deleted' },
    // Auth
    'auth.login':           { color: '#0369a1', bg: '#e0f2fe', icon: 'bi-box-arrow-in-right',label: 'Login' },
    'auth.logout':          { color: '#6b7280', bg: '#f3f4f6', icon: 'bi-box-arrow-right',   label: 'Logout' },
    'auth.login_failed':    { color: '#dc2626', bg: '#fee2e2', icon: 'bi-shield-x',          label: 'Login Failed' },
    'auth.password_changed':{ color: '#7c3aed', bg: '#f3f0ff', icon: 'bi-key',               label: 'Password Changed' },
    // Task management
    'task.created':         { color: '#16a34a', bg: '#dcfce7', icon: 'bi-plus-circle',       label: 'Task Created' },
    'task.updated':         { color: '#0369a1', bg: '#e0f2fe', icon: 'bi-pencil-square',     label: 'Task Updated' },
    'task.deleted':         { color: '#dc2626', bg: '#fee2e2', icon: 'bi-trash3',            label: 'Task Deleted' },
    'task.assigned':        { color: '#0284c7', bg: '#e0f2fe', icon: 'bi-person-lines-fill', label: 'Task Assigned' },
    'task.status_changed':  { color: '#7c3aed', bg: '#f3f0ff', icon: 'bi-arrow-repeat',      label: 'Status Changed' },
    // Reports
    'report.exported':      { color: '#065f46', bg: '#d1fae5', icon: 'bi-file-earmark-arrow-down', label: 'Report Exported' },
};

function getActionMeta(action) {
    return ACTION_META[action] ?? { color: '#6b7280', bg: '#f3f4f6', icon: 'bi-activity', label: action };
}

// ---- Shared UI helpers (mirrors users.jsx) --------------------------
function Avatar({ name, size = 34 }) {
    const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
    const hue = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `hsl(${hue},55%,88%)`, color: `hsl(${hue},55%,35%)`,
            fontWeight: 700, fontSize: size * 0.38, letterSpacing: '-0.02em',
        }}>{initials}</div>
    );
}

function RoleBadge({ role }) {
    const ROLE_META = {
        admin:              { color: '#7c3aed', bg: '#f3f0ff', label: 'Admin' },
        supervisor:         { color: '#0369a1', bg: '#e0f2fe', label: 'Supervisor' },
        staff:              { color: '#065f46', bg: '#d1fae5', label: 'Staff' },
        executive_director: { color: '#9a3412', bg: '#fff7ed', label: 'Exec Director' },
        president:          { color: '#1d4ed8', bg: '#dbeafe', label: 'President' },
    };
    const m = ROLE_META[role] ?? { color: '#555', bg: '#eee', label: role };
    return (
        <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '2px 9px', borderRadius: 20,
            color: m.color, background: m.bg,
            border: `1px solid ${m.color}30`,
        }}>{m.label}</span>
    );
}

function ActionBadge({ action }) {
    const m = getActionMeta(action);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
            padding: '3px 10px', borderRadius: 20,
            color: m.color, background: m.bg,
            border: `1px solid ${m.color}30`,
        }}>
            <i className={`bi ${m.icon}`} style={{ fontSize: 11 }} />
            {m.label}
        </span>
    );
}

function Spinner() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid #e5e7eb', borderTopColor: '#6366f1',
                animation: 'spin 0.7s linear infinite',
            }} />
        </div>
    );
}

function Toast({ toasts, remove }) {
    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: t.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
                    color: t.type === 'error' ? '#991b1b' : '#166534',
                    borderRadius: 10, padding: '10px 14px', fontSize: 13,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    minWidth: 260, maxWidth: 380,
                    animation: 'slideUp 0.2s ease',
                }}>
                    <span style={{ fontSize: 16 }}>{t.type === 'error' ? '⚠' : '✓'}</span>
                    <span style={{ flex: 1 }}>{t.message}</span>
                    <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: 14, padding: 0 }}>✕</button>
                </div>
            ))}
        </div>
    );
}

// ---- Log detail modal -----------------------------------------------
function LogDetailModal({ log, onClose }) {
    if (!log) return null;
    const meta = getActionMeta(log.action);
    const backdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    return (
        <div onClick={backdropClick} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1070,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
            <div style={{
                background: 'var(--bs-body-bg, #fff)', borderRadius: 16, width: '100%', maxWidth: 480,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--bs-border-color, #f3f4f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: meta.bg, color: meta.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        }}>
                            <i className={`bi ${meta.icon}`} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Log Entry #{log.id}</div>
                            <div style={{ fontSize: 12, opacity: 0.5 }}>{log.created_at}</div>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose} />
                </div>

                {/* Body */}
                <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Row label="Action"><ActionBadge action={log.action} /></Row>
                    <Row label="Performed by">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={log.user_name} size={26} />
                            <span style={{ fontWeight: 600 }}>{log.user_name}</span>
                            <RoleBadge role={log.role} />
                        </div>
                    </Row>
                    {log.target_type && (
                        <Row label="Target">
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{log.target_type}</span>
                            {log.target_id && <span style={{ opacity: 0.5, marginLeft: 4 }}>#{log.target_id}</span>}
                        </Row>
                    )}
                    {log.description && (
                        <Row label="Description">
                            <span style={{ lineHeight: 1.6 }}>{log.description}</span>
                        </Row>
                    )}

                </div>
            </div>
        </div>
    );
}

function Row({ label, children }) {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13 }}>
            <div style={{ width: 110, flexShrink: 0, fontWeight: 600, color: '#6b7280', paddingTop: 2 }}>{label}</div>
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
}

// ---- Pagination controls --------------------------------------------
function Pagination({ page, pages, onChange }) {
    if (pages <= 1) return null;
    const range = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
        range.push(i);
    }
    return (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 20 }}>
            <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
            {range[0] > 1 && <><button className="btn btn-sm btn-outline-secondary" onClick={() => onChange(1)}>1</button>{range[0] > 2 && <span style={{ padding: '0 6px', lineHeight: '30px' }}>…</span>}</>}
            {range.map(p => (
                <button key={p} onClick={() => onChange(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}>{p}</button>
            ))}
            {range[range.length - 1] < pages && <>{range[range.length - 1] < pages - 1 && <span style={{ padding: '0 6px', lineHeight: '30px' }}>…</span>}<button className="btn btn-sm btn-outline-secondary" onClick={() => onChange(pages)}>{pages}</button></>}
            <button className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
        </div>
    );
}

// ---- Main page component --------------------------------------------
function ActivityLogsPage() {
    const [logs,       setLogs]       = useState([]);
    const [total,      setTotal]      = useState(0);
    const [page,       setPage]       = useState(1);
    const [pages,      setPages]      = useState(1);
    const [loading,    setLoading]    = useState(true);
    const [actionList, setActionList] = useState([]);
    const [selected,   setSelected]   = useState(null);
    const [toasts,     setToasts]     = useState([]);

    // filters
    const [filters, setFilters] = useState({
        search: '', action: '', date_from: '', date_to: '',
    });
    const [committed, setCommitted] = useState(filters);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    };
    const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));

    const fetchLogs = useCallback((pg, f) => {
        setLoading(true);
        const params = new URLSearchParams({ page: pg, per_page: 25 });
        if (f.search)    params.set('search',    f.search);
        if (f.action)    params.set('action',    f.action);
        if (f.date_from) params.set('date_from', f.date_from);
        if (f.date_to)   params.set('date_to',   f.date_to);

        fetch(`php/get_activity_logs.php?${params}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                setLogs(d.logs ?? []);
                setTotal(d.total ?? 0);
                setPage(d.page ?? 1);
                setPages(d.pages ?? 1);
                setActionList(d.actions ?? []);
            })
            .catch(e => addToast(e.message, 'error'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchLogs(1, committed); }, [committed]);

    const handlePageChange = (pg) => fetchLogs(pg, committed);

    const handleSearch = (e) => {
        e.preventDefault();
        setCommitted({ ...filters });
    };

    const handleReset = () => {
        const blank = { search: '', action: '', date_from: '', date_to: '' };
        setFilters(blank);
        setCommitted(blank);
    };

    const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

    return (
        <div style={{ padding: '1.5rem', maxWidth: 1100 }}>
            {/* ---- Page Header ---- */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h4 style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>Activity Logs</h4>
                    <p style={{ margin: 0, fontSize: 13, opacity: 0.55, marginTop: 2 }}>
                        Complete audit trail — {total.toLocaleString()} record{total !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* ---- Filter Bar ---- */}
            <div style={{
                background: 'var(--bs-body-bg, #fff)',
                border: '1px solid var(--bs-border-color, #e5e7eb)',
                borderRadius: 12, padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                    {/* Search */}
                    <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Search</label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Name or description…"
                            value={filters.search}
                            onChange={e => setFilter('search', e.target.value)}
                        />
                    </div>

                    {/* Action filter */}
                    <div style={{ flex: '1 1 180px', minWidth: 150 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Action</label>
                        <select className="form-select form-select-sm" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
                            <option value="">All actions</option>
                            {actionList.map(a => {
                                const m = getActionMeta(a);
                                return <option key={a} value={a}>{m.label}</option>;
                            })}
                        </select>
                    </div>

                    {/* Date from */}
                    <div style={{ flex: '0 0 150px', minWidth: 130 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>From</label>
                        <input type="date" className="form-control form-control-sm" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
                    </div>

                    {/* Date to */}
                    <div style={{ flex: '0 0 150px', minWidth: 130 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>To</label>
                        <input type="date" className="form-control form-control-sm" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                        <button type="submit" className="btn btn-sm btn-primary" style={{ fontWeight: 600 }}>
                            <i className="bi bi-search me-1" />Filter
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleReset}>
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            {/* ---- Table ---- */}
            <div style={{
                background: 'var(--bs-body-bg, #fff)',
                border: '1px solid var(--bs-border-color, #e5e7eb)',
                borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
                {loading ? <Spinner /> : logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.45 }}>
                        <i className="bi bi-journal-x" style={{ fontSize: 40 }} />
                        <p style={{ marginTop: 10, fontSize: 14 }}>No log entries found.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table table-hover mb-0" style={{ fontSize: 13, minWidth: 700 }}>
                            <thead style={{ background: 'var(--bs-tertiary-bg, #f9fafb)' }}>
                                <tr>
                                    <th style={th}>#</th>
                                    <th style={th}>Performed by</th>
                                    <th style={th}>Action</th>
                                    <th style={th}>Description</th>
                                    <th style={th}>Date & Time</th>
                                    <th style={th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, idx) => (
                                    <tr key={log.id} style={{ verticalAlign: 'middle' }}>
                                        <td style={{ ...td, color: '#9ca3af', fontSize: 11, width: 50 }}>
                                            {(page - 1) * 25 + idx + 1}
                                        </td>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Avatar name={log.user_name} size={30} />
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{log.user_name}</div>
                                                    <RoleBadge role={log.role} />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={td}><ActionBadge action={log.action} /></td>
                                        <td style={{ ...td, maxWidth: 280 }}>
                                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280, opacity: log.description ? 1 : 0.35 }}>
                                                {log.description || '—'}
                                            </span>
                                        </td>
                                        <td style={{ ...td, whiteSpace: 'nowrap', color: '#6b7280', fontSize: 12 }}>{log.created_at}</td>
                                        <td style={td}>
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                style={{ fontSize: 11, padding: '2px 8px' }}
                                                onClick={() => setSelected(log)}
                                                title="View detail"
                                            >
                                                <i className="bi bi-eye" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination page={page} pages={pages} onChange={handlePageChange} />

            {selected && <LogDetailModal log={selected} onClose={() => setSelected(null)} />}
            <Toast toasts={toasts} remove={removeToast} />

            <style>{`
                @keyframes spin     { to { transform: rotate(360deg); } }
                @keyframes slideUp  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
            `}</style>
        </div>
    );
}

const th = {
    padding: '10px 14px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: '#6b7280', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--bs-border-color, #e5e7eb)',
};
const td = { padding: '10px 14px' };

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(<ActivityLogsPage />);
