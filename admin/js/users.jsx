const { useState, useEffect, useRef, useCallback } = React;




function Sidebar() {
    const [showUsers,   setShowUsers]   = useState(false);
    const [showReports, setShowReports] = useState(false);

    const NavGroup = ({ label, open, onToggle, children }) => (
        <>
            <a href="#" className="nav-link fw-semibold d-flex justify-content-between align-items-center"
               onClick={e => { e.preventDefault(); onToggle(); }} style={{ cursor: 'pointer' }}>
                <span>{label}</span>
                <span style={{ fontSize: '1em' }}>{open ? '▼' : '▶'}</span>
            </a>
            {open && <div style={{ marginLeft: 12 }}>{children}</div>}
        </>
    );

    return (
        <nav className="sidebar-orange d-flex flex-column min-vh-100" style={{ minWidth: 0 }}>
            <div className="sidebar-logo">⚙ Admin Panel</div>

            {/* Overview */}
            <div className="sidebar-section">Overview</div>
            <a href="dashboard.html" className="nav-link active">Dashboard</a>

            {/* User Management */}
            <div className="sidebar-section">User Management</div>
            <a href="users.html"  className="nav-link">Manage Users</a>
            <a href="departments.html"  className="nav-link">Departments</a>

              {/* Event Management */}
                <div className="sidebar-section">Event Management</div>
                <a href="calendar.html"    className="nav-link">Calendar</a>

            {/* Reports */}
            <div className="sidebar-section">Reports</div>
            <NavGroup label="Reports" open={showReports} onToggle={() => setShowReports(p => !p)}>
                <a href="daily-reports.html"     className="nav-link">Daily</a>
                <a href="weekly-reports.html"    className="nav-link">Weekly</a>
                <a href="monthly-reports.html"   className="nav-link">Monthly</a>
                <a href="quarterly-reports.html" className="nav-link">Quarterly</a>
                <a href="annual-reports.html"    className="nav-link">Annually</a>
            </NavGroup>

            {/* Account */}
            <div className="sidebar-section">Account</div>
            <a href="profile.html"  className="nav-link">Profile</a>
            <a href="logout.php"    className="nav-link text-danger">Log Out</a>
        </nav>
    );
}

// ====================================================================
// CONSTANTS
// ====================================================================
const ROLES      = ['admin', 'supervisor', 'staff', 'executive_director', 'president'];
const GENDERS    = ['Male', 'Female', 'Rather not say'];
const ROLE_META  = {
    admin:      { color: '#7c3aed', bg: '#f3f0ff', label: 'Admin' },
    supervisor: { color: '#0369a1', bg: '#e0f2fe', label: 'Supervisor' },
    staff:      { color: '#065f46', bg: '#d1fae5', label: 'Staff' },
    executive_director:  { color: '#9a3412', bg: '#fff7ed', label: 'Executive Director' },
    president: { color: '#1d4ed8', bg: '#dbeafe', label: 'President' }
};

