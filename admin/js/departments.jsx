function Portal({ children }) {
    const [target, setTarget] = React.useState(null);

    React.useEffect(() => {
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

function formatDate(value, locale = "en-PH") {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function postJson(url, payload) {
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(async response => {
        const text = await response.text();
        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(text || "Invalid server response.");
            }
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || `Request failed (${response.status}).`);
        }

        if (data.success === false || data.error) {
            throw new Error(data.message || data.error || "Request failed.");
        }

        return data;
    });
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

function ConfirmDialog({
    type = "delete",
    title = "Confirm action",
    message,
    confirmLabel = "Confirm",
    onConfirm,
    onCancel
}) {
    return (
        <Portal>
            <div className={`um-modal-backdrop um-confirm-backdrop um-confirm-backdrop-${type}`} onClick={onCancel}>
                <div className={`um-confirm um-confirm-${type}`} onClick={e => e.stopPropagation()}>
                    <div className="um-confirm-icon">!</div>
                    <h3 className="um-confirm-title">{title}</h3>
                    <p className="um-confirm-text">{message}</p>

                    <div className="um-confirm-actions">
                        <button type="button" className="um-btn um-btn-light" onClick={onCancel}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`um-btn um-confirm-primary um-confirm-primary-${type}`}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function DepartmentModal({ department, onClose, onSave }) {
    const isEdit = !!department?.id;
    const [name, setName] = React.useState(department?.name || "");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    function handleSubmit(event) {
        event.preventDefault();

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("Department name is required.");
            return;
        }

        setSaving(true);
        setError("");

        postJson("php/save_department.php", {
            id: department?.id,
            name: trimmedName
        })
            .then(() => {
                onSave(isEdit ? "Department updated successfully." : "Department created successfully.");
            })
            .catch(err => {
                setError(err.message || "Unable to save department.");
                setSaving(false);
            });
    }

    return (
        <Portal>
            <div className="um-modal-backdrop dm-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="um-modal dm-modal">
                    <form onSubmit={handleSubmit}>
                        <div className="dm-modal-header">
                            <div className="dm-modal-head-left">
                                <div className="dm-modal-icon">
                                    <i className="bi bi-building"></i>
                                </div>

                                <div>
                                    <h3 className="dm-modal-title">
                                        {isEdit ? "Edit Department" : "Add New Department"}
                                    </h3>
                                    <p className="dm-modal-subtitle">
                                        {isEdit
                                            ? "Update department details below"
                                            : "Create a new department for your organization"}
                                    </p>
                                </div>
                            </div>

                            <button type="button" className="dm-modal-close" onClick={onClose} aria-label="Close modal">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="dm-modal-body">
                            {error && <div className="um-alert">{error}</div>}

                            <div className="dm-input-card">
                                <label className="um-label">
                                    Department Name <span className="um-required">*</span>
                                </label>

                                <input
                                    type="text"
                                    className={`um-control dm-modal-input ${error ? "invalid" : ""}`}
                                    value={name}
                                    onChange={e => {
                                        setName(e.target.value);
                                        setError("");
                                    }}
                                    placeholder="Enter department name"
                                    autoFocus
                                />

                                <div className="dm-input-hint">
                                    Use a clear and recognizable department name.
                                </div>

                                {error && <div className="um-error-text">{error}</div>}
                            </div>
                        </div>

                        <div className="dm-modal-footer">
                            <button type="button" className="um-btn um-btn-light dm-btn-light" onClick={onClose}>
                                Cancel
                            </button>

                            <button type="submit" className="um-btn um-btn-dark dm-btn-dark" disabled={saving}>
                                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Department"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
}

function getDepartmentTheme(seedValue) {
    const themes = [
        {
            cover: "linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)",
            avatarBg: "#dbeafe",
            avatarText: "#1d4ed8",
            metaBg: "#eff6ff",
            metaBorder: "#bfdbfe"
        },
        {
            cover: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)",
            avatarBg: "#f3e8ff",
            avatarText: "#7c3aed",
            metaBg: "#faf5ff",
            metaBorder: "#e9d5ff"
        },
        {
            cover: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
            avatarBg: "#d1fae5",
            avatarText: "#059669",
            metaBg: "#ecfdf5",
            metaBorder: "#a7f3d0"
        },
        {
            cover: "linear-gradient(135deg, #ea580c 0%, #fb923c 100%)",
            avatarBg: "#ffedd5",
            avatarText: "#ea580c",
            metaBg: "#fff7ed",
            metaBorder: "#fed7aa"
        },
        {
            cover: "linear-gradient(135deg, #dc2626 0%, #f87171 100%)",
            avatarBg: "#fee2e2",
            avatarText: "#dc2626",
            metaBg: "#fef2f2",
            metaBorder: "#fecaca"
        },
        {
            cover: "linear-gradient(135deg, #0f766e 0%, #2dd4bf 100%)",
            avatarBg: "#ccfbf1",
            avatarText: "#0f766e",
            metaBg: "#f0fdfa",
            metaBorder: "#99f6e4"
        }
    ];

    const value = String(seedValue || "");
    let hash = 0;

    for (let i = 0; i < value.length; i++) {
        hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }

    return themes[Math.abs(hash) % themes.length];
}

function DepartmentCard({ department, onEdit, onDelete }) {
    const initials = String(department.name || "?")
        .split(" ")
        .filter(Boolean)
        .map(word => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";

    const theme = getDepartmentTheme(department.id || department.name);

    return (
        <div
            className="dm-card"
            style={{
                "--dm-cover": theme.cover,
                "--dm-avatar-bg": theme.avatarBg,
                "--dm-avatar-text": theme.avatarText,
                "--dm-meta-bg": theme.metaBg,
                "--dm-meta-border": theme.metaBorder
            }}
        >
            <div className="dm-card-cover">
                <div className="dm-card-avatar">{initials}</div>

                <div className="dm-card-cover-actions">
                    <button
                        type="button"
                        className="dm-cover-icon"
                        onClick={onEdit}
                        aria-label={`Edit ${department.name}`}
                        title="Edit"
                    >
                        <i className="bi bi-pencil"></i>
                    </button>

                    <button
                        type="button"
                        className="dm-cover-icon"
                        onClick={onDelete}
                        aria-label={`Delete ${department.name}`}
                        title="Delete"
                    >
                        <i className="bi bi-trash"></i>
                    </button>
                </div>
            </div>

            <div className="dm-card-body">
                <h3 className="dm-card-title">{department.name || "—"}</h3>
                <p className="dm-card-subtitle">Department ID: {department.id ?? "—"}</p>

                <div className="dm-card-meta">
                    <div className="dm-meta-item">
                        <span className="dm-meta-label">Created</span>
                        <span className="dm-meta-value">{formatDate(department.created_at)}</span>
                    </div>

                    <div className="dm-meta-item">
                        <span className="dm-meta-label">Updated</span>
                        <span className="dm-meta-value">{formatDate(department.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DepartmentManagement() {
    const [departments, setDepartments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [sortDir, setSortDir] = React.useState("asc");
    const [modalDepartment, setModalDepartment] = React.useState(null);
    const [confirmDelete, setConfirmDelete] = React.useState(null);
    const [toasts, setToasts] = React.useState([]);

    const PAGE_SIZE = 8;

    React.useEffect(() => {
        fetchDepartments();
    }, []);

    function addToast(message, type = "success") {
        const id = Date.now() + Math.random();
        setToasts(current => [...current, { id, message, type }]);

        setTimeout(() => {
            setToasts(current => current.filter(toast => toast.id !== id));
        }, 3500);
    }

    function removeToast(id) {
        setToasts(current => current.filter(toast => toast.id !== id));
    }

    function fetchDepartments() {
        setLoading(true);
        setError("");

        fetch("php/departments.php")
            .then(res => res.json())
            .then(data => {
                setDepartments(Array.isArray(data.departments) ? data.departments : []);
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to load departments.");
                setLoading(false);
            });
    }

    function handleModalSave(message) {
        setModalDepartment(null);
        fetchDepartments();
        addToast(message || "Department saved successfully.");
    }

    function handleDeleteDepartment(department) {
        setConfirmDelete({
            department,
            onConfirm: () => {
                setConfirmDelete(null);

                postJson("php/delete_department.php", { id: department.id })
                    .then(() => {
                        setDepartments(previous => previous.filter(item => item.id !== department.id));
                        addToast("Department deleted.");
                    })
                    .catch(err => {
                        addToast(err.message || "Unable to delete department.", "error");
                    });
            }
        });
    }

    const filtered = departments
        .filter(department => {
            const q = search.trim().toLowerCase();
            if (!q) return true;

            return [
                department.name,
                department.id
            ].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
        })
        .sort((a, b) => {
            const av = String(a.name || "").toLowerCase();
            const bv = String(b.name || "").toLowerCase();
            return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const paginationNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
        const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
        return start + index;
    }).filter(number => number >= 1 && number <= totalPages);

    return (
        <div className="um-page">
            <div className="um-shell">
                <div className="um-toolbar">
                    <h2 className="um-section-title">
                        All departments <span>{departments.length}</span>
                    </h2>

                    <div className="um-toolbar-actions">
                        <div className="um-search">
                            <span className="um-search-icon">⌕</span>
                            <input
                                placeholder="Search departments"
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <button
                            type="button"
                            className="um-filter-btn"
                            onClick={() => {
                                setSortDir(current => current === "asc" ? "desc" : "asc");
                                setPage(1);
                            }}
                        >
                            <span className="um-btn-icon">↕</span>
                            Sort {sortDir === "asc" ? "A-Z" : "Z-A"}
                        </button>

                        <button
                            type="button"
                            className="um-add-btn"
                            onClick={() => setModalDepartment({})}
                        >
                            <span className="um-btn-icon">+</span>
                            Add department
                        </button>
                    </div>
                </div>

                {error && <div className="um-alert">{error}</div>}

                {loading ? (
                    <div className="um-spinner-wrap">
                        <div className="um-spinner" />
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="dm-empty-state">No departments found.</div>
                ) : (
                    <>
                        <div className="dm-card-grid">
                            {paginated.map(department => (
                                <DepartmentCard
                                    key={department.id}
                                    department={department}
                                    onEdit={() => setModalDepartment(department)}
                                    onDelete={() => handleDeleteDepartment(department)}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="um-pagination">
                                <button
                                    className="um-page-btn"
                                    disabled={safePage === 1}
                                    onClick={() => setPage(current => Math.max(1, current - 1))}
                                >
                                    ‹
                                </button>

                                {paginationNumbers.map(number => (
                                    <button
                                        key={number}
                                        className={`um-page-btn ${safePage === number ? "active" : ""}`}
                                        onClick={() => setPage(number)}
                                    >
                                        {number}
                                    </button>
                                ))}

                                <button
                                    className="um-page-btn"
                                    disabled={safePage === totalPages}
                                    onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                                >
                                    ›
                                </button>
                            </div>
                        )}
                    </>
                )}

                {modalDepartment !== null && (
                    <DepartmentModal
                        department={Object.keys(modalDepartment).length ? modalDepartment : null}
                        onClose={() => setModalDepartment(null)}
                        onSave={handleModalSave}
                    />
                )}

                {confirmDelete && (
                    <ConfirmDialog
                        type="delete"
                        title="Delete department permanently?"
                        message={`Permanently delete ${confirmDelete.department.name}? This cannot be undone.`}
                        confirmLabel="Delete permanently"
                        onConfirm={confirmDelete.onConfirm}
                        onCancel={() => setConfirmDelete(null)}
                    />
                )}

                <ToastStack toasts={toasts} removeToast={removeToast} />
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<DepartmentManagement />);