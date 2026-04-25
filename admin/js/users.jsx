import React from "https://esm.sh/react@18.3.1";
import ReactDOM from "https://esm.sh/react-dom@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

const { useState, useEffect, useRef, useCallback } = React;

const ROLES = ['admin', 'supervisor', 'staff', 'executive_director', 'president'];
const GENDERS = ['Male', 'Female', 'Rather not say'];

const ROLE_META = {
    admin: { label: 'Admin', pill: 'um-pill-role' },
    supervisor: { label: 'Supervisor', pill: 'um-pill-role' },
    staff: { label: 'Staff', pill: 'um-pill-role' },
    executive_director: { label: 'Executive Director', pill: 'um-pill-role' },
    president: { label: 'President', pill: 'um-pill-role' }
};

function formatRole(role) {
    if (!role) return '—';
    return ROLE_META[role]?.label ?? String(role).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(value, locale = 'en-US') {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function initialsFromName(name) {
    return name
        ? name.split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('').toUpperCase()
        : '?';
}

function Avatar({ name, image, size = 32, drawer = false }) {
    const initials = initialsFromName(name);
    const className = drawer ? 'um-drawer-avatar' : 'um-avatar';
    const fallbackClassName = drawer ? 'um-drawer-avatar-fallback' : 'um-avatar-fallback';
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [image]);

    if (image && !hasError) {
        return (
            <img
                src={image}
                alt={name || 'User'}
                className={className}
                style={{ width: size, height: size }}
                onError={() => setHasError(true)}
            />
        );
    }

    return (
        <div className={fallbackClassName} style={{ width: size, height: size }} aria-label={name || 'User'}>
            {initials}
        </div>
    );
}

function Pill({ children, color = 'green' }) {
    return <span className={`um-pill um-pill-${color}`}>{children}</span>;
}

function RolePill({ role }) {
    const meta = ROLE_META[role];
    const colorClass = meta?.pill ?? 'um-pill-purple';

    return <span className={`um-pill ${colorClass}`}>{formatRole(role)}</span>;
}

function StatusPill({ active }) {
    return <span className={`um-pill ${active ? 'um-pill-status' : 'um-pill-status-inactive'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

function Portal({ children }) {
    const [target, setTarget] = useState(null);

    useEffect(() => {
        let el = document.getElementById('react-modal-root');

        if (!el) {
            el = document.createElement('div');
            el.id = 'react-modal-root';
            document.body.appendChild(el);
        }

        setTarget(el);
    }, []);

    if (!target) return null;

    return ReactDOM.createPortal(children, target);
}


function postJson(url, payload) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(async response => {
        const text = await response.text();
        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(text || 'Invalid server response.');
            }
        }

        if (!response.ok) {
            throw new Error(data.error || `Request failed (${response.status}).`);
        }

        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    });
}

function getSileoToastOptions() {
    return {
        fill: '#000000',
        roundness: 15,
        styles: {
            description: 'text-[#d1d5db]! text-[16px]! leading-[1.45]!',
            badge: 'bg-white/10! text-white!',
            button: 'bg-white/10! text-white! hover:bg-white/15!'
        }
    };
}

function SileoRootStyles() {
    return (
        <style>{`
            #sileo-root {
                position: fixed;
                inset: 0;
                z-index: 2147483600;
                pointer-events: none;
            }

            #sileo-root > * {
                pointer-events: auto;
            }

            #sileo-root [data-sileo-title] {
                font-size: 16px;
            }

            #sileo-root [data-sileo-description] {
                font-size: 15px;
                font-weight: 500;
                color: #d1d5db !important;
            }
        `}</style>
    );
}

function UsersSileoToaster() {
    return (
        <>
            <SileoRootStyles />
            <Toaster
                position="top-center"
                offset={{ top: 10 }}
                options={getSileoToastOptions()}
            />
        </>
    );
}

function mountSileoFallback() {
    let sileoRoot = document.getElementById('sileo-root');

    if (!sileoRoot) {
        sileoRoot = document.createElement('div');
        sileoRoot.id = 'sileo-root';
        document.body.prepend(sileoRoot);
    }

    if (!sileoRoot.dataset.mounted) {
        sileoRoot.dataset.mounted = 'true';
        createRoot(sileoRoot).render(<UsersSileoToaster />);
    }
}

function showSileoToast(message, type = 'success') {
    const titleMap = {
        success: 'Success',
        error: 'Action failed',
        warning: 'Please check',
        info: 'Notice'
    };

    const title = titleMap[type] || 'Notice';
    const description = message || 'Done.';

    if (type === 'error' && typeof sileo.error === 'function') {
        sileo.error({ title, description });
        return;
    }

    if (type === 'warning' && typeof sileo.warning === 'function') {
        sileo.warning({ title, description });
        return;
    }

    if (type === 'info' && typeof sileo.info === 'function') {
        sileo.info({ title, description });
        return;
    }

    if (typeof sileo.success === 'function') {
        sileo.success({ title, description });
        return;
    }

    sileo.info({ title, description });
}

function ConfirmDialog({
    type = 'warning',
    title = 'Confirm action',
    message,
    confirmLabel = 'Yes, proceed',
    onConfirm,
    onCancel
}) {
    const icon = type === 'activate' ? '✓' : '!';

    return (
        <Portal>
            <div className={`um-modal-backdrop um-confirm-backdrop um-confirm-backdrop-${type}`} onClick={onCancel}>
                <div className={`um-confirm um-confirm-${type}`} onClick={e => e.stopPropagation()}>
                    <div className="um-confirm-icon">{icon}</div>
                    <h3 className="um-confirm-title">{title}</h3>
                    <p className="um-confirm-text">{message}</p>
                    <div className="um-confirm-actions">
                        <button type="button" className="um-btn um-btn-light" onClick={onCancel}>Cancel</button>
                        <button type="button" className={`um-btn um-confirm-primary um-confirm-primary-${type}`} onClick={onConfirm}>
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function Field({ label, name, form, errors, set, required = false, full = false, children }) {
    return (
        <div className={`um-field ${full ? 'full' : ''}`}>
            <label className="um-label">
                {label}
                {required && <span className="um-required">*</span>}
            </label>

            {children ?? (
                <input
                    type="text"
                    className={`um-control ${errors[name] ? 'invalid' : ''}`}
                    value={form[name] ?? ''}
                    onChange={e => set(name, e.target.value)}
                />
            )}

            {errors[name] && <div className="um-error-text">{errors[name]}</div>}
        </div>
    );
}

function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Select',
    invalid = false,
    ariaLabel = 'Select option'
}) {
    const [open, setOpen] = useState(false);
    const selectRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = event => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleEscape = event => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const selected = options.find(option => String(option.value) === String(value ?? ''));
    const selectedLabel = selected?.label ?? placeholder;

    const handleSelect = option => {
        onChange(option.value);
        setOpen(false);
    };

    return (
        <div className={`um-custom-select ${open ? 'is-open' : ''}`} ref={selectRef}>
            <button
                type="button"
                className={`um-select-trigger ${invalid ? 'invalid' : ''}`}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={event => {
                    event.stopPropagation();
                    setOpen(current => !current);
                }}
            >
                <span className="um-select-value">{selectedLabel}</span>
                <span className="um-select-chevron">⌄</span>
            </button>

            {open && (
                <div className="um-select-menu" role="listbox" onClick={event => event.stopPropagation()}>
                    {options.map(option => {
                        const active = String(option.value) === String(value ?? '');

                        return (
                            <button
                                key={String(option.value)}
                                type="button"
                                role="option"
                                aria-selected={active}
                                className={`um-select-option ${active ? 'is-selected' : ''}`}
                                onClick={() => handleSelect(option)}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


function UserFormModal({ user, departments, onSave, onClose }) {
    const isEdit = !!user?.id;

    const blank = {
        name: '',
        nickname: '',
        email: '',
        password: '',
        role: 'staff',
        contact: '',
        address: '',
        gender: '',
        date_of_birth: '',
        is_active: 1,
        department_id: '',
        employee_id: ''
    };

    const [form, setForm] = useState(isEdit ? { ...blank, ...user, password: '' } : blank);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [tab, setTab] = useState('basic');

    const set = (key, value) => {
        setForm(current => ({ ...current, [key]: value }));
        setErrors(current => ({ ...current, [key]: null }));
    };

    const validate = () => {
        const nextErrors = {};

        if (!String(form.name || '').trim()) nextErrors.name = 'Required';
        if (!String(form.email || '').trim()) nextErrors.email = 'Required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Invalid email';
        if (!isEdit && !String(form.password || '').trim()) nextErrors.password = 'Required for new users';
        if (form.password && form.password.length < 6) nextErrors.password = 'Minimum 6 characters';
        if (!form.role) nextErrors.role = 'Please select a role';

        return nextErrors;
    };

    const handleSave = () => {
        const nextErrors = validate();

        if (Object.keys(nextErrors).length) {
            setErrors(nextErrors);
            setTab('basic');
            return;
        }

        setSaving(true);

        fetch('php/save_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                onSave(data.user);
            })
            .catch(error => {
                setErrors({ _global: error.message });
                setSaving(false);
            });
    };

    const tabs = [
        { key: 'basic', label: 'Basic Info' },
        { key: 'contact', label: 'Contact' },
        { key: 'access', label: 'Role & Access' }
    ];

    const tabOrder = tabs.map(item => item.key);
    const currentTabIndex = tabOrder.indexOf(tab);
    const isLastTab = currentTabIndex === tabOrder.length - 1;
    const fieldProps = { form, errors, set };

    return (
        <Portal>
            <div className="um-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="um-modal">
                    <div className="um-modal-header">
                        <div className="um-modal-title-wrap">
                            {isEdit && <Avatar name={user.name} image={user.profile_image} size={40} />}
                            <div>
                                <h3 className="um-modal-title">{isEdit ? `Edit — ${user.name}` : 'Add New User'}</h3>
                                <p className="um-modal-subtitle">
                                    {isEdit ? `Employee ID: ${user.employee_id ?? '—'}` : 'Fill in the user details below'}
                                </p>
                            </div>
                        </div>
                        <button type="button" className="um-modal-close" onClick={onClose}>×</button>
                    </div>

                    <div className="um-modal-tabs">
                        {tabs.map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={`um-modal-tab ${tab === item.key ? 'active' : ''}`}
                                onClick={() => setTab(item.key)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="um-modal-body">
                        {errors._global && <div className="um-alert">{errors._global}</div>}

                        {tab === 'basic' && (
                            <div className="um-form-grid">
                                <Field label="Full Name" name="name" required full {...fieldProps} />
                                <Field label="Nickname" name="nickname" {...fieldProps} />
                                <Field label="Employee ID" name="employee_id" {...fieldProps} />

                                <Field label="Gender" name="gender" {...fieldProps}>
                                    <CustomSelect
                                        value={form.gender ?? ''}
                                        onChange={value => set('gender', value)}
                                        placeholder="— Select —"
                                        ariaLabel="Select gender"
                                        options={[
                                            { value: '', label: '— Select —' },
                                            ...GENDERS.map(gender => ({ value: gender, label: gender }))
                                        ]}
                                    />
                                </Field>

                                <Field label="Date of Birth" name="date_of_birth" {...fieldProps}>
                                    <input
                                        type="date"
                                        className="um-control"
                                        value={form.date_of_birth ?? ''}
                                        onChange={e => set('date_of_birth', e.target.value)}
                                    />
                                </Field>
                            </div>
                        )}

                        {tab === 'contact' && (
                            <div className="um-form-grid">
                                <Field label="Email Address" name="email" required full {...fieldProps} />

                                <Field label="Contact Number" name="contact" full {...fieldProps}>
                                    <input
                                        type="tel"
                                        className="um-control"
                                        value={form.contact ?? ''}
                                        onChange={e => set('contact', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                        placeholder="09XXXXXXXXX"
                                    />
                                </Field>

                                <Field label="Address" name="address" full {...fieldProps}>
                                    <textarea
                                        className="um-control"
                                        rows={3}
                                        value={form.address ?? ''}
                                        onChange={e => set('address', e.target.value)}
                                    />
                                </Field>
                            </div>
                        )}

                        {tab === 'access' && (
                            <div className="um-form-grid">
                                <Field label="Role" name="role" required {...fieldProps}>
                                    <CustomSelect
                                        value={form.role}
                                        onChange={value => set('role', value)}
                                        invalid={!!errors.role}
                                        ariaLabel="Select role"
                                        options={ROLES.map(role => ({ value: role, label: formatRole(role) }))}
                                    />
                                    {errors.role && <div className="um-error-text">{errors.role}</div>}
                                </Field>

                                <Field label="Department" name="department_id" {...fieldProps}>
                                    <CustomSelect
                                        value={form.department_id ?? ''}
                                        onChange={value => set('department_id', value)}
                                        placeholder="— None —"
                                        ariaLabel="Select department"
                                        options={[
                                            { value: '', label: '— None —' },
                                            ...departments.map(department => ({
                                                value: String(department.id),
                                                label: department.name
                                            }))
                                        ]}
                                    />
                                </Field>

                                <Field label="Status" name="is_active" {...fieldProps}>
                                    <CustomSelect
                                        value={form.is_active}
                                        onChange={value => set('is_active', parseInt(value, 10))}
                                        ariaLabel="Select status"
                                        options={[
                                            { value: 1, label: 'Active' },
                                            { value: 0, label: 'Inactive' }
                                        ]}
                                    />
                                </Field>

                                <Field
                                    label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
                                    name="password"
                                    required={!isEdit}
                                    full
                                    {...fieldProps}
                                >
                                    <input
                                        type="password"
                                        className={`um-control ${errors.password ? 'invalid' : ''}`}
                                        value={form.password ?? ''}
                                        onChange={e => set('password', e.target.value)}
                                        placeholder={isEdit ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                                        autoComplete="new-password"
                                    />
                                    {errors.password && <div className="um-error-text">{errors.password}</div>}
                                </Field>
                            </div>
                        )}
                    </div>

                    <div className="um-modal-footer">
                        <button type="button" className="um-btn um-btn-light" onClick={onClose}>Cancel</button>

                        {!isLastTab && (
                            <button
                                type="button"
                                className="um-btn um-btn-dark"
                                onClick={() => setTab(tabOrder[currentTabIndex + 1])}
                            >
                                Next
                            </button>
                        )}

                        {isLastTab && (
                            <button type="button" className="um-btn um-btn-dark" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function UserDrawer({ user, departments, onEdit, onToggleStatus, onClose }) {
    const dept = departments.find(department => String(department.id) === String(user.department_id));

    const DetailRow = ({ label, value }) => (
        <div className="um-detail-row">
            <div className="um-detail-label">{label}</div>
            <div className="um-detail-value">{value || '—'}</div>
        </div>
    );

    return (
        <Portal>
            <div className="um-drawer-backdrop" onClick={onClose}>
                <div
                    className="um-drawer"
                    onClick={event => event.stopPropagation()}
                >
                    <div className="um-drawer-header">
                        <div className="um-drawer-identity">
                            <Avatar name={user.name} image={user.profile_image} size={56} drawer />

                            <div className="um-drawer-title-block">
                                <h3 className="um-drawer-name">{user.name || '—'}</h3>
                                {user.nickname && (
                                    <div className="um-drawer-nickname">
                                        &quot;{user.nickname}&quot;
                                    </div>
                                )}
                                <div className="um-drawer-email">{user.email || '—'}</div>

                                <div className="um-access-list um-drawer-badges">
                                    <RolePill role={user.role} />
                                    <StatusPill active={!!Number(user.is_active)} />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="um-drawer-close"
                            onClick={onClose}
                            aria-label="Close drawer"
                        >
                            ×
                        </button>
                    </div>

                    <div
                        className="um-drawer-body"
                        onWheel={event => event.stopPropagation()}
                        onTouchMove={event => event.stopPropagation()}
                    >
                        <div className="um-detail-section">
                            <div className="um-detail-section-title">Identity</div>
                            <DetailRow label="Employee ID" value={user.employee_id} />
                            <DetailRow label="Email" value={user.email} />
                            <DetailRow label="Gender" value={user.gender} />
                            <DetailRow
                                label="Date of Birth"
                                value={user.date_of_birth ? formatDate(`${user.date_of_birth}T00:00:00`, 'en-PH') : null}
                            />
                        </div>

                        <div className="um-detail-section">
                            <div className="um-detail-section-title">Work</div>
                            <DetailRow label="Department" value={dept?.name ?? user.department} />
                            <DetailRow label="Role" value={formatRole(user.role)} />
                        </div>

                        <div className="um-detail-section">
                            <div className="um-detail-section-title">Contact</div>
                            <DetailRow label="Phone" value={user.contact} />
                            <DetailRow label="Address" value={user.address} />
                        </div>

                        <div className="um-detail-section">
                            <div className="um-detail-section-title">System</div>
                            <DetailRow label="Created" value={formatDate(user.created_at, 'en-PH')} />
                            <DetailRow label="Last Updated" value={formatDate(user.updated_at, 'en-PH')} />
                        </div>
                    </div>

                    <div className="um-drawer-footer">
                        <button type="button" className="um-btn um-btn-dark" onClick={onEdit}>
                            Edit
                        </button>

                        <button
                            type="button"
                            className={`um-btn ${Number(user.is_active) ? 'um-btn-deactivate' : 'um-btn-activate'}`}
                            onClick={onToggleStatus}
                        >
                            {Number(user.is_active) ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterDept, setFilterDept] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [filterOpen, setFilterOpen] = useState(false);
    const [drawerUser, setDrawerUser] = useState(null);
    const [formUser, setFormUser] = useState(null);
    const [confirmAction, setConfirm] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const filterRef = useRef(null);
    const PAGE_SIZE = 15;

    const addToast = useCallback((message, type = 'success') => {
        showSileoToast(message, type);
    }, []);

    useEffect(() => {
        Promise.all([
            fetch('php/get_users.php').then(response => response.json()),
            fetch('php/get_departments.php').then(response => response.json())
        ])
            .then(([usersData, departmentsData]) => {
                setUsers(Array.isArray(usersData) ? usersData : []);
                setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
                setLoading(false);
            })
            .catch(() => {
                addToast('Failed to load data.', 'error');
                setLoading(false);
            });
    }, [addToast]);

    useEffect(() => {
        const handleDocumentClick = event => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setFilterOpen(false);
            }
            setOpenMenuId(null);
        };

        document.addEventListener('click', handleDocumentClick);
        return () => document.removeEventListener('click', handleDocumentClick);
    }, []);

    const getDepartment = user => departments.find(department => String(department.id) === String(user.department_id));

    const filtered = users
        .filter(user => {
            const q = search.trim().toLowerCase();
            const dept = getDepartment(user);
            const searchableValues = [
                user.name,
                user.email,
                user.employee_id,
                user.role,
                user.department,
                dept?.name
            ].filter(Boolean);

            if (q && !searchableValues.some(value => String(value).toLowerCase().includes(q))) return false;
            if (filterRole !== 'all' && user.role !== filterRole) return false;
            if (filterDept !== 'all' && String(user.department_id) !== String(filterDept)) return false;
            if (filterStatus !== 'all' && String(Number(user.is_active)) !== String(filterStatus)) return false;

            return true;
        })
        .sort((a, b) => {
            const deptA = getDepartment(a)?.name ?? a.department ?? '';
            const deptB = getDepartment(b)?.name ?? b.department ?? '';

            const values = {
                name: [(a.name ?? '').toLowerCase(), (b.name ?? '').toLowerCase()],
                email: [a.email ?? '', b.email ?? ''],
                role: [a.role ?? '', b.role ?? ''],
                dept: [deptA, deptB],
                created: [a.created_at ?? '', b.created_at ?? ''],
                updated: [a.updated_at ?? a.created_at ?? '', b.updated_at ?? b.created_at ?? '']
            };

            const [av, bv] = values[sortKey] ?? ['', ''];
            return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const sortToggle = key => {
        if (sortKey === key) {
            setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    };

    const clearFilters = () => {
        setFilterRole('all');
        setFilterDept('all');
        setFilterStatus('all');
        setSearch('');
        setPage(1);
    };

    const handleSaveUser = savedUser => {
        setUsers(previous => {
            const exists = previous.some(user => user.id === savedUser.id);
            return exists
                ? previous.map(user => (user.id === savedUser.id ? savedUser : user))
                : [savedUser, ...previous];
        });

        setFormUser(null);
        addToast(savedUser.id ? 'User saved successfully.' : 'User created successfully.');
    };

    const handleToggleStatus = user => {
        const next = Number(user.is_active) ? 0 : 1;
        const action = next ? 'activate' : 'deactivate';
        const actionLabel = next ? 'Activate' : 'Deactivate';

        setOpenMenuId(null);

        setConfirm({
            type: action,
            title: `${actionLabel} user?`,
            message: next
                ? `Activate ${user.name}? This user will regain system access.`
                : `Deactivate ${user.name}? This user will lose system access.`,
            confirmLabel: actionLabel,
            onConfirm: () => {
                setConfirm(null);

                postJson('php/toggle_user_status.php', {
                    id: user.id,
                    is_active: next,
                    status: next,
                    active: next
                })
                    .then(data => {
                        const updatedUser = data.user ?? { ...user, is_active: next };

                        setUsers(previous => previous.map(item => (
                            item.id === user.id
                                ? { ...item, ...updatedUser, is_active: next }
                                : item
                        )));

                        setDrawerUser(current => (
                            current?.id === user.id
                                ? { ...current, ...updatedUser, is_active: next }
                                : current
                        ));

                        setFormUser(current => (
                            current?.id === user.id
                                ? { ...current, ...updatedUser, is_active: next }
                                : current
                        ));

                        addToast(`${user.name} has been ${next ? 'activated' : 'deactivated'}.`);
                    })
                    .catch(error => {
                        addToast(error.message || 'Unable to update user status.', 'error');
                    });
            }
        });
    };

    const handleDeleteUser = user => {
        setOpenMenuId(null);

        setConfirm({
            type: 'delete',
            title: 'Delete user permanently?',
            message: `Permanently delete ${user.name}? This cannot be undone.`,
            confirmLabel: 'Delete permanently',
            onConfirm: () => {
                setConfirm(null);

                postJson('php/delete_user.php', { id: user.id })
                    .then(() => {
                        setUsers(previous => previous.filter(item => item.id !== user.id));

                        if (drawerUser?.id === user.id) {
                            setDrawerUser(null);
                        }

                        addToast('User deleted.');
                    })
                    .catch(error => {
                        addToast(error.message || 'Unable to delete user.', 'error');
                    });
            }
        });
    };

    const paginationNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
        const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
        return start + index;
    }).filter(number => number >= 1 && number <= totalPages);

    return (
        <div className="um-page">
            <div className="um-shell">
                <div className="um-toolbar">
                    <h2 className="um-section-title">All users <span>{users.length}</span></h2>

                    <div className="um-toolbar-actions">
                        <div className="um-search">
                            <span className="um-search-icon">⌕</span>
                            <input
                                placeholder="Search"
                                value={search}
                                onChange={event => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div className="um-filter-wrap" ref={filterRef} onClick={event => event.stopPropagation()}>
                            <button type="button" className="um-filter-btn" onClick={() => setFilterOpen(open => !open)}>
                                <span className="um-btn-icon">≡</span>
                                Filters
                            </button>

                            <div className={`um-filter-panel ${filterOpen ? 'show' : ''}`}>
                                <div className="um-filter-group">
                                    <label className="um-filter-label">Role</label>
                                    <CustomSelect
                                        value={filterRole}
                                        onChange={value => {
                                            setFilterRole(value);
                                            setPage(1);
                                        }}
                                        ariaLabel="Filter by role"
                                        options={[
                                            { value: 'all', label: 'All Roles' },
                                            ...ROLES.map(role => ({ value: role, label: formatRole(role) }))
                                        ]}
                                    />
                                </div>

                                <div className="um-filter-group">
                                    <label className="um-filter-label">Department</label>
                                    <CustomSelect
                                        value={filterDept}
                                        onChange={value => {
                                            setFilterDept(value);
                                            setPage(1);
                                        }}
                                        ariaLabel="Filter by department"
                                        options={[
                                            { value: 'all', label: 'All Departments' },
                                            ...departments.map(department => ({
                                                value: String(department.id),
                                                label: department.name
                                            }))
                                        ]}
                                    />
                                </div>

                                <div className="um-filter-group">
                                    <label className="um-filter-label">Status</label>
                                    <CustomSelect
                                        value={filterStatus}
                                        onChange={value => {
                                            setFilterStatus(value);
                                            setPage(1);
                                        }}
                                        ariaLabel="Filter by status"
                                        options={[
                                            { value: 'all', label: 'All Status' },
                                            { value: '1', label: 'Active' },
                                            { value: '0', label: 'Inactive' }
                                        ]}
                                    />
                                </div>

                                <button type="button" className="um-filter-clear" onClick={clearFilters}>Clear filters</button>
                            </div>
                        </div>

                        <button type="button" className="um-add-btn" onClick={() => setFormUser({})}>
                            <span className="um-btn-icon">+</span>
                            Add user
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="um-spinner-wrap">
                        <div className="um-spinner" />
                    </div>
                ) : (
                    <div className="um-table-card">
                        <table className="um-table">
                            <thead>
                                <tr>
                                    <th className="um-col-user">
                                        <button type="button" className="um-head-btn" onClick={() => sortToggle('name')}>
                                            User name
                                        </button>
                                    </th>
                                    <th className="um-col-access">Access</th>
                                    <th className="um-col-status">Status</th>
                                    <th className="um-col-date">
                                        <button type="button" className="um-head-btn" onClick={() => sortToggle('updated')}>
                                            Last active {sortKey === 'updated' ? (sortDir === 'asc' ? '↑' : '↓') : '↓'}
                                        </button>
                                    </th>
                                    <th className="um-col-date">
                                        <button type="button" className="um-head-btn" onClick={() => sortToggle('created')}>
                                            Date added
                                        </button>
                                    </th>
                                    <th className="um-col-actions" />
                                </tr>
                            </thead>

                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="um-empty">No users match the current filters.</td>
                                    </tr>
                                ) : (
                                    paginated.map(user => {
                                        const dept = getDepartment(user);
                                        const userMenuOpen = openMenuId === user.id;

                                        return (
                                            <tr key={user.id} onClick={() => setDrawerUser(user)}>
                                                <td>
                                                    <div className="um-user-cell">
                                                        <Avatar name={user.name} image={user.profile_image} size={32} />
                                                        <div className="um-user-text">
                                                            <p className="um-user-name">{user.name}</p>
                                                            <p className="um-user-email">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="um-access-list">
                                                        <RolePill role={user.role} />
                                                        {(dept?.name || user.department) && <span className="um-pill um-pill-department">{dept?.name ?? user.department}</span>}
                                                    </div>
                                                </td>

                                                <td className="um-status-cell">
                                                    <StatusPill active={!!Number(user.is_active)} />
                                                </td>

                                                <td><span className="um-date">{formatDate(user.updated_at ?? user.created_at)}</span></td>
                                                <td><span className="um-date">{formatDate(user.created_at)}</span></td>

                                                <td className="um-col-actions" onClick={event => event.stopPropagation()}>
                                                    <div className="um-menu-wrap">
                                                        <button
                                                            type="button"
                                                            className="um-menu-btn"
                                                            aria-label={`Open actions for ${user.name}`}
                                                            onClick={event => {
                                                                event.stopPropagation();
                                                                setOpenMenuId(current => (current === user.id ? null : user.id));
                                                            }}
                                                        >
                                                            ⋮
                                                        </button>

                                                        {userMenuOpen && (
                                                            <div className="um-row-menu" onClick={event => event.stopPropagation()}>
                                                                <button type="button" onClick={() => { setOpenMenuId(null); setDrawerUser(user); }}>View details</button>
                                                                <button type="button" onClick={() => { setOpenMenuId(null); setFormUser(user); }}>Edit</button>
                                                                <button type="button" onClick={() => { setOpenMenuId(null); handleToggleStatus(user); }}>
                                                                    {Number(user.is_active) ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                                <button type="button" className="danger" onClick={() => { setOpenMenuId(null); handleDeleteUser(user); }}>Delete</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="um-pagination">
                                <button className="um-page-btn" disabled={safePage === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>‹</button>

                                {paginationNumbers.map(number => (
                                    <button
                                        key={number}
                                        className={`um-page-btn ${safePage === number ? 'active' : ''}`}
                                        onClick={() => setPage(number)}
                                    >
                                        {number}
                                    </button>
                                ))}

                                <button className="um-page-btn" disabled={safePage === totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>›</button>
                            </div>
                        )}
                    </div>
                )}

                {drawerUser && !formUser && (
                    <UserDrawer
                        user={drawerUser}
                        departments={departments}
                        onEdit={() => setFormUser(drawerUser)}
                        onToggleStatus={() => handleToggleStatus(drawerUser)}
                        onClose={() => setDrawerUser(null)}
                    />
                )}

                {formUser !== null && (
                    <UserFormModal
                        user={Object.keys(formUser).length ? formUser : null}
                        departments={departments}
                        onSave={handleSaveUser}
                        onClose={() => setFormUser(null)}
                    />
                )}

                {confirmAction && (
                    <ConfirmDialog
                        type={confirmAction.type}
                        title={confirmAction.title}
                        message={confirmAction.message}
                        confirmLabel={confirmAction.confirmLabel}
                        onConfirm={confirmAction.onConfirm}
                        onCancel={() => setConfirm(null)}
                    />
                )}

            </div>
        </div>
    );
}

mountSileoFallback();

const rootEl = document.getElementById('root');

if (rootEl) {
    createRoot(rootEl).render(<UserManagementPage />);
}
