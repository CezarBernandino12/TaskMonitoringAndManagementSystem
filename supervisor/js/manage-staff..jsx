
/* ---------------- Manage Staffs ---------------- */
function ManageStaffs() {
    // Add Staff Modal State
    const [addModalOpen, setAddModalOpen] = React.useState(false);
    const [addData, setAddData] = React.useState({ name: '', email: '', password: '', department_id: '', contact: '', address: '' });
    const [addLoading, setAddLoading] = React.useState(false);
    const [addError, setAddError] = React.useState(null);

    // Get department_id from first staff if available (for default)
    React.useEffect(() => {
        if (!addData.department_id && staffs.length > 0) {
            setAddData(d => ({ ...d, department_id: staffs[0].department_id || '' }));
        }
    }, [staffs]);

    const openAddModal = () => {
        setAddModalOpen(true);
        setAddData({ name: '', email: '', password: '', department_id: staffs[0]?.department_id || '', contact: '', address: '' });
        setAddError(null);
    };
    const closeAddModal = () => {
        setAddModalOpen(false);
        setAddError(null);
    };
    const handleAddChange = (e) => {
        setAddData({ ...addData, [e.target.name]: e.target.value });
    };
    const handleAddSubmit = (e) => {
        e.preventDefault();
        setAddLoading(true);
        setAddError(null);
        fetch('php/add_staff.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addData)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Refetch staff list
                    fetch('php/get_staff_performance.php')
                        .then(res => res.json())
                        .then(data => setStaffs(data));
                    closeAddModal();
                } else {
                    setAddError(data.error || 'Add failed');
                }
                setAddLoading(false);
            })
            .catch(() => {
                setAddError('Add failed');
                setAddLoading(false);
            });
    };
    const [staffs, setStaffs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedStaff, setSelectedStaff] = React.useState(null);
    const [staffInfo, setStaffInfo] = React.useState(null);
    const [infoLoading, setInfoLoading] = React.useState(false);

    React.useEffect(() => {
        fetch('php/get_staff_performance.php')
            .then(res => res.json())
            .then(data => {
                setStaffs(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Modal logic for showing staff info, with edit/delete
    const [editMode, setEditMode] = React.useState(false);
    const [editData, setEditData] = React.useState({});
    const [actionLoading, setActionLoading] = React.useState(false);
    const [deleteError, setDeleteError] = React.useState(null);

    const handleStaffCardClick = (staff) => {
        setSelectedStaff(staff);
        setInfoLoading(true);
        setModalOpen(true);
        setStaffInfo(null);
        setEditMode(false);
        setEditData({});
        setDeleteError(null);
        fetch(`php/get_staff_info.php?id=${staff.id}`)
            .then(res => res.json())
            .then(data => {
                setStaffInfo(data);
                setInfoLoading(false);
            })
            .catch(() => {
                setStaffInfo({ error: 'Failed to load info' });
                setInfoLoading(false);
            });
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
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };
    const handleEdit = () => {
        setEditMode(true);
        setEditData({
            name: staffInfo.name || '',
            email: staffInfo.email || '',
            contact: staffInfo.contact || '',
            address: staffInfo.address || ''
        });
    };
    const handleSave = () => {
        setActionLoading(true);
        setDeleteError(null);
        fetch('php/update_staff_info.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: staffInfo.id,
                ...editData
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStaffInfo({ ...staffInfo, ...editData });
                    setEditMode(false);
                    // Update staff name in card list if changed
                    setStaffs(staffs.map(s => s.id === staffInfo.id ? { ...s, name: editData.name, email: editData.email, contact: editData.contact, address: editData.address } : s));
                }
                setActionLoading(false);
            })
            .catch(() => setActionLoading(false));
    };
    const handleDelete = () => {
        if (!window.confirm('Are you sure you want to delete this staff?')) return;
        setActionLoading(true);
        setDeleteError(null);
        fetch('php/delete_staff.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: staffInfo.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStaffs(staffs.filter(s => s.id !== staffInfo.id));
                    closeModal();
                } else {
                    setDeleteError(data.error || 'Delete failed');
                }
                setActionLoading(false);
            })
            .catch(() => {
                setDeleteError('Delete failed');
                setActionLoading(false);
            });
    };

    return (
        <>
        <div className="card p-3" style={{ borderColor: '#ffb366' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5>Staff List</h5>
                <button className="btn btn-primary" onClick={openAddModal}>
                    + Add Staff
                </button>
            </div>
            <div style={{ minHeight: '300px', background: '#fff3e0', borderRadius: '8px', padding: '20px' }}>
                {loading ? (
                    <div className="text-center text-warning">Loading staff list...</div>
                ) : staffs.length === 0 ? (
                    <div className="text-center text-danger">No staff found.</div>
                ) : (
                    <div className="row g-3">
                        {staffs.map((s, idx) => (
                            <div className="col-md-4" key={idx}>
                                <div className="card summary-card h-100 p-3 d-flex flex-column align-items-start" style={{ cursor: 'pointer' }} onClick={() => handleStaffCardClick(s)}>
                                    <h6 className="mb-2" style={{ color: '#cc7a00' }}>{s.name}</h6>
                                    <div className="mb-1"><strong>Email:</strong> {s.email}</div>
                                    <div className="mb-1"><strong>Department ID:</strong> {s.department_id}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Add Staff Modal (unchanged) */}
        {addModalOpen && (
            <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Add Staff</h5>
                            <button type="button" className="btn-close" onClick={closeAddModal} disabled={addLoading}></button>
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

        {/* Modal for staff info (view, edit, delete) */}
        {modalOpen && (
            <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Staff Information</h5>
                            <button type="button" className="btn-close" onClick={closeModal} disabled={actionLoading}></button>
                        </div>
                        <div className="modal-body">
                            {infoLoading ? (
                                <div className="text-center text-warning">Loading...</div>
                            ) : staffInfo && staffInfo.error ? (
                                <div className="text-danger">{staffInfo.error}</div>
                            ) : staffInfo ? (
                                <div>
                                    {editMode ? (
                                        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
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
                                                <input type="text" className="form-control" value={staffInfo.role} disabled />
                                            </div>
                                            <div className="mb-2">
                                                <label className="form-label"><strong>Department ID:</strong></label>
                                                <input type="text" className="form-control" value={staffInfo.department_id} disabled />
                                            </div>
                                        </form>
                                    ) : (
                                        <div>
                                            <p><strong>Name:</strong> {staffInfo.name}</p>
                                            <p><strong>Email:</strong> {staffInfo.email}</p>
                                            <p><strong>Role:</strong> {staffInfo.role}</p>
                                            <p><strong>Department ID:</strong> {staffInfo.department_id}</p>
                                            <p><strong>Contact:</strong> {staffInfo.contact}</p>
                                            <p><strong>Address:</strong> {staffInfo.address}</p>
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
ReactDOM.createRoot(document.getElementById('manage-staffs-root')).render(<ManageStaffs />);
