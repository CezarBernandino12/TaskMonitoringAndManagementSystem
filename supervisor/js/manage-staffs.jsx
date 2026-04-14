const STAFF_LIST_API = "php/get_staff_by_department.php";
const ADD_STAFF_API = "php/add_staff.php";
const DELETE_STAFF_API = "php/delete_staff.php";
const TOGGLE_STAFF_STATUS_API = "php/toggle_staff_status.php";
const PAGE_SIZE = 6;

function getInitials(name = "") {
    return String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "U";
}

function normalizeDepartments(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.departments)) return payload.departments;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

async function readJsonSafe(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch (error) {
        console.error("Invalid JSON:", text);
        throw new Error("Server returned invalid JSON.");
    }
}

function formatRoleLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Staff Member";
    return raw
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function flattenDepartments(departments) {
    return departments.flatMap((department) => {
        const members = Array.isArray(department.staff) ? department.staff : [];
        return members.map((member) => ({
            ...member,
            department_id: member.department_id || department.department_id,
            department_name: member.department_name || department.department_name || "Unassigned"
        }));
    });
}

function downloadBlob(filename, content, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function buildCsv(rows) {
    const escapeCell = (value) => {
        const stringValue = String(value ?? "");
        if (/[",\n]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

function Avatar({ member }) {
    const [imageError, setImageError] = React.useState(false);
    const imageUrl = member.profile_image_url || "";
    const canShowImage = Boolean(imageUrl) && !imageError;

    return (
        <div className="employee-avatar-wrap">
            <div className="employee-avatar">
                {canShowImage ? (
                    <img
                        src={imageUrl}
                        alt={member.name || "Staff profile"}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <span>{getInitials(member.name)}</span>
                )}
            </div>
            <span
                className={`employee-status-dot ${member.is_active_now ? "is-online" : "is-offline"}`}
                title={member.is_active_now ? "Active" : "Inactive"}
            ></span>
        </div>
    );
}

function EmployeeCard({ member, busyId, onDelete, onToggleStatus }) {
    const statusClass = member.is_active_now ? "is-active" : "is-inactive";
    const statusLabel = member.is_active_now ? "Active" : "Inactive";
    const roleLabel = member.position || member.job_title || formatRoleLabel(member.role);
    const employeeCode = member.employee_id || member.id || "-";
    const isBusy = busyId === member.id;

    return (
        <article className="employee-card">
            <div className="employee-card-head">
                <span className={`employee-status-pill ${statusClass}`}>
                    <span className="status-pill-dot"></span>
                    {statusLabel}
                </span>

                <div className="dropdown">
                    <button
                        className="employee-menu-btn"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        aria-label="Employee actions"
                    >
                        <i className="bi bi-three-dots"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                            <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => onToggleStatus(member)}
                                disabled={isBusy}
                            >
                                <i className={`bi ${member.is_active_now ? "bi-person-dash" : "bi-person-check"} me-2`}></i>
                                {member.is_active_now ? "Deactivate account" : "Activate account"}
                            </button>
                        </li>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                            <button
                                type="button"
                                className="dropdown-item text-danger"
                                onClick={() => onDelete(member.id, member.name || "this staff member")}
                                disabled={isBusy}
                            >
                                <i className="bi bi-trash3 me-2"></i>
                                Delete employee
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="employee-card-body">
                <Avatar member={member} />

                <h3 className="employee-name">{member.name || "Unnamed employee"}</h3>
                <p className="employee-role">{roleLabel}</p>

                <div className="employee-info-box">
                    <div className="employee-code-row">
                        <span>EMP: {employeeCode}</span>
                    </div>

                    <div className="employee-meta-row">
                        <span>
                            <i className="bi bi-briefcase me-2"></i>
                            {member.department_name || "Unassigned"}
                        </span>
                    </div>

                    <a className="employee-link-row" href={`mailto:${member.email || ""}`}>
                        <i className="bi bi-envelope"></i>
                        <span>{member.email || "No email"}</span>
                    </a>

                    {member.contact ? (
                        <a className="employee-link-row" href={`tel:${member.contact}`}>
                            <i className="bi bi-telephone"></i>
                            <span>{member.contact}</span>
                        </a>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function AddEmployeeModal({
    open,
    form,
    submitting,
    onInputChange,
    onSubmit,
    onClose
}) {
    const [showPassword, setShowPassword] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            setShowPassword(false);
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="employee-modal-backdrop" onClick={onClose}>
            <div className="employee-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="employee-modal-header">
                    <div>
                        <p className="employee-modal-kicker">Create account</p>
                        <h4 className="employee-modal-title">Add Employee</h4>
                    </div>
                    <button type="button" className="employee-modal-close" onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <form className="row g-3" onSubmit={onSubmit}>
                    <div className="col-12">
                        <label className="form-label">Employee name</label>
                        <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={form.name}
                            onChange={onInputChange}
                            placeholder="Enter employee name"
                            required
                        />
                    </div>

                    <div className="col-12">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-control"
                            name="email"
                            value={form.email}
                            onChange={onInputChange}
                            placeholder="name@example.com"
                            required
                        />
                    </div>

                    <div className="col-12">
                        <label className="form-label">Password</label>
                        <div className="employee-password-wrap">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control employee-password-input"
                                name="password"
                                value={form.password}
                                onChange={onInputChange}
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                className="employee-password-toggle"
                                onClick={() => setShowPassword((previous) => !previous)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="col-12">
                        <label className="form-label">Employee ID</label>
                        <input
                            type="text"
                            className="form-control"
                            name="employee_id"
                            value={form.employee_id}
                            onChange={onInputChange}
                            placeholder="Enter employee ID"
                            required
                        />
                    </div>

                    <div className="col-12 d-flex justify-content-end gap-2 pt-2">
                        <button type="button" className="btn btn-light" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn employee-add-submit" disabled={submitting}>
                            <i className="bi bi-plus-lg me-2"></i>
                            {submitting ? "Saving..." : "Add Employee"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function StaffManagementPage() {
    const [departments, setDepartments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [selectedDepartment, setSelectedDepartment] = React.useState("all");
    const [submitting, setSubmitting] = React.useState(false);
    const [busyId, setBusyId] = React.useState(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [form, setForm] = React.useState({
        name: "",
        email: "",
        password: "",
        employee_id: ""
    });

    const departmentOptions = React.useMemo(() => {
        return departments.map((department) => ({
            department_id: String(department.department_id),
            department_name: department.department_name || "Unassigned"
        }));
    }, [departments]);

    const resetForm = React.useCallback(() => {
        setForm({
            name: "",
            email: "",
            password: "",
            employee_id: ""
        });
    }, []);

    const loadStaff = React.useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(STAFF_LIST_API, {
                credentials: "same-origin",
                headers: { Accept: "application/json" }
            });

            const data = await readJsonSafe(response);
            const normalized = normalizeDepartments(data);

            if (!response.ok || data?.error) {
                throw new Error(data?.error || "Failed to load staff list.");
            }

            setDepartments(normalized);
        } catch (err) {
            console.error(err);
            setDepartments([]);
            setError(err.message || "Failed to load staff list.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    React.useEffect(() => {
        if (!success) return undefined;
        const timeoutId = window.setTimeout(() => setSuccess(""), 3500);
        return () => window.clearTimeout(timeoutId);
    }, [success]);

    React.useEffect(() => {
        setPage(1);
    }, [search, selectedDepartment]);

    const staffMembers = React.useMemo(() => flattenDepartments(departments), [departments]);

    const filteredMembers = React.useMemo(() => {
        const term = search.trim().toLowerCase();

        return staffMembers.filter((member) => {
            const matchesDepartment =
                selectedDepartment === "all" || String(member.department_id) === selectedDepartment;

            const haystack = [
                member.name,
                member.email,
                member.contact,
                member.department_name,
                member.employee_id
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch = !term || haystack.includes(term);
            return matchesDepartment && matchesSearch;
        });
    }, [staffMembers, search, selectedDepartment]);

    const totalEmployees = staffMembers.length;
    const activeEmployees = staffMembers.filter((member) => member.is_active_now).length;
    const inactiveEmployees = totalEmployees - activeEmployees;

    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginatedMembers = React.useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredMembers.slice(start, start + PAGE_SIZE);
    }, [filteredMembers, currentPage]);

    const rangeStart = filteredMembers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredMembers.length);

    const onInputChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    const handleExport = () => {
        const rows = [["Employee ID", "Name", "Email", "Department", "Status"]];

        filteredMembers.forEach((member) => {
            rows.push([
                member.employee_id || member.id,
                member.name || "",
                member.email || "",
                member.department_name || "",
                member.is_active_now ? "Active" : "Inactive"
            ]);
        });

        downloadBlob("staff-list.csv", buildCsv(rows), "text/csv;charset=utf-8");
    };

    const handleImportClick = () => {
        window.alert("Import UI is ready, but your project still needs a CSV import PHP endpoint before it can save records.");
    };

    const handleAddStaff = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name || !form.email || !form.password || !form.employee_id) {
            setError("Please complete the required fields.");
            return;
        }

        try {
            setSubmitting(true);

            const response = await fetch(ADD_STAFF_API, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    employee_id: form.employee_id
                })
            });

            const data = await readJsonSafe(response);

            if (!response.ok || data?.error) {
                throw new Error(data?.error || "Failed to add employee.");
            }

            setSuccess("Employee account added successfully.");
            setIsModalOpen(false);
            resetForm();
            await loadStaff();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to add employee.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStaff = async (staffId, staffName) => {
        const confirmed = window.confirm(`Delete ${staffName}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            setBusyId(staffId);
            setError("");
            setSuccess("");

            const response = await fetch(DELETE_STAFF_API, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({ id: Number(staffId) })
            });

            const data = await readJsonSafe(response);

            if (!response.ok || data?.error) {
                throw new Error(data?.error || "Failed to delete employee.");
            }

            setSuccess(`${staffName} was removed successfully.`);
            await loadStaff();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to delete employee.");
        } finally {
            setBusyId(null);
        }
    };

    const handleToggleStatus = async (member) => {
        const nextStatus = member.is_active_now ? 0 : 1;
        const actionLabel = nextStatus === 1 ? "activate" : "deactivate";
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} ${member.name || "this employee"}?`);
        if (!confirmed) return;

        try {
            setBusyId(member.id);
            setError("");
            setSuccess("");

            const response = await fetch(TOGGLE_STAFF_STATUS_API, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    id: Number(member.id),
                    is_active: nextStatus
                })
            });

            const data = await readJsonSafe(response);

            if (!response.ok || data?.error) {
                throw new Error(data?.error || `Failed to ${actionLabel} employee.`);
            }

            setSuccess(`${member.name || "Employee"} is now ${nextStatus === 1 ? "active" : "inactive"}.`);
            await loadStaff();
        } catch (err) {
            console.error(err);
            setError(err.message || `Failed to ${actionLabel} employee.`);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <div className="employee-page-wrap container-fluid py-4">
                <div className="employee-page-header">
                    <div>
                        <h1 className="employee-page-title">{totalEmployees || 0} Employees</h1>
                        <div className="employee-legend-row">
                            <span className="employee-legend-item is-green">
                                <span></span> Active {activeEmployees}
                            </span>
                            <span className="employee-legend-item is-red">
                                <span></span> Inactive {inactiveEmployees}
                            </span>
                        </div>
                    </div>

                    <div className="employee-actions-bar">
                        <button type="button" className="btn employee-toolbar-btn" onClick={handleImportClick}>
                            <i className="bi bi-arrow-clockwise me-2"></i>
                            Import
                        </button>
                        <button type="button" className="btn employee-toolbar-btn" onClick={handleExport}>
                            <i className="bi bi-box-arrow-up-right me-2"></i>
                            Export
                        </button>
                        <button
                            type="button"
                            className="btn employee-toolbar-add-btn"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <i className="bi bi-plus-lg me-2"></i>
                            Add Employee
                        </button>
                    </div>
                </div>

                <div className="employee-toolbar-panel">
                    <div className="employee-toolbar-grid">
                        <div className="employee-toolbar-field flex-grow-1">
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search employee, email, or department"
                            />
                        </div>

                        <select
                            className="form-select employee-filter-select"
                            value={selectedDepartment}
                            onChange={(event) => setSelectedDepartment(event.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {departmentOptions.map((department) => (
                                <option key={department.department_id} value={department.department_id}>
                                    {department.department_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-danger employee-alert-card" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success employee-alert-card" role="alert">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        {success}
                    </div>
                )}

                {loading ? (
                    <div className="employee-loading-card">
                        <div className="spinner-border text-secondary mb-3" role="status"></div>
                        <div>Loading employees...</div>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="employee-empty-card">
                        <i className="bi bi-people"></i>
                        <h4>No employees found</h4>
                        <p>Try another search keyword or add a new employee.</p>
                    </div>
                ) : (
                    <>
                        <div className="row g-3">
                            {paginatedMembers.map((member) => (
                                <div className="col-12 col-md-6 col-xl-4" key={member.id}>
                                    <EmployeeCard
                                        member={member}
                                        busyId={busyId}
                                        onDelete={handleDeleteStaff}
                                        onToggleStatus={handleToggleStatus}
                                    />
                                    {busyId === member.id ? (
                                        <div className="small text-secondary mt-2">Updating employee...</div>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        <div className="employee-pagination-wrap">
                            <p className="employee-pagination-text mb-0">
                                Showing {rangeStart} to {rangeEnd} of {filteredMembers.length} entries
                            </p>

                            <div className="employee-pagination-actions">
                                <button
                                    type="button"
                                    className="btn employee-page-btn"
                                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    className="btn employee-page-btn"
                                    onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AddEmployeeModal
                open={isModalOpen}
                form={form}
                submitting={submitting}
                onInputChange={onInputChange}
                onSubmit={handleAddStaff}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
            />
        </>
    );
}

const root = document.getElementById("staff-management-root");
if (root) {
    ReactDOM.createRoot(root).render(<StaffManagementPage />);
}
