    // Department Management Component
    function DepartmentManagement() {
      const [departments, setDepartments] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState(null);
      const [showAdd, setShowAdd] = React.useState(false);
      const [newDept, setNewDept] = React.useState("");
      const [editId, setEditId] = React.useState(null);
      const [editName, setEditName] = React.useState("");

      React.useEffect(() => {
        fetchDepartments();
      }, []);

      function fetchDepartments() {
        setLoading(true);
        fetch("php/departments.php")
          .then(res => res.json())
          .then(data => {
            setDepartments(data.departments || []);
            setLoading(false);
          })
          .catch(e => {
            setError("Failed to load departments");
            setLoading(false);
          });
      }

      function handleAddDepartment(e) {
        e.preventDefault();
        if (!newDept.trim()) return;
        fetch("php/save_department.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newDept })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setNewDept("");
              setShowAdd(false);
              fetchDepartments();
            } else {
              setError(data.message || "Failed to add department");
            }
          });
      }

      function handleEditDepartment(id, name) {
        setEditId(id);
        setEditName(name);
      }

      function handleUpdateDepartment(e) {
        e.preventDefault();
        fetch("php/save_department.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, name: editName })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setEditId(null);
              setEditName("");
              fetchDepartments();
            } else {
              setError(data.message || "Failed to update department");
            }
          });
      }

      function handleDeleteDepartment(id) {
        if (!window.confirm("Delete this department?")) return;
        fetch("php/delete_department.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              fetchDepartments();
            } else {
              setError(data.message || "Failed to delete department");
            }
          });
      }

      return (
        <div className="container py-4">
          <h2 className="mb-4">Department Management</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <span className="fw-bold">Departments</span>
            <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>Add Department</button>
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : departments.length === 0 ? (
            <div className="alert-row">No departments found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{width: '60px'}}>#</th>
                    <th>Name</th>
                    <th style={{width: '160px'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, idx) => (
                    <tr key={dept.id}>
                      <td>{idx + 1}</td>
                      <td>
                        {editId === dept.id ? (
                          <form className="d-flex" onSubmit={handleUpdateDepartment}>
                            <input className="form-control form-control-sm me-2" value={editName} onChange={e => setEditName(e.target.value)} required />
                            <button className="btn btn-success btn-sm me-1" type="submit">Save</button>
                            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditId(null)}>Cancel</button>
                          </form>
                        ) : (
                          dept.name
                        )}
                      </td>
                      <td>
                        <button className="btn btn-warning btn-sm me-2" onClick={() => handleEditDepartment(dept.id, dept.name)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDepartment(dept.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Department Modal */}
          {showAdd && (
            <div className="modal show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.15)'}}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <form onSubmit={handleAddDepartment}>
                    <div className="modal-header">
                      <h5 className="modal-title">Add Department</h5>
                      <button type="button" className="btn-close" onClick={() => setShowAdd(false)}></button>
                    </div>
                    <div className="modal-body">
                      <input className="form-control" placeholder="Department Name" value={newDept} onChange={e => setNewDept(e.target.value)} required />
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Add</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

ReactDOM.createRoot(document.getElementById("root")).render(<DepartmentManagement />);