// ====================================================================
// HELPERS
// ====================================================================
function RoleBadge({ role }) {
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

function StatusDot({ active }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <span style={{
                width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                background: active ? '#16a34a' : '#dc2626',
                boxShadow: active ? '0 0 0 3px #dcfce7' : '0 0 0 3px #fee2e2',
            }} />
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function Avatar({ name, image, size = 36 }) {
    const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
    const hue      = name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200;
    if (image) return (
        <img src={image} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `hsl(${hue},55%,88%)`, color: `hsl(${hue},55%,35%)`,
            fontWeight: 700, fontSize: size * 0.38, letterSpacing: '-0.02em',
        }}>{initials}</div>
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

// ====================================================================
// CONFIRM DIALOG
// ====================================================================
function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '1.75rem 2rem', maxWidth: 380, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
                <p style={{ margin: '0 0 1.25rem', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button className="btn btn-sm btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-sm btn-danger" onClick={onConfirm}>Yes, proceed</button>
                </div>
            </div>
        </div>
    );
}



// ====================================================================
// FIELD — outside UserFormModal (fixes focus-loss bug)
// ====================================================================
function Field({ label, name, form, errors, set, required, half, children }) {
    return (
        <div style={{ flex: half ? '0 0 calc(50% - 6px)' : '1 1 100%', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
            </label>
            {children ?? (
                <input
                    type="text"
                    className={`form-control form-control-sm ${errors[name] ? 'is-invalid' : ''}`}
                    value={form[name] ?? ''}
                    onChange={e => set(name, e.target.value)}
                />
            )}
            {errors[name] && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors[name]}</div>}
        </div>
    );
}

// ====================================================================
// USER FORM MODAL
// ====================================================================
function UserFormModal({ user, departments, onSave, onClose }) {
    const isEdit = !!user?.id;
    const blank  = {
        name: '', nickname: '',
        email: '', password: '', role: 'staff', contact: '',
        address: '', gender: '', date_of_birth: '', is_active: 1,
        department_id: '', employee_id: '',
    };
    const [form, setForm]     = React.useState(isEdit ? { ...blank, ...user, password: '' } : blank);
    const [saving, setSaving] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const [tab, setTab]       = React.useState('basic');

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => ({ ...e, [k]: null }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim())  e.name  = 'Required';
        if (!form.email.trim()) e.email = 'Required';
        if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
        if (!isEdit && !form.password.trim()) e.password = 'Required for new users';
        if (form.password && form.password.length < 6) e.password = 'Minimum 6 characters';
        if (!form.role) e.role = 'Please select a role';
        return e;
    };

    const handleSave = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); setTab('basic'); return; }
        setSaving(true);
        fetch('php/save_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        .then(r => r.json())
        .then(d => {
            if (d.error) throw new Error(d.error);
            onSave(d.user);
        })
        .catch(err => { setErrors({ _global: err.message }); setSaving(false); });
    };

    const backdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

    const tabs      = [
        { key: 'basic',   label: 'Basic Info' },
        { key: 'contact', label: 'Contact' },
        { key: 'access',  label: 'Role & Access' },
    ];
    const tabOrder      = tabs.map(t => t.key);
    const currentTabIdx = tabOrder.indexOf(tab);
    const isLastTab     = currentTabIdx === tabOrder.length - 1;

    const handleNext = () => setTab(tabOrder[currentTabIdx + 1]);

    // Shared props passed to every Field — avoids repeating form/errors/set
    const fp = { form, errors, set };

    return (
        <div onClick={backdropClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1070, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isEdit && <Avatar name={user.name} image={user.profile_image} size={40} />}
                        <div>
                            <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                                {isEdit ? `Edit — ${user.name}` : 'Add New User'}
                            </h5>
                            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                                {isEdit ? `Employee ID: ${user.employee_id ?? '—'}` : 'Fill in the user details below'}
                            </p>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose} />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', flexShrink: 0, padding: '0 1.5rem' }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            border: 'none', background: 'none', padding: '10px 14px', cursor: 'pointer',
                            fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                            color: tab === t.key ? '#6366f1' : '#6b7280',
                            borderBottom: `2px solid ${tab === t.key ? '#6366f1' : 'transparent'}`,
                            marginBottom: -1, transition: 'all 0.15s',
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>
                    {errors._global && (
                        <div className="alert alert-danger py-2 mb-3" style={{ fontSize: 13 }}>{errors._global}</div>
                    )}

                    {/* TAB: Basic Info */}
                    {tab === 'basic' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <Field label="Full Name" name="name" required {...fp} />
                            <Field label="Nickname" name="nickname" half {...fp} />
                            <Field label="Employee ID" name="employee_id" half {...fp} />
                            <Field label="Gender" name="gender" half {...fp}>
                                <select className="form-select form-select-sm" value={form.gender ?? ''} onChange={e => set('gender', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                                </select>
                            </Field>
                            <Field label="Date of Birth" name="date_of_birth" half {...fp}>
                                <input type="date" className="form-control form-control-sm" value={form.date_of_birth ?? ''} onChange={e => set('date_of_birth', e.target.value)} />
                            </Field>
                        </div>
                    )}

                    {/* TAB: Contact */}
                    {tab === 'contact' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <Field label="Email Address" name="email" required {...fp} />
                            <Field label="Contact Number" name="contact" half {...fp}>
                                <input
                                    type="tel"
                                    className="form-control form-control-sm"
                                    value={form.contact ?? ''}
                                    onChange={e => set('contact', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    placeholder="09XXXXXXXXX"
                                />
                            </Field>
                            <Field label="Address" name="address" {...fp}>
                                <textarea
                                    className="form-control form-control-sm"
                                    rows={3}
                                    value={form.address ?? ''}
                                    onChange={e => set('address', e.target.value)}
                                />
                            </Field>
                        </div>
                    )}

                    {/* TAB: Role & Access */}
                    {tab === 'access' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <Field label="Role" name="role" required half {...fp}>
                                <select className={`form-select form-select-sm ${errors.role ? 'is-invalid' : ''}`} value={form.role} onChange={e => set('role', e.target.value)}>
                                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                </select>
                            </Field>
                            <Field label="Department" name="department_id" half {...fp}>
                                <select className="form-select form-select-sm" value={form.department_id ?? ''} onChange={e => set('department_id', e.target.value)}>
                                    <option value="">— None —</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Status" name="is_active" half {...fp}>
                                <select className="form-select form-select-sm" value={form.is_active} onChange={e => set('is_active', parseInt(e.target.value))}>
                                    <option value={1}>Active</option>
                                    <option value={0}>Inactive</option>
                                </select>
                            </Field>
                            <Field label={isEdit ? 'New Password (leave blank to keep)' : 'Password'} name="password" required={!isEdit} {...fp}>
                                <input
                                    type="password"
                                    className={`form-control form-control-sm ${errors.password ? 'is-invalid' : ''}`}
                                    value={form.password ?? ''}
                                    onChange={e => set('password', e.target.value)}
                                    placeholder={isEdit ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                                    autoComplete="new-password"
                                />
                                {errors.password && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.password}</div>}
                            </Field>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
                    <button className="btn btn-sm btn-light" onClick={onClose}>Cancel</button>
                    {!isLastTab && (
                        <button className="btn btn-sm btn-primary" style={{ background: '#6366f1', border: 'none', fontWeight: 600 }} onClick={handleNext}>
                            Next
                        </button>
                    )}
                    {isLastTab && (
                        <button className="btn btn-sm" style={{ background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600 }} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


// ====================================================================
// USER DETAIL DRAWER — slide-in panel
// ====================================================================
function UserDrawer({ user, departments, onEdit, onToggleStatus, onClose }) {
    const dept = departments.find(d => d.id === user.department_id);
    const Row = ({ label, value }) => (
        <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 130, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, color: '#374151', wordBreak: 'break-word' }}>{value || '—'}</span>
        </div>
    );
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
            <div style={{
                position: 'relative', background: '#fff', width: '100%', maxWidth: 420,
                height: '100%', overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
                display: 'flex', flexDirection: 'column',
                animation: 'slideInRight 0.22s ease',
            }}>
                {/* Top accent */}
                <div style={{ height: 6, background: user.is_active ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#d1d5db', flexShrink: 0 }} />
                {/* Profile header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0 }}>
                    <Avatar name={user.name} image={user.profile_image} size={56} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#111827' }}>
                            {user.name}
                        </h5>
                        {user.nickname && <div style={{ fontSize: 12, color: '#9ca3af' }}>&quot;{user.nickname}&quot;</div>}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <RoleBadge role={user.role} />
                            <StatusDot active={user.is_active} />
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose} />
                </div>
                {/* Details */}
                <div style={{ padding: '1rem 1.5rem', flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Identity</div>
                    <Row label="Employee ID"  value={user.employee_id} />
                    <Row label="Email"        value={user.email} />
                    <Row label="Gender"       value={user.gender} />
                    <Row label="Date of Birth" value={user.date_of_birth ? new Date(user.date_of_birth + 'T00:00:00').toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) : null} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 16 }}>Work</div>
                    <Row label="Department"  value={dept?.name ?? user.department} />
                    <Row label="Role"        value={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : null} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 16 }}>Contact</div>
                    <Row label="Phone"   value={user.contact} />
                    <Row label="Address" value={user.address} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 16 }}>System</div>
                    <Row label="Created"    value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : null} />
                    <Row label="Last Updated" value={user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : null} />
                </div>
                {/* Actions */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                        className="btn btn-sm"
                        style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600 }}
                        onClick={onEdit}
                    >✏ Edit</button>
                    <button
                        className={`btn btn-sm ${user.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        style={{ flex: 1 }}
                        onClick={onToggleStatus}
                    >
                        {user.is_active ? '⊘ Deactivate' : '✓ Activate'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// MAIN PAGE
// ====================================================================
function UserManagementPage() {
    const [users, setUsers]             = React.useState([]);
    const [departments, setDepartments] = React.useState([]);
    const [loading, setLoading]         = React.useState(true);
    const [search, setSearch]           = React.useState('');
    const [filterRole, setFilterRole]   = React.useState('all');
    const [filterDept, setFilterDept]   = React.useState('all');
    const [filterStatus, setFilterStatus] = React.useState('all');
    const [sortKey, setSortKey]         = React.useState('name');
    const [sortDir, setSortDir]         = React.useState('asc');
    const [page, setPage]               = React.useState(1);
    const PAGE_SIZE                     = 15;
    const [viewMode, setViewMode]       = React.useState('table');
    const [drawerUser, setDrawerUser]   = React.useState(null);
    const [formUser, setFormUser]       = React.useState(null);
    const [confirmAction, setConfirm]   = React.useState(null);
    const [toasts, setToasts]           = React.useState([]);
    const addToast = React.useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    }, []);
    const removeToast = React.useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
    React.useEffect(() => {
        Promise.all([
            fetch('php/get_users.php').then(r => r.json()),
            fetch('php/get_departments.php').then(r => r.json()),
        ])
        .then(([usersData, deptsData]) => {
            setUsers(Array.isArray(usersData) ? usersData : []);
            setDepartments(Array.isArray(deptsData) ? deptsData : []);
            setLoading(false);
        })
        .catch(() => { addToast('Failed to load data.', 'error'); setLoading(false); });
    }, []);
    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        if (q && ![u.name, u.email, u.employee_id, u.department]
            .filter(Boolean).some(v => v.toLowerCase().includes(q))) return false;
        if (filterRole !== 'all'   && u.role !== filterRole)                      return false;
        if (filterDept !== 'all'   && String(u.department_id) !== filterDept)     return false;
        if (filterStatus !== 'all' && String(u.is_active) !== filterStatus)       return false;
        return true;
    }).sort((a, b) => {
        let av, bv;
        if (sortKey === 'name')   { av = (a.name ?? '').toLowerCase(); bv = (b.name ?? '').toLowerCase(); }
        else if (sortKey === 'email')  { av = a.email ?? ''; bv = b.email ?? ''; }
        else if (sortKey === 'role')   { av = a.role  ?? ''; bv = b.role  ?? ''; }
        else if (sortKey === 'dept')   { av = a.department ?? ''; bv = b.department ?? ''; }
        else if (sortKey === 'created'){ av = a.created_at ?? ''; bv = b.created_at ?? ''; }
        else { av = ''; bv = ''; }
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const sortToggle = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };
    const SortIcon = ({ col }) => sortKey !== col ? <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>
        : <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
    const stats = {
        total:    users.length,
        active:   users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        admins:   users.filter(u => u.role === 'admin').length,
    };
    const handleSaveUser = (savedUser) => {
        setUsers(prev => {
            const idx = prev.findIndex(u => u.id === savedUser.id);
            return idx >= 0 ? prev.map(u => u.id === savedUser.id ? savedUser : u) : [savedUser, ...prev];
        });
        setFormUser(null);
        addToast(savedUser.id ? 'User updated successfully.' : 'User created successfully.');
    };
    const handleToggleStatus = (user) => {
        const next = user.is_active ? 0 : 1;
        const msg  = next ? `Activate ${user.name}?` : `Deactivate ${user.name}? They will lose system access.`;
        setConfirm({
            message: msg,
            onConfirm: () => {
                setConfirm(null);
                fetch('php/toggle_user_status.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: user.id, is_active: next }),
                })
                .then(r => r.json())
                .then(d => {
                    if (d.error) throw new Error(d.error);
                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: next } : u));
                    if (drawerUser?.id === user.id) setDrawerUser(u => ({ ...u, is_active: next }));
                    addToast(`User ${next ? 'activated' : 'deactivated'} successfully.`);
                })
                .catch(e => addToast(e.message, 'error'));
            },
        });
    };
    const handleDeleteUser = (user) => {
        setConfirm({
            message: `Permanently delete ${user.name}? This cannot be undone.`,
            onConfirm: () => {
                setConfirm(null);
                fetch('php/delete_user.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: user.id }),
                })
                .then(r => r.json())
                .then(d => {
                    if (d.error) throw new Error(d.error);
                    setUsers(prev => prev.filter(u => u.id !== user.id));
                    if (drawerUser?.id === user.id) setDrawerUser(null);
                    addToast('User deleted.');
                })
                .catch(e => addToast(e.message, 'error'));
            },
        });
    };
    return (
        <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
                .um-row:hover { background: #f8fafc !important; }
                .um-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }
                .um-action-btn { opacity: 0; transition: opacity 0.15s; }
                .um-row:hover .um-action-btn { opacity: 1; }
            `}</style>

            {/* ── HEADER ── */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        
                        <div>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>User Management</h4>
                            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{stats.total} users · {stats.active} active</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFormUser({})}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: 8,
                            padding: '7px 16px', fontWeight: 600, fontSize: 13,
                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                        }}
                    >
                        <span style={{ fontSize: 16 }}>+</span> Add User
                    </button>
                </div>
            </div>

            <div style={{ padding: '1.5rem 2rem', maxWidth: 1400, margin: '0 auto' }}>

                {/* ── STAT CARDS ── */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Users',     value: stats.total,  color: '#6366f1' },
                        { label: 'Active',          value: stats.active,  color: '#16a34a' },
                        { label: 'Inactive',        value: stats.inactive,  color: '#dc2626' },
                        { label: 'Administrators',  value: stats.admins,   color: '#7c3aed' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: '#fff', borderRadius: 12, padding: '14px 20px',
                            border: '1px solid #e2e8f0', flex: '1 1 140px',
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                            <div style={{ fontSize: 24 }}>{s.icon}</div>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── FILTERS & CONTROLS ── */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>🔍</span>
                        <input
                            className="form-control form-control-sm"
                            style={{ paddingLeft: 30, borderRadius: 8 }}
                            placeholder="Search name, email, ID…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    {/* Role filter */}
                    <select className="form-select form-select-sm" style={{ flex: '0 0 130px', borderRadius: 8 }} value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
                        <option value="all">All Roles</option>
                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    {/* Department filter */}
                    <select className="form-select form-select-sm" style={{ flex: '0 0 160px', borderRadius: 8 }} value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
                        <option value="all">All Departments</option>
                        {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                    </select>
                    {/* Status filter */}
                    <select className="form-select form-select-sm" style={{ flex: '0 0 130px', borderRadius: 8 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                        <option value="all">All Status</option>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                    {/* View toggle */}
                    <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
                        {['table', 'grid'].map(v => (
                            <button key={v} onClick={() => setViewMode(v)} style={{
                                border: 'none', padding: '4px 12px', cursor: 'pointer', fontSize: 16,
                                background: viewMode === v ? '#6366f1' : '#fff',
                                color: viewMode === v ? '#fff' : '#9ca3af',
                                transition: 'all 0.15s',
                            }}>
                                {v === 'table' ? '☰' : '⊞'}
                            </button>
                        ))}
                    </div>
                    {/* Results count */}
                    <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* ── TABLE VIEW ── */}
                {loading ? <Spinner /> : viewMode === 'table' ? (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        {[
                                            { key: 'name',    label: 'Name' },
                                            { key: 'email',   label: 'Email' },
                                            { key: 'role',    label: 'Role' },
                                            { key: 'dept',    label: 'Department' },
                                            { key: 'status',  label: 'Status',  noSort: true },
                                            { key: 'created', label: 'Joined' },
                                            { key: 'actions', label: '',        noSort: true },
                                        ].map(col => (
                                            <th key={col.key}
                                                onClick={col.noSort ? undefined : () => sortToggle(col.key)}
                                                style={{
                                                    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                                                    fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    cursor: col.noSort ? 'default' : 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {col.label}{!col.noSort && <SortIcon col={col.key} />}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: 14 }}>No users match the current filters.</td></tr>
                                    ) : paginated.map(user => {
                                        const dept = departments.find(d => d.id === user.department_id);
                                        return (
                                            <tr key={user.id} className="um-row" style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.12s' }}
                                                onClick={() => setDrawerUser(user)}
                                            >
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <Avatar name={user.name} image={user.profile_image} size={32} />
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#111827' }}>
                                                                {user.name}
                                                            </div>
                                                            {user.employee_id && <div style={{ fontSize: 11, color: '#9ca3af' }}>{user.employee_id}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{user.email}</td>
                                                <td style={{ padding: '10px 14px' }}><RoleBadge role={user.role} /></td>
                                                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{dept?.name ?? user.department ?? '—'}</td>
                                                <td style={{ padding: '10px 14px' }}><StatusDot active={user.is_active} /></td>
                                                <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '—'}
                                                </td>
                                                <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-xs um-action-btn" title="Edit"
                                                            style={{ padding: '3px 8px', fontSize: 12, background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6 }}
                                                            onClick={() => setFormUser(user)}
                                                        >✏</button>
                                                        <button className="btn btn-xs um-action-btn" title={user.is_active ? 'Deactivate' : 'Activate'}
                                                            style={{ padding: '3px 8px', fontSize: 12, background: user.is_active ? '#fee2e2' : '#dcfce7', color: user.is_active ? '#dc2626' : '#16a34a', border: 'none', borderRadius: 6 }}
                                                            onClick={() => handleToggleStatus(user)}
                                                        >{user.is_active ? '⊘' : '✓'}</button>
                                                        <button className="btn btn-xs um-action-btn" title="Delete"
                                                            style={{ padding: '3px 8px', fontSize: 12, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6 }}
                                                            onClick={() => handleDeleteUser(user)}
                                                        >🗑</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                    Page {page} of {totalPages} · {filtered.length} users
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-sm btn-light" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                                    <button className="btn btn-sm btn-light" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                        if (p < 1 || p > totalPages) return null;
                                        return (
                                            <button key={p} className="btn btn-sm" onClick={() => setPage(p)}
                                                style={{ background: p === page ? '#6366f1' : '', color: p === page ? '#fff' : '' }}
                                            >{p}</button>
                                        );
                                    })}
                                    <button className="btn btn-sm btn-light" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                                    <button className="btn btn-sm btn-light" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
                                </div>
                            </div>
                        )}
                    </div>

                ) : (
                    /* ── GRID VIEW ── */
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                            {paginated.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No users match the current filters.</div>
                            ) : paginated.map(user => {
                                const dept = departments.find(d => d.id === user.department_id);
                                return (
                                    <div key={user.id} className="um-card"
                                        onClick={() => setDrawerUser(user)}
                                        style={{
                                            background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                                            padding: '1.25rem', cursor: 'pointer',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                            transition: 'all 0.18s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <Avatar name={user.name} image={user.profile_image} size={44} />
                                            <StatusDot active={user.is_active} />
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 2 }}>
                                            {user.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user.email}
                                        </div>
                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                            <RoleBadge role={user.role} />
                                            {dept && <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 20, padding: '1px 8px' }}>{dept.name}</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                                            <button style={{ flex: 1, fontSize: 11, padding: '4px 0', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                                                onClick={() => setFormUser(user)}>Edit</button>
                                            <button style={{ flex: 1, fontSize: 11, padding: '4px 0', background: user.is_active ? '#fee2e2' : '#dcfce7', color: user.is_active ? '#dc2626' : '#16a34a', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                                                onClick={() => handleToggleStatus(user)}>{user.is_active ? 'Deactivate' : 'Activate'}</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 16 }}>
                                <button className="btn btn-sm btn-light" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                                <span style={{ padding: '4px 12px', fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages}</span>
                                <button className="btn btn-sm btn-light" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── MODALS & OVERLAYS ── */}
            {drawerUser && !formUser && (
                <UserDrawer
                    user={drawerUser}
                    departments={departments}
                    onEdit={() => { setFormUser(drawerUser); }}
                    onToggleStatus={() => handleToggleStatus(drawerUser)}
                    onClose={() => setDrawerUser(null)}
                />
            )}

            {formUser !== null && (
                <UserFormModal
                    user={Object.keys(formUser).length ? formUser : null}
                    departments={departments}
                    onSave={handleSaveUser}
                    onClose={() => { setFormUser(null); }}
                />
            )}

            {confirmAction && (
                <ConfirmDialog
                    message={confirmAction.message}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirm(null)}
                />
            )}

            <Toast toasts={toasts} remove={removeToast} />
        </div>
    );
}

// ====================================================================
// MOUNT
// ====================================================================
const sidebarEl = document.getElementById('sidebarRoot');
if (sidebarEl) {
    ReactDOM.createRoot(sidebarEl).render(<Sidebar />);
}
const rootEl = document.getElementById('userManagementRoot');
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<UserManagementPage />);
}