const STAFF_LIST_API = "php/get_staff_by_department.php";
const ADD_STAFF_API = "php/add_staff.php";
const DELETE_STAFF_API = "php/delete_staff.php";

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

function StaffManagementPage() {
    const [departments, setDepartments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [selectedDepartment, setSelectedDepartment] = React.useState("all");
    const [submitting, setSubmitting] = React.useState(false);
    const [deletingId, setDeletingId] = React.useState(null);
    const [form, setForm] = React.useState({
        name: "",
        email: "",
        password: "",
        department_id: "",
        contact: "",
        address: ""
    });

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

            setForm((prev) => {
                if (prev.department_id) return prev;
                const firstDepartmentId = normalized[0]?.department_id || "";
                return { ...prev, department_id: String(firstDepartmentId) };
            });
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
        if (!success) return;
        const timeoutId = window.setTimeout(() => setSuccess(""), 3500);
        return () => window.clearTimeout(timeoutId);
    }, [success]);

    const departmentOptions = React.useMemo(() => {
        return departments.map((dept) => ({
            department_id: String(dept.department_id),
            department_name: dept.department_name || "Unassigned"
        }));
    }, [departments]);

    const filteredDepartments = React.useMemo(() => {
        const term = search.trim().toLowerCase();

        return departments
            .filter((dept) => {
                if (selectedDepartment === "all") return true;
                return String(dept.department_id) === selectedDepartment;
            })
            .map((dept) => {
                const staff = Array.isArray(dept.staff) ? dept.staff : [];
                const filteredStaff = !term
                    ? staff
                    : staff.filter((member) => {
                          const name = String(member.name || "").toLowerCase();
                          const email = String(member.email || "").toLowerCase();
                          const contact = String(member.contact || "").toLowerCase();
                          return (
                              name.includes(term) ||
                              email.includes(term) ||
                              contact.includes(term)
                          );
                      });

                return {
                    ...dept,
                    staff: filteredStaff
                };
            })
            .filter((dept) => dept.staff.length > 0 || !search.trim());
    }, [departments, search, selectedDepartment]);

    const totalStaff = React.useMemo(() => {
        return departments.reduce((sum, dept) => sum + (Array.isArray(dept.staff) ? dept.staff.length : 0), 0);
    }, [departments]);

    const onInputChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setForm({
            name: "",
            email: "",
            password: "",
            department_id: departmentOptions[0]?.department_id || "",
            contact: "",
            address: ""
        });
    };

    const handleAddStaff = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name || !form.email || !form.password || !form.department_id) {
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
                    department_id: Number(form.department_id),
                    contact: form.contact,
                    address: form.address
                })
            });

            const data = await readJsonSafe(response);

            if (!response.ok || data?.error) {
                throw new Error(data?.error || "Failed to add staff.");
            }

            setSuccess("Staff account added successfully.");
            resetForm();
            await loadStaff();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to add staff.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStaff = async (staffId, staffName) => {
        const confirmed = window.confirm(`Delete ${staffName}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            setDeletingId(staffId);
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
                throw new Error(data?.error || "Failed to delete staff.");
            }

            setSuccess(`${staffName} was removed successfully.`);
            await loadStaff();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to delete staff.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                <div>
                    <h1 className="page-title mb-1">Staff Management</h1>
                    <p className="text-body-secondary mb-0">
                        Add staff accounts and manage department members in one page.
                    </p>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                    <span className="summary-chip">
                        <i className="bi bi-people-fill"></i>
                        {totalStaff} Total Staff
                    </span>
                    <span className="summary-chip">
                        <i className="bi bi-diagram-3-fill"></i>
                        {departments.length} Departments
                    </span>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger soft-card" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success soft-card" role="alert">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {success}
                </div>
            )}

            <div className="row g-4">
                <div className="col-12 col-xl-4">
                    <div className="soft-card p-4 h-100">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                                <h4 className="mb-1">Add New Staff</h4>
                                <p className="text-body-secondary mb-0 small">
                                    Create a staff account and assign a department.
                                </p>
                            </div>
                            <span className="badge text-bg-primary rounded-pill px-3 py-2">
                                New
                            </span>
                        </div>

                        <form onSubmit={handleAddStaff} className="row g-3">
                            <div className="col-12">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    value={form.name}
                                    onChange={onInputChange}
                                    placeholder="Enter full name"
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
                                <input
                                    type="password"
                                    className="form-control"
                                    name="password"
                                    value={form.password}
                                    onChange={onInputChange}
                                    placeholder="Enter password"
                                    required
                                />
                            </div>

                            <div className="col-12">
                                <label className="form-label">Department</label>
                                <select
                                    className="form-select"
                                    name="department_id"
                                    value={form.department_id}
                                    onChange={onInputChange}
                                    required
                                >
                                    <option value="">Select department</option>
                                    {departmentOptions.map((dept) => (
                                        <option key={dept.department_id} value={dept.department_id}>
                                            {dept.department_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-12 col-md-6 col-xl-12">
                                <label className="form-label">Contact</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="contact"
                                    value={form.contact}
                                    onChange={onInputChange}
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="col-12">
                                <label className="form-label">Address</label>
                                <textarea
                                    className="form-control"
                                    name="address"
                                    rows="3"
                                    value={form.address}
                                    onChange={onInputChange}
                                    placeholder="Optional"
                                ></textarea>
                            </div>

                            <div className="col-12 d-grid">
                                <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
                                    {submitting ? "Saving..." : "Add Staff"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="col-12 col-xl-8">
                    <div className="soft-card p-4 mb-4">
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                            <div>
                                <h4 className="mb-1">Department Staff List</h4>
                                <p className="text-body-secondary mb-0 small">
                                    Browse all staff grouped by department.
                                </p>
                            </div>

                            <div className="toolbar-wrap">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search name, email, contact"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />

                                <select
                                    className="form-select"
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                >
                                    <option value="all">All Departments</option>
                                    {departmentOptions.map((dept) => (
                                        <option key={dept.department_id} value={dept.department_id}>
                                            {dept.department_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="soft-card p-5 text-center">
                            <div className="spinner-border text-primary mb-3" role="status"></div>
                            <div className="fw-semibold">Loading staff records...</div>
                        </div>
                    ) : filteredDepartments.length === 0 ? (
                        <div className="empty-state">
                            <div className="mb-3">
                                <i className="bi bi-people" style={{ fontSize: "2rem" }}></i>
                            </div>
                            <h5 className="mb-1">No staff found</h5>
                            <p className="text-body-secondary mb-0">
                                Try another search term or add a new staff member.
                            </p>
                        </div>
                    ) : (
                        <div className="accordion" id="departmentAccordion">
                            {filteredDepartments.map((dept, index) => {
                                const collapseId = `dept-collapse-${dept.department_id || index}`;
                                const headingId = `dept-heading-${dept.department_id || index}`;
                                const members = Array.isArray(dept.staff) ? dept.staff : [];

                                return (
                                    <div
                                        className="accordion-item soft-card mb-3 overflow-hidden"
                                        key={dept.department_id || index}
                                    >
                                        <h2 className="accordion-header" id={headingId}>
                                            <button
                                                className={`accordion-button ${index !== 0 ? "collapsed" : ""}`}
                                                type="button"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseId}`}
                                                aria-expanded={index === 0 ? "true" : "false"}
                                                aria-controls={collapseId}
                                            >
                                                <div className="department-header w-100 me-3">
                                                    <div>
                                                        <h5 className="department-name">
                                                            {dept.department_name || "Unassigned Department"}
                                                        </h5>
                                                        <p className="department-subtext">
                                                            {members.length} staff member{members.length !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                    <span className="badge text-bg-secondary rounded-pill px-3 py-2">
                                                        Department ID: {dept.department_id || "-"}
                                                    </span>
                                                </div>
                                            </button>
                                        </h2>

                                        <div
                                            id={collapseId}
                                            className={`accordion-collapse collapse ${index === 0 ? "show" : ""}`}
                                            aria-labelledby={headingId}
                                            data-bs-parent="#departmentAccordion"
                                        >
                                            <div className="accordion-body p-0">
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle mb-0 staff-table">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>Staff</th>
                                                                <th>Email</th>
                                                                <th>Contact</th>
                                                                <th>Address</th>
                                                                <th className="text-end">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {members.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan="5" className="text-center py-4 text-body-secondary">
                                                                        No staff in this department.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                members.map((member) => (
                                                                    <tr key={member.id}>
                                                                        <td>
                                                                            <div className="staff-row-main">
                                                                                <span className="avatar-badge">
                                                                                    {getInitials(member.name)}
                                                                                </span>
                                                                                <div>
                                                                                    <div className="fw-semibold">{member.name || "-"}</div>
                                                                                    <div className="text-body-secondary small">
                                                                                        Staff ID: {member.id || "-"}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td>{member.email || "-"}</td>
                                                                        <td>{member.contact || "-"}</td>
                                                                        <td>{member.address || "-"}</td>
                                                                        <td className="text-end">
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-outline-danger btn-sm"
                                                                                onClick={() =>
                                                                                    handleDeleteStaff(
                                                                                        member.id,
                                                                                        member.name || "this staff member"
                                                                                    )
                                                                                }
                                                                                disabled={deletingId === member.id}
                                                                            >
                                                                                <i className="bi bi-trash3 me-1"></i>
                                                                                {deletingId === member.id ? "Deleting..." : "Delete"}
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const root = document.getElementById("staff-management-root");
if (root) {
    ReactDOM.createRoot(root).render(<StaffManagementPage />);
}