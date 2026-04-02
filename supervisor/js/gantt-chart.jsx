/* ---------------- Gantt Chart Page ---------------- */
function GanttChartPage() {
    return (
        <div className="container-fluid">
            <div className="card shadow-sm p-3" style={{ borderColor: "#ffb366" }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Project Timeline</h5>
                </div>

                <div
                    style={{
                        minHeight: "300px",
                        background: "#fff3e0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "8px",
                        border: "1px dashed #ffb366"
                    }}
                >
                    <span style={{ color: "#ff7f2a", fontWeight: "600" }}>
                        Gantt Chart here
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ---------------- Render the Gantt Chart Page ---------------- */
const ganttRoot = document.getElementById("gantt-chart-root");

if (ganttRoot) {
    ReactDOM.createRoot(ganttRoot).render(<GanttChartPage />);
} else {
    console.error("gantt-chart-root not found");
}