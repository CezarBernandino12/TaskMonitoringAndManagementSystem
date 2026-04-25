// ====================================================================
// activity-logs.jsx — Activity Logs page
// Styled to match User Management UI while keeping original functions.
// ====================================================================

const { useState, useEffect, useCallback, useRef } = React;

const ACTION_META = {
    "user.created": {
        color: "#16a34a",
        bg: "#dcfce7",
        icon: "bi-person-plus",
        label: "User Created"
    },
    "user.updated": {
        color: "#0369a1",
        bg: "#e0f2fe",
        icon: "bi-person-gear",
        label: "User Updated"
    },
    "user.deleted": {
        color: "#dc2626",
        bg: "#fee2e2",
        icon: "bi-person-x",
        label: "User Deleted"
    },
    "user.activated": {
        color: "#16a34a",
        bg: "#dcfce7",
        icon: "bi-person-check",
        label: "User Activated"
    },
    "user.deactivated": {
        color: "#b45309",
        bg: "#fef3c7",
        icon: "bi-person-dash",
        label: "User Deactivated"
    },
    "user.role_changed": {
        color: "#7c3aed",
        bg: "#f3f0ff",
        icon: "bi-shield-check",
        label: "Role Changed"
    },

    "department.created": {
        color: "#16a34a",
        bg: "#dcfce7",
        icon: "bi-diagram-3",
        label: "Dept Created"
    },
    "department.updated": {
        color: "#0369a1",
        bg: "#e0f2fe",
        icon: "bi-diagram-3-fill",
        label: "Dept Updated"
    },
    "department.deleted": {
        color: "#dc2626",
        bg: "#fee2e2",
        icon: "bi-trash3",
        label: "Dept Deleted"
    },

    "auth.login": {
        color: "#0369a1",
        bg: "#e0f2fe",
        icon: "bi-box-arrow-in-right",
        label: "Login"
    },
    "auth.logout": {
        color: "#6b7280",
        bg: "#f3f4f6",
        icon: "bi-box-arrow-right",
        label: "Logout"
    },
    "auth.login_failed": {
        color: "#dc2626",
        bg: "#fee2e2",
        icon: "bi-shield-x",
        label: "Login Failed"
    },
    "auth.password_changed": {
        color: "#7c3aed",
        bg: "#f3f0ff",
        icon: "bi-key",
        label: "Password Changed"
    },

    "task.created": {
        color: "#16a34a",
        bg: "#dcfce7",
        icon: "bi-plus-circle",
        label: "Task Created"
    },
    "task.updated": {
        color: "#0369a1",
        bg: "#e0f2fe",
        icon: "bi-pencil-square",
        label: "Task Updated"
    },
    "task.deleted": {
        color: "#dc2626",
        bg: "#fee2e2",
        icon: "bi-trash3",
        label: "Task Deleted"
    },
    "task.assigned": {
        color: "#0284c7",
        bg: "#e0f2fe",
        icon: "bi-person-lines-fill",
        label: "Task Assigned"
    },
    "task.status_changed": {
        color: "#7c3aed",
        bg: "#f3f0ff",
        icon: "bi-arrow-repeat",
        label: "Status Changed"
    },

    "report.exported": {
        color: "#065f46",
        bg: "#d1fae5",
        icon: "bi-file-earmark-arrow-down",
        label: "Report Exported"
    }
};

function getActionMeta(action) {
    return ACTION_META[action] ?? {
        color: "#6b7280",
        bg: "#f3f4f6",
        icon: "bi-activity",
        label: action || "Activity"
    };
}

function formatRole(role) {
    if (!role) return "—";

    return String(role)
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function Portal({ children }) {
    const [target, setTarget] = useState(null);

    useEffect(() => {
        let el = document.getElementById("react-modal-root");

        if (!el) {
            el = document.createElement("div");
            el.id = "react-modal-root";
            document.body.appendChild(el);
        }

        setTarget(el);
    }, []);

    if (!target) return null;

    return ReactDOM.createPortal(children, target);
}


function RolePill({ role }) {
    return (
        <span className="um-pill um-pill-role">
            {formatRole(role)}
        </span>
    );
}

function ActionPill({ action }) {
    const meta = getActionMeta(action);

    return (
        <span
            className="um-pill al-action-pill"
            style={{
                color: meta.color,
                background: meta.bg,
                borderColor: `${meta.color}30`
            }}
        >
            <i className={`bi ${meta.icon}`} />
            {meta.label}
        </span>
    );
}

function ToastStack({ toasts, removeToast }) {
    return (
        <div className="um-toast-wrap">
            {toasts.map(toast => (
                <div key={toast.id} className={`um-toast ${toast.type || "success"}`}>
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => removeToast(toast.id)}>×</button>
                </div>
            ))}
        </div>
    );
}

