/* ---------------- Gantt Chart Page ---------------- */
function GanttChartPage() {
    return (
        <div className="card p-3" style={{ borderColor: '#ffb366' }}>
            
            <div style={{ height: '300px', background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                <span style={{ color: '#ff7f2a' }}>Gantt Chart here</span>
            </div>
        </div>
    );
}

/* ---------------- Render the Gantt Chart Page ---------------- */
ReactDOM.createRoot(document.getElementById('gantt-chart-root')).render(<GanttChartPage />);