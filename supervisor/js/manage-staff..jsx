import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

const STAFF_LIST_API = "php/get_staff_performance.php";
const STAFF_INFO_API = (id) => `php/get_staff_info.php?id=${encodeURIComponent(id)}`;
const ADD_STAFF_API = "php/add_staff.php";
const UPDATE_STAFF_API = "php/update_staff_info.php";
const DELETE_STAFF_API = "php/delete_staff.php";

async function parseJsonResponse(response) {
    const rawText = await response.text();

    if (!rawText || !rawText.trim()) {
        return {};
    }

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Invalid JSON response:", rawText);
        throw new Error("Server returned invalid JSON.");
    }
}

function extractArray(payload, keys = []) {
    if (Array.isArray(payload)) return payload;

    for (const key of keys) {
        if (Array.isArray(payload?.[key])) {
            return payload[key];
        }
    }

    return [];
}

function extractObject(payload, keys = []) {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        for (const key of keys) {
            if (
                payload[key] &&
                typeof payload[key] === "object" &&
                !Array.isArray(payload[key])
            ) {
                return payload[key];
            }
        }

        return payload;
    }

    return null;
}

function buildInitialAddData(defaultDepartmentId = "") {
    return {
        name: "",
        email: "",
        password: "",
        department_id: defaultDepartmentId,
        contact: "",
        address: ""
    };
}

