/* ---------------- Manage Staffs ---------------- */
function ManageStaffs() {
    const [staffs, setStaffs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [pageError, setPageError] = React.useState("");

    const [addModalOpen, setAddModalOpen] = React.useState(false);
    const [addData, setAddData] = React.useState({
        name: "",
        email: "",
        password: "",
        department_id: "",
        contact: "",
        address: ""
    });
    const [addLoading, setAddLoading] = React.useState(false);
    const [addError, setAddError] = React.useState(null);

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedStaff, setSelectedStaff] = React.useState(null);
    const [staffInfo, setStaffInfo] = React.useState(null);
    const [infoLoading, setInfoLoading] = React.useState(false);

    const [editMode, setEditMode] = React.useState(false);
    const [editData, setEditData] = React.useState({});
    const [actionLoading, setActionLoading] = React.useState(false);
    const [deleteError, setDeleteError] = React.useState(null);

    function extractArray(payload, keys = []) {
        if (Array.isArray(payload)) return payload;
        for (const key of keys) {
            if (Array.isArray(payload?.[key])) return payload[key];
        }
        return [];
    }

    async function loadStaffs() {
        try {
            setLoading(true);
            setPageError("");

            const res = await fetch("php/get_staff_performance.php", {
                headers: { Accept: "application/json" }
            });

            const json = await res.json().catch(() => []);
            const safeStaffs = extractArray(json, ["staffs", "data", "results"]);

            setStaffs(safeStaffs);

            if (!res.ok) {
                setPageError("Failed to load staff list.");
            }
        } catch (error) {
            console.error("Failed to load staffs", error);
            setStaffs([]);
            setPageError("Failed to load staff list.");
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        loadStaffs();
    }, []);

    React.useEffect(() => {
        if (!addData.department_id && staffs.length > 0) {
            setAddData((d) => ({ ...d, department_id: staffs[0]?.department_id || "" }));
        }
    }, [staffs]);

    const openAddModal = () => {
        setAddModalOpen(true);
        setAddData({
            name: "",
            email: "",
            password: "",
            department_id: staffs[0]?.department_id || "",
            contact: "",
            address: ""
        });
        setAddError(null);
    };

    const closeAddModal = () => {
        setAddModalOpen(false);
        setAddError(null);
    };

    const handleAddChange = (e) => {
        const { name, value } = e.target;
        setAddData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        setAddError(null);

        try {
            const res = await fetch("php/add_staff.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(addData)
            });

            const data = await res.json().catch(() => ({}));

            if (data.success) {
                await loadStaffs();
                closeAddModal();
            } else {
                setAddError(data.error || "Add failed");
            }
        } catch (error) {
            console.error("Add staff failed", error);
            setAddError("Add failed");
        } finally {
            setAddLoading(false);
        }
    };

    const handleStaffCardClick = async (staff) => {
        setSelectedStaff(staff);
        setInfoLoading(true);
        setModalOpen(true);
        setStaffInfo(null);
        setEditMode(false);
        setEditData({});
        setDeleteError(null);

        try {
            const res = await fetch(`php/get_staff_info.php?id=${staff.id}`, {
                headers: { Accept: "application/json" }
            });
            const data = await res.json().catch(() => ({ error: "Failed to load info" }));
            setStaffInfo(data);
        } catch (error) {
            console.error("Failed to load staff info", error);
            setStaffInfo({ error: "Failed to load info" });
        } finally {
            setInfoLoading(false);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setStaffInfo(null);
        setSelectedStaff(null);
        setEditMode(false);
        setEditData({});
        setDeleteError(null);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEdit = () => {
        setEditMode(true);
        setEditData({
            name: staffInfo?.name || "",
            email: staffInfo?.email || "",
            contact: staffInfo?.contact || "",
            address: staffInfo?.address || ""
        });
    };

    const handleSave = async () => {
        setActionLoading(true);
        setDeleteError(null);

        try {
            const res = await fetch("php/update_staff_info.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: staffInfo.id,
                    ...editData
                })
            });

            const data = await res.json().catch(() => ({}));

            if (data.success) {
                setStaffInfo((prev) => ({ ...prev, ...editData }));
                setEditMode(false);

                setStaffs((prev) =>
                    prev.map((s) =>
                        s.id === staffInfo.id
                            ? {
                                  ...s,
                                  name: editData.name,
                                  email: editData.email,
                                  contact: editData.contact,
                                  address: editData.address
                              }
                            : s
                    )
                );
            } else {
                setDeleteError(data.error || "Update failed");
            }
        } catch (error) {
            console.error("Update failed", error);
            setDeleteError("Update failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this staff?")) return;

        setActionLoading(true);
        setDeleteError(null);

        try {
            const res = await fetch("php/delete_staff.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: staffInfo.id })
            });

            const data = await res.json().catch(() => ({}));

            if (data.success) {
                setStaffs((prev) => prev.filter((s) => s.id !== staffInfo.id));
                closeModal();
            } else {
                setDeleteError(data.error || "Delete failed");
            }
        } catch (error) {
            console.error("Delete failed", error);
            setDeleteError("Delete failed");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <>
            {pageError && (
                <div className="alert alert-warning" role="alert">
                    {pageError}
                </div>
            )}

            <div className="card p-3" style={{ borderColor: "#ffb366" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5>Staff List</h5>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        + Add Staff
                    </button>
                </div>

                <div
                    style={{
                        minHeight: "300px",
                        background: "#fff3e0",
                        borderRadius: "8px",
                        padding: "20px"
                    }}
                >
                    {loading ? (
                        <div className="text-center text-warning">Loading staff list...</div>
                    ) : staffs.length === 0 ? (
                        <div className="text-center text-danger">No staff found.</div>
                    ) : (
                        <div className="row g-3">
                            {staffs.map((s) => (
                                <div className="col-md-4" key={s.id || s.email || s.name}>
                                    <div
                                        className="card summary-card h-100 p-3 d-flex flex-column align-items-start"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => handleStaffCardClick(s)}
                                    >
                                        <h6 className="mb-2" style={{ color: "#cc7a00" }}>
                                            {s.name || "-"}
                                        </h6>
                                        <div className="mb-1">
                                            <strong>Email:</strong> {s.email || "-"}
                                        </div>
                                        <div className="mb-1">
                                            <strong>Department ID:</strong> {s.department_id || "-"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {addModalOpen && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.3)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog">
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
                                    <div className="mb-2">
                                        <label className="form-label"><strong>Name:</strong></label>
                                        <input type="text" className="form-control" name="name" value={addData.name} onChange={handleAddChange} required />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label"><strong>Email:</strong></label>
                                        <input type="email" className="form-control" name="email" value={addData.email} onChange={handleAddChange} required />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label"><strong>Password:</strong></label>
                                        <input type="password" className="form-control" name="password" value={addData.password} onChange={handleAddChange} required />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label"><strong>Department ID:</strong></label>
                                        <input type="text" className="form-control" name="department_id" value={addData.department_id} onChange={handleAddChange} required />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label"><strong>Contact:</strong></label>
                                        <input type="text" className="form-control" name="contact" value={addData.contact} onChange={handleAddChange} />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label"><strong>Address:</strong></label>
                                        <input type="text" className="form-control" name="address" value={addData.address} onChange={handleAddChange} />
                                    </div>

                                    {addError && <div className="text-danger mb-2">{addError}</div>}
                                </div>

                                <div className="modal-footer">
                                    <button type="submit" className="btn btn-primary" disabled={addLoading}>Add</button>
                                    <button type="button" className="btn btn-secondary" onClick={closeAddModal} disabled={addLoading}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {modalOpen && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.3)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Staff Information</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeModal}
                                    disabled={actionLoading}
                                ></button>
                            </div>

                            <div className="modal-body">
                                {infoLoading ? (
                                    <div className="text-center text-warning">Loading...</div>
                                ) : staffInfo && staffInfo.error ? (
                                    <div className="text-danger">{staffInfo.error}</div>
                                ) : staffInfo ? (
                                    <div>
                                        {editMode ? (
                                            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                                                <div className="mb-2">
                                                    <label className="form-label"><strong>Name:</strong></label>
                                                    <input type="text" className="form-control" name="name" value={editData.name} onChange={handleEditChange} required />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="form-label"><strong>Email:</strong></label>
                                                    <input type="email" className="form-control" name="email" value={editData.email} onChange={handleEditChange} required />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="form-label"><strong>Contact:</strong></label>
                                                    <input type="text" className="form-control" name="contact" value={editData.contact} onChange={handleEditChange} />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="form-label"><strong>Address:</strong></label>
                                                    <input type="text" className="form-control" name="address" value={editData.address} onChange={handleEditChange} />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="form-label"><strong>Role:</strong></label>
                                                    <input type="text" className="form-control" value={staffInfo.role || ""} disabled />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="form-label"><strong>Department ID:</strong></label>
                                                    <input type="text" className="form-control" value={staffInfo.department_id || ""} disabled />
                                                </div>
                                            </form>
                                        ) : (
                                            <div>
                                                <p><strong>Name:</strong> {staffInfo.name || "-"}</p>
                                                <p><strong>Email:</strong> {staffInfo.email || "-"}</p>
                                                <p><strong>Role:</strong> {staffInfo.role || "-"}</p>
                                                <p><strong>Department ID:</strong> {staffInfo.department_id || "-"}</p>
                                                <p><strong>Contact:</strong> {staffInfo.contact || "-"}</p>
                                                <p><strong>Address:</strong> {staffInfo.address || "-"}</p>
                                            </div>
                                        )}

                                        {deleteError && <div className="text-danger mb-2">{deleteError}</div>}
                                    </div>
                                ) : null}
                            </div>

                            <div className="modal-footer">
                                {editMode ? (
                                    <>
                                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={actionLoading}>Save</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)} disabled={actionLoading}>Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn btn-warning" onClick={handleEdit} disabled={actionLoading}>Edit</button>
                                        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={actionLoading}>Delete</button>
                                        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={actionLoading}>Close</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ---------------- Render the Manage Staffs ---------------- */
const manageStaffRoot = document.getElementById("manage-staffs-root");

if (manageStaffRoot) {
    ReactDOM.createRoot(manageStaffRoot).render(<ManageStaffs />);
} else {
    console.error("manage-staffs-root not found");
}