function DetailRow({ label, children }) {
    return (
        <div className="um-detail-row">
            <div className="um-detail-label">{label}</div>
            <div className="um-detail-value">{children || "—"}</div>
        </div>
    );
}

function LogDetailModal({ log, onClose }) {
    if (!log) return null;

    const meta = getActionMeta(log.action);
    const performedBy = log.user_name || "System";

    return (
        <Portal>
            <div
                className="um-modal-backdrop"
                onClick={event => event.target === event.currentTarget && onClose()}
            >
                <div className="um-modal al-detail-modal">
                    <div className="um-modal-header">
                        <div className="um-modal-title-wrap">
                            <div
                                className="al-detail-icon"
                                style={{
                                    color: meta.color,
                                    background: meta.bg,
                                    borderColor: `${meta.color}30`
                                }}
                            >
                                <i className={`bi ${meta.icon}`} />
                            </div>

                            <div>
                                <h3 className="um-modal-title">Log Entry #{log.id}</h3>
                                <p className="um-modal-subtitle">{log.created_at || "—"}</p>
                            </div>
                        </div>

                        <button type="button" className="um-modal-close" onClick={onClose}>
                            ×
                        </button>
                    </div>

                    <div className="um-modal-body">
                        <div className="um-detail-section">
                            <div className="um-detail-section-title">Activity</div>

                            <DetailRow label="Action">
                                <ActionPill action={log.action} />
                            </DetailRow>

                            <DetailRow label="Description">
                                {log.description || "—"}
                            </DetailRow>

                            <DetailRow label="Date & Time">
                                {log.created_at || "—"}
                            </DetailRow>
                        </div>

                        <div className="um-detail-section">
                            <div className="um-detail-section-title">Performed By</div>

                            <DetailRow label="User">
                                <span className="al-modal-user-name">{performedBy}</span>
                            </DetailRow>

                            <DetailRow label="Role">
                                <RolePill role={log.role} />
                            </DetailRow>

                            <DetailRow label="Role">
                                <RolePill role={log.role} />
                            </DetailRow>
                        </div>

                        {(log.target_type || log.target_id) && (
                            <div className="um-detail-section">
                                <div className="um-detail-section-title">Target</div>

                                <DetailRow label="Type">
                                    {log.target_type
                                        ? String(log.target_type).replace(/_/g, " ")
                                        : "—"}
                                </DetailRow>

                                <DetailRow label="Target ID">
                                    {log.target_id ? `#${log.target_id}` : "—"}
                                </DetailRow>
                            </div>
                        )}
                    </div>

                    <div className="um-modal-footer">
                        <button type="button" className="um-btn um-btn-dark" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function Pagination({ page, pages, onChange }) {
    if (pages <= 1) return null;

    const range = [];
    const delta = 2;

    for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
        range.push(i);
    }

    return (
        <div className="um-pagination">
            <button
                className="um-page-btn"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
            >
                ‹
            </button>

            {range[0] > 1 && (
                <>
                    <button className="um-page-btn" onClick={() => onChange(1)}>
                        1
                    </button>

                    {range[0] > 2 && <span className="al-page-ellipsis">…</span>}
                </>
            )}

            {range.map(number => (
                <button
                    key={number}
                    className={`um-page-btn ${number === page ? "active" : ""}`}
                    onClick={() => onChange(number)}
                >
                    {number}
                </button>
            ))}

            {range[range.length - 1] < pages && (
                <>
                    {range[range.length - 1] < pages - 1 && (
                        <span className="al-page-ellipsis">…</span>
                    )}

                    <button className="um-page-btn" onClick={() => onChange(pages)}>
                        {pages}
                    </button>
                </>
            )}

            <button
                className="um-page-btn"
                disabled={page >= pages}
                onClick={() => onChange(page + 1)}
            >
                ›
            </button>
        </div>
    );
}

function ActivityLogsPage() {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionList, setActionList] = useState([]);
    const [selected, setSelected] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);

    const [filters, setFilters] = useState({
        search: "",
        action: "",
        date_from: "",
        date_to: ""
    });

    const [committed, setCommitted] = useState(filters);

    const addToast = useCallback((message, type = "success") => {
        const id = Date.now() + Math.random();

        setToasts(current => [...current, { id, message, type }]);

        setTimeout(() => {
            setToasts(current => current.filter(toast => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = id => {
        setToasts(current => current.filter(toast => toast.id !== id));
    };

    const fetchLogs = useCallback((pg, activeFilters) => {
        setLoading(true);

        const params = new URLSearchParams({
            page: pg,
            per_page: 25
        });

        if (activeFilters.search) params.set("search", activeFilters.search);
        if (activeFilters.action) params.set("action", activeFilters.action);
        if (activeFilters.date_from) params.set("date_from", activeFilters.date_from);
        if (activeFilters.date_to) params.set("date_to", activeFilters.date_to);

        fetch(`php/get_activity_logs.php?${params}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) throw new Error(data.error);

                setLogs(data.logs ?? []);
                setTotal(data.total ?? 0);
                setPage(data.page ?? pg);
                setPages(data.pages ?? 1);
                setActionList(data.actions ?? []);
            })
            .catch(error => {
                addToast(error.message || "Failed to load activity logs.", "error");
            })
            .finally(() => setLoading(false));
    }, [addToast]);

    useEffect(() => {
        fetchLogs(1, committed);
    }, [committed, fetchLogs]);

    useEffect(() => {
        const handleDocumentClick = event => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setFilterOpen(false);
            }
        };

        document.addEventListener("click", handleDocumentClick);

        return () => document.removeEventListener("click", handleDocumentClick);
    }, []);

    const setFilter = (key, value) => {
        setFilters(current => ({
            ...current,
            [key]: value
        }));
    };

    const handleApplyFilters = event => {
        if (event?.preventDefault) event.preventDefault();

        setCommitted({ ...filters });
        setFilterOpen(false);
    };

    const handleReset = () => {
        const blank = {
            search: "",
            action: "",
            date_from: "",
            date_to: ""
        };

        setFilters(blank);
        setCommitted(blank);
        setFilterOpen(false);
    };

    const handlePageChange = nextPage => {
        fetchLogs(nextPage, committed);
    };

    return (
        <div className="um-page">
            <div className="um-shell">
                <div className="um-toolbar">
                    <h2 className="um-section-title">
                        Activity logs <span>{total.toLocaleString()}</span>
                    </h2>

                    <div className="um-toolbar-actions">
                        <form className="um-search" onSubmit={handleApplyFilters}>
                            <span className="um-search-icon">⌕</span>
                            <input
                                placeholder="Search logs"
                                value={filters.search}
                                onChange={event => setFilter("search", event.target.value)}
                            />
                        </form>

                        <div
                            className="um-filter-wrap"
                            ref={filterRef}
                            onClick={event => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="um-filter-btn"
                                onClick={() => setFilterOpen(open => !open)}
                            >
                                <span className="um-btn-icon">≡</span>
                                Filters
                            </button>

                            <div className={`um-filter-panel al-filter-panel ${filterOpen ? "show" : ""}`}>
                                <form onSubmit={handleApplyFilters}>
                                    <div className="um-filter-group">
                                        <label className="um-filter-label">Action</label>
                                        <select
                                            className="um-filter-control"
                                            value={filters.action}
                                            onChange={event => setFilter("action", event.target.value)}
                                        >
                                            <option value="">All actions</option>

                                            {actionList.map(action => {
                                                const meta = getActionMeta(action);

                                                return (
                                                    <option key={action} value={action}>
                                                        {meta.label}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="um-filter-group">
                                        <label className="um-filter-label">From</label>
                                        <input
                                            type="date"
                                            className="um-filter-control"
                                            value={filters.date_from}
                                            onChange={event => setFilter("date_from", event.target.value)}
                                        />
                                    </div>

                                    <div className="um-filter-group">
                                        <label className="um-filter-label">To</label>
                                        <input
                                            type="date"
                                            className="um-filter-control"
                                            value={filters.date_to}
                                            onChange={event => setFilter("date_to", event.target.value)}
                                        />
                                    </div>

                                    <div className="al-filter-actions">
                                        <button type="submit" className="um-btn um-btn-dark">
                                            Apply filters
                                        </button>

                                        <button
                                            type="button"
                                            className="um-filter-clear"
                                            onClick={handleReset}
                                        >
                                            Clear filters
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="um-table-card">
                    <table className="um-table al-table">
                        <thead>
                            <tr>
                                <th className="al-col-number">#</th>
                                <th className="al-col-user">Performed by</th>
                                <th className="al-col-role">Role</th>
                                <th className="al-col-action">Action</th>
                                <th className="al-col-description">Description</th>
                                <th className="al-col-date">Date & Time</th>
                                <th className="al-col-actions" />
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="um-spinner-wrap">
                                            <div className="um-spinner" />
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="um-empty">
                                        No log entries found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, index) => {
                                    const rowNumber = (page - 1) * 25 + index + 1;
                                    const performedBy = log.user_name || "System";

                                    return (
                                        <tr
                                            key={log.id || `${log.created_at}-${index}`}
                                            onClick={() => setSelected(log)}
                                        >
                                            <td className="al-muted-number">
                                                {rowNumber}
                                            </td>

                                            <td>
                                                <p className="al-user-name-only">
                                                    {performedBy}
                                                </p>
                                            </td>

                                            <td>
                                                <RolePill role={log.role} />
                                            </td>

                                            <td>
                                                <ActionPill action={log.action} />
                                            </td>

                                            <td>
                                                <span className="al-description">
                                                    {log.description || "—"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="um-date">
                                                    {log.created_at || "—"}
                                                </span>
                                            </td>

                                            <td
                                                className="um-col-actions"
                                                onClick={event => event.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    className="um-menu-btn"
                                                    title="View details"
                                                    aria-label={`View log ${log.id}`}
                                                    onClick={() => setSelected(log)}
                                                >
                                                    <i className="bi bi-eye" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination page={page} pages={pages} onChange={handlePageChange} />

                {selected && (
                    <LogDetailModal
                        log={selected}
                        onClose={() => setSelected(null)}
                    />
                )}

                <ToastStack toasts={toasts} removeToast={removeToast} />

                <style>{`
                    .al-filter-panel {
                        width: 320px;
                    }

                    .al-filter-actions {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        margin-top: 12px;
                    }

                    .al-filter-actions .um-btn,
                    .al-filter-actions .um-filter-clear {
                        width: 100%;
                        height: 34px;
                    }

                    .al-table {
                        min-width: 980px;
                    }

                    .al-col-number {
                        width: 58px;
                    }

                    .al-col-user {
                        width: 25%;
                    }

                    .al-col-action {
                        width: 180px;
                    }

                    .al-col-description {
                        width: 34%;
                    }

                    .al-col-date {
                        width: 180px;
                    }

                    .al-col-actions {
                        width: 46px;
                    }

                    .al-muted-number {
                        color: #98a2b3 !important;
                        font-size: 12px !important;
                        font-weight: 600;
                    }

                    .al-role-row {
                        margin-top: 4px;
                    }

                    .al-action-pill {
                        gap: 6px;
                    }

                    .al-action-pill i {
                        font-size: 11px;
                    }

                    .al-description {
                        display: block;
                        max-width: 100%;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        color: #344054;
                    }

                    .al-page-ellipsis {
                        min-width: 24px;
                        height: 32px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        color: #98a2b3;
                        font-size: 13px;
                    }

                    .al-detail-modal {
                        max-width: 620px;
                    }

                    .al-detail-icon {
                        width: 40px;
                        height: 40px;
                        border-radius: 12px;
                        border: 1px solid transparent;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        flex: 0 0 auto;
                        font-size: 17px;
                    }

                    .al-modal-user {
                        display: inline-flex;
                        align-items: center;
                        gap: 9px;
                        font-weight: 700;
                        color: #344054;
                    }

                    @media (max-width: 768px) {
                        .al-filter-panel {
                            width: min(320px, calc(100vw - 32px));
                            right: auto;
                            left: 0;
                        }

                        .al-table {
                            min-width: 880px;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}

const rootEl = document.getElementById("root");

if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<ActivityLogsPage />);
}