function ManageStaffs() {
    const [staffs, setStaffs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [pageError, setPageError] = React.useState("");

    const [addModalOpen, setAddModalOpen] = React.useState(false);
    const [addData, setAddData] = React.useState(buildInitialAddData());
    const [addLoading, setAddLoading] = React.useState(false);
    const [addError, setAddError] = React.useState("");

    const [infoModalOpen, setInfoModalOpen] = React.useState(false);
    const [staffInfo, setStaffInfo] = React.useState(null);
    const [infoLoading, setInfoLoading] = React.useState(false);

    const [editMode, setEditMode] = React.useState(false);
    const [editData, setEditData] = React.useState({
        name: "",
        email: "",
        contact: "",
        address: ""
    });
    const [actionLoading, setActionLoading] = React.useState(false);
    const [actionError, setActionError] = React.useState("");

    const defaultDepartmentId = staffs[0]?.department_id || "";

    const loadStaffs = React.useCallback(async () => {
        try {
            setLoading(true);
            setPageError("");

            const response = await fetch(STAFF_LIST_API, {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });

            const payload = await parseJsonResponse(response);
            const safeStaffs = extractArray(payload, ["staffs", "data", "results"]);

            setStaffs(safeStaffs);

            if (!response.ok) {
                setPageError(payload?.error || "Failed to load staff list.");
            }
        } catch (error) {
            console.error("Failed to load staffs:", error);
            setStaffs([]);
            setPageError(error.message || "Failed to load staff list.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadStaffs();
    }, [loadStaffs]);

    React.useEffect(() => {
        if (!addModalOpen) return;

        setAddData((prev) => {
            if (prev.department_id) return prev;
            return { ...prev, department_id: defaultDepartmentId };
        });
    }, [addModalOpen, defaultDepartmentId]);

    function openAddModal() {
        setAddModalOpen(true);
        setAddData(buildInitialAddData(defaultDepartmentId));
        setAddError("");
    }

    function closeAddModal() {
        setAddModalOpen(false);
        setAddError("");
        setAddLoading(false);
    }

    function closeInfoModal() {
        setInfoModalOpen(false);
        setStaffInfo(null);
        setInfoLoading(false);
        setEditMode(false);
        setEditData({
            name: "",
            email: "",
            contact: "",
            address: ""
        });
        setActionError("");
        setActionLoading(false);
    }

    function handleAddChange(event) {
        const { name, value } = event.target;
        setAddData((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    function handleEditChange(event) {
        const { name, value } = event.target;
        setEditData((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    async function handleAddSubmit(event) {
        event.preventDefault();
        setAddLoading(true);
        setAddError("");

        const payload = {
            name: addData.name.trim(),
            email: addData.email.trim(),
            password: addData.password,
            department_id: addData.department_id.trim(),
            contact: addData.contact.trim(),
            address: addData.address.trim()
        };

        try {
            const response = await fetch(ADD_STAFF_API, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Add failed");
            }

            await loadStaffs();
            closeAddModal();
        } catch (error) {
            console.error("Add staff failed:", error);
            setAddError(error.message || "Add failed");
        } finally {
            setAddLoading(false);
        }
    }

    async function openStaffInfo(staff) {
        setInfoModalOpen(true);
        setInfoLoading(true);
        setStaffInfo(null);
        setEditMode(false);
        setActionError("");

        try {
            const response = await fetch(STAFF_INFO_API(staff.id), {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });

            const payload = await parseJsonResponse(response);
            const info = extractObject(payload, ["staff", "data", "result"]);

            if (!response.ok) {
                throw new Error(payload?.error || "Failed to load info");
            }

            if (!info || typeof info !== "object") {
                throw new Error("No staff information was returned.");
            }

            setStaffInfo(info);
        } catch (error) {
            console.error("Failed to load staff info:", error);
            setStaffInfo({
                error: error.message || "Failed to load info"
            });
        } finally {
            setInfoLoading(false);
        }
    }

    function startEdit() {
        if (!staffInfo || staffInfo.error) return;

        setEditMode(true);
        setActionError("");
        setEditData({
            name: staffInfo.name || "",
            email: staffInfo.email || "",
            contact: staffInfo.contact || "",
            address: staffInfo.address || ""
        });
    }

    async function handleSave() {
        if (!staffInfo?.id) {
            setActionError("Missing staff ID.");
            return;
        }

        setActionLoading(true);
        setActionError("");

        const payload = {
            id: staffInfo.id,
            name: (editData.name || "").trim(),
            email: (editData.email || "").trim(),
            contact: (editData.contact || "").trim(),
            address: (editData.address || "").trim()
        };

        try {
            const response = await fetch(UPDATE_STAFF_API, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Update failed");
            }

            setStaffInfo((prev) => ({
                ...prev,
                ...payload
            }));

            setStaffs((prev) =>
                prev.map((staff) =>
                    staff.id === payload.id
                        ? {
                              ...staff,
                              name: payload.name,
                              email: payload.email,
                              contact: payload.contact,
                              address: payload.address
                          }
                        : staff
                )
            );

            setEditMode(false);
        } catch (error) {
            console.error("Update failed:", error);
            setActionError(error.message || "Update failed");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDelete() {
        if (!staffInfo?.id) {
            setActionError("Missing staff ID.");
            return;
        }

        const confirmed = window.confirm("Are you sure you want to delete this staff?");
        if (!confirmed) return;

        setActionLoading(true);
        setActionError("");

        try {
            const response = await fetch(DELETE_STAFF_API, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({ id: staffInfo.id })
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Delete failed");
            }

            setStaffs((prev) => prev.filter((staff) => staff.id !== staffInfo.id));
            closeInfoModal();
        } catch (error) {
            console.error("Delete failed:", error);
            setActionError(error.message || "Delete failed");
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div className="container-fluid py-3">
            {pageError && (
                <div className="alert alert-warning mb-3" role="alert">
                    {pageError}
                </div>
            )}

            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h4 className="mb-1">Manage Staff</h4>
                            <div className="text-body-secondary">
                                View, add, edit, and remove staff records
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={openAddModal}
                        >
                            <i className="bi bi-plus-lg me-2"></i>
                            Add Staff
                        </button>
                    </div>

                    <div
                        className="rounded-3"
                        style={{
                            minHeight: "320px",
                            background: "#fff3e0",
                            padding: "20px"
                        }}
                    >
                        {loading ? (
                            <div className="text-center text-warning py-5">
                                Loading staff list...
                            </div>
                        ) : staffs.length === 0 ? (
                            <div className="text-center text-danger py-5">
                                No staff found.
                            </div>
                        ) : (
                            <div className="row g-3">
                                {staffs.map((staff) => (
                                    <div
                                        className="col-12 col-md-6 col-xl-4"
                                        key={staff.id || staff.email || staff.name}
                                    >
                                        <button
                                            type="button"
                                            className="card h-100 border-0 shadow-sm text-start w-100"
                                            onClick={() => openStaffInfo(staff)}
                                            style={{
                                                cursor: "pointer",
                                                background: "#ffffff"
                                            }}
                                        >
                                            <div className="card-body">
                                                <h5
                                                    className="card-title mb-3"
                                                    style={{ color: "#cc7a00" }}
                                                >
                                                    {staff.name || "-"}
                                                </h5>

                                                <div className="mb-2">
                                                    <strong>Email:</strong> {staff.email || "-"}
                                                </div>

                                                <div>
                                                    <strong>Department ID:</strong>{" "}
                                                    {staff.department_id || "-"}
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {addModalOpen && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.35)" }}
                    tabIndex="-1"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Add Staff</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeAddModal}
                                    disabled={addLoading}
                                ></button>
                            </div>

                            <form onSubmit={handleAddSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="name"
                                            value={addData.name}
                                            onChange={handleAddChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            name="email"
                                            value={addData.email}
                                            onChange={handleAddChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            name="password"
                                            value={addData.password}
                                            onChange={handleAddChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Department ID</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="department_id"
                                            value={addData.department_id}
                                            onChange={handleAddChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Contact</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="contact"
                                            value={addData.contact}
                                            onChange={handleAddChange}
                                        />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label fw-bold">Address</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="address"
                                            value={addData.address}
                                            onChange={handleAddChange}
                                        />
                                    </div>

                                    {addError && (
                                        <div className="text-danger mt-3">{addError}</div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={addLoading}
                                    >
                                        {addLoading ? "Adding..." : "Add"}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={closeAddModal}
                                        disabled={addLoading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {infoModalOpen && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.35)" }}
                    tabIndex="-1"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Staff Information</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeInfoModal}
                                    disabled={actionLoading}
                                ></button>
                            </div>

                            <div className="modal-body">
                                {infoLoading ? (
                                    <div className="text-center text-warning py-3">
                                        Loading...
                                    </div>
                                ) : staffInfo?.error ? (
                                    <div className="text-danger">{staffInfo.error}</div>
                                ) : staffInfo ? (
                                    <>
                                        {editMode ? (
                                            <form
                                                onSubmit={(event) => {
                                                    event.preventDefault();
                                                    handleSave();
                                                }}
                                            >
                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="name"
                                                        value={editData.name}
                                                        onChange={handleEditChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">Email</label>
                                                    <input
                                                        type="email"
                                                        className="form-control"
                                                        name="email"
                                                        value={editData.email}
                                                        onChange={handleEditChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">Contact</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="contact"
                                                        value={editData.contact}
                                                        onChange={handleEditChange}
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">Address</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="address"
                                                        value={editData.address}
                                                        onChange={handleEditChange}
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">Role</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={staffInfo.role || ""}
                                                        disabled
                                                    />
                                                </div>

                                                <div className="mb-0">
                                                    <label className="form-label fw-bold">
                                                        Department ID
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={staffInfo.department_id || ""}
                                                        disabled
                                                    />
                                                </div>
                                            </form>
                                        ) : (
                                            <div>
                                                <p className="mb-2">
                                                    <strong>Name:</strong> {staffInfo.name || "-"}
                                                </p>
                                                <p className="mb-2">
                                                    <strong>Email:</strong> {staffInfo.email || "-"}
                                                </p>
                                                <p className="mb-2">
                                                    <strong>Role:</strong> {staffInfo.role || "-"}
                                                </p>
                                                <p className="mb-2">
                                                    <strong>Department ID:</strong>{" "}
                                                    {staffInfo.department_id || "-"}
                                                </p>
                                                <p className="mb-2">
                                                    <strong>Contact:</strong> {staffInfo.contact || "-"}
                                                </p>
                                                <p className="mb-0">
                                                    <strong>Address:</strong> {staffInfo.address || "-"}
                                                </p>
                                            </div>
                                        )}

                                        {actionError && (
                                            <div className="text-danger mt-3">{actionError}</div>
                                        )}
                                    </>
                                ) : null}
                            </div>

                            <div className="modal-footer">
                                {editMode ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleSave}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? "Saving..." : "Save"}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setEditMode(false);
                                                setActionError("");
                                            }}
                                            disabled={actionLoading}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-warning"
                                            onClick={startEdit}
                                            disabled={actionLoading || infoLoading || !!staffInfo?.error}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={handleDelete}
                                            disabled={actionLoading || infoLoading || !!staffInfo?.error}
                                        >
                                            {actionLoading ? "Deleting..." : "Delete"}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={closeInfoModal}
                                            disabled={actionLoading}
                                        >
                                            Close
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function mountManageStaffPage() {
    const mountNode = document.getElementById("manage-staffs-root");

    if (!mountNode) {
        console.error("manage-staffs-root not found");
        return;
    }

    if (mountNode.dataset.mounted === "true") {
        return;
    }

    try {
        mountNode.dataset.mounted = "true";
        createRoot(mountNode).render(<ManageStaffs />);
    } catch (error) {
        console.error("Manage Staff page failed to render:", error);
        mountNode.innerHTML = `
            <div class="container-fluid py-3">
                <div class="alert alert-danger" role="alert">
                    Failed to render the Manage Staff page. Open the browser console for details.
                </div>
            </div>
        `;
    }
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", mountManageStaffPage);
} else {
    mountManageStaffPage();
}