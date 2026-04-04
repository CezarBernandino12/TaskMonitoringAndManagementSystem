const API_BASE = "http://localhost/taskmanagement/staff/php";
const TASKS_PER_PAGE = 5;
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const STATUS_OPTIONS = ["Ongoing", "Completed"];

function normalizeText(value = "") {
    return String(value).trim().toLowerCase();
}

function formatDate(dateStr) {
    if (!dateStr) return "-";

    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function parseYMD(value) {
    if (!value) return null;

    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
    return (
        a &&
        b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function formatCalendarMonth(date) {
    return date.toLocaleString("en-US", { month: "short" });
}

function getYearOptions(centerYear) {
    const startYear = 2000;
    const endYear = new Date().getFullYear() + 10;
    const years = [];

    for (let year = endYear; year >= startYear; year -= 1) {
        years.push(year);
    }

    if (!years.includes(centerYear)) {
        years.unshift(centerYear);
    }

    return years;
}

function getCalendarDays(viewDate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const mondayIndex = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayIndex);

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function formatDueDateChipLabel(value) {
    const parsed = parseYMD(value);
    if (!parsed) return "Due Date";

    return `Due Date ${parsed.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric"
    })}`;
}

function formatModalDateLabel(value, placeholder = "Select date") {
    const parsed = parseYMD(value);
    if (!parsed) return placeholder;

    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function getPriorityMeta(priority = "") {
    const normalized = normalizeText(priority);

    if (normalized === "high") {
        return {
            label: "High",
            chipClass: "priority-chip-high",
            dotClass: "priority-dot-high"
        };
    }

    if (normalized === "medium") {
        return {
            label: "Medium",
            chipClass: "priority-chip-medium",
            dotClass: "priority-dot-medium"
        };
    }

    return {
        label: "Low",
        chipClass: "priority-chip-low",
        dotClass: "priority-dot-low"
    };
}

function ModalDatePicker({
    label,
    value,
    onChange,
    placeholder = "Select date"
}) {
    const [open, setOpen] = React.useState(false);
    const selectedDate = parseYMD(value);
    const [viewDate, setViewDate] = React.useState(selectedDate || new Date());
    const rootRef = React.useRef(null);
    const today = new Date();

    const closePicker = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closePicker);

    React.useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate);
        }
    }, [selectedDate]);

    const days = React.useMemo(() => getCalendarDays(viewDate), [viewDate]);

    function handlePick(date) {
        onChange(formatYMD(date));
        closePicker();
    }

    function handleClear() {
        onChange("");
        closePicker();
    }

    return (
        <div className="task-form-field">
            <label className="form-label task-form-label">{label}</label>

            <div className="modal-picker-shell" ref={rootRef}>
                <button
                    type="button"
                    className={`modal-picker-trigger ${open ? "is-open" : ""} ${value ? "has-value" : ""}`}
                    onClick={() => setOpen((current) => !current)}
                    aria-expanded={open}
                    aria-haspopup="dialog"
                >
                    <span className={`modal-picker-trigger-text ${value ? "" : "is-placeholder"}`}>
                        {formatModalDateLabel(value, placeholder)}
                    </span>

                    <span className="modal-picker-trigger-icon">
                        <i className="bi bi-calendar3"></i>
                    </span>
                </button>

                {open && (
                    <div className="modal-calendar-popover" role="dialog" aria-label={label}>
                        <div className="modal-calendar-header">
                            <button
                                type="button"
                                className="modal-calendar-title"
                            >
                                {formatCalendarMonth(viewDate)} {viewDate.getFullYear()}
                                <i className="bi bi-chevron-down"></i>
                            </button>

                            <div className="modal-calendar-nav">
                                <button
                                    type="button"
                                    className="modal-calendar-nav-btn"
                                    onClick={() =>
                                        setViewDate(
                                            new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                                        )
                                    }
                                    aria-label="Previous month"
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>

                                <button
                                    type="button"
                                    className="modal-calendar-nav-btn"
                                    onClick={() =>
                                        setViewDate(
                                            new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                                        )
                                    }
                                    aria-label="Next month"
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        <div className="modal-calendar-weekdays">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                                <div key={day} className="modal-calendar-weekday">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="modal-calendar-grid">
                            {days.map((day) => {
                                const isOutside = day.getMonth() !== viewDate.getMonth();
                                const isSelected = isSameDay(day, selectedDate);
                                const isToday = isSameDay(day, today);

                                return (
                                    <button
                                        key={day.toISOString()}
                                        type="button"
                                        className={[
                                            "modal-calendar-day",
                                            isOutside ? "is-outside" : "",
                                            isSelected ? "is-selected" : "",
                                            !isSelected && isToday ? "is-today" : ""
                                        ].join(" ").trim()}
                                        onClick={() => handlePick(day)}
                                    >
                                        <span className="modal-calendar-day-number">
                                            {day.getDate()}
                                        </span>

                                        {isSelected && <span className="modal-calendar-day-dot"></span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="modal-calendar-footer">
                            <button
                                type="button"
                                className="modal-calendar-clear"
                                onClick={handleClear}
                            >
                                All dates
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ModalPriorityPicker({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef(null);

    const options = ["Low", "Medium", "High"];
    const currentMeta = getPriorityMeta(value);

    const closeMenu = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenu);

    return (
        <div className="task-form-field">
            <label className="form-label task-form-label">Priority</label>

            <div className="modal-picker-shell" ref={rootRef}>
                <button
                    type="button"
                    className={`modal-picker-trigger modal-priority-trigger ${open ? "is-open" : ""}`}
                    onClick={() => setOpen((current) => !current)}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className={`modal-priority-chip ${currentMeta.chipClass}`}>
                        <i className="bi bi-flag-fill"></i>
                        {currentMeta.label}
                    </span>

                    <span className="modal-picker-trigger-icon">
                        <i className="bi bi-chevron-down"></i>
                    </span>
                </button>

                {open && (
                    <div className="modal-priority-popover" role="listbox" aria-label="Choose priority">
                        {options.map((option) => {
                            const meta = getPriorityMeta(option);
                            const active = option === value;

                            return (
                                <button
                                    key={option}
                                    type="button"
                                    className={`modal-priority-option ${active ? "is-active" : ""}`}
                                    aria-selected={active}
                                    onClick={() => {
                                        onChange(option);
                                        closeMenu();
                                    }}
                                >
                                    <span className={`modal-priority-chip ${meta.chipClass}`}>
                                        <i className="bi bi-flag-fill"></i>
                                        {meta.label}
                                    </span>

                                    {active && <i className="bi bi-check2 modal-priority-check"></i>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatPriorityChipLabel(value) {
    if (!value || value === "all") return "Priority";
    return `Priority ${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getLaneKey(task = {}) {
    const normalized = normalizeText(task.status);

    if (normalized === "completed") return "completed";
    if (task.is_overdue || normalized === "overdue") return "overdue";
    return "ongoing";
}

function getLaneMeta(laneKey) {
    if (laneKey === "overdue") {
        return {
            title: "Overdue",
            badgeClass: "task-lane-badge task-lane-badge-overdue",
            dotClass: "task-lane-dot task-lane-dot-overdue"
        };
    }

    if (laneKey === "completed") {
        return {
            title: "Completed",
            badgeClass: "task-lane-badge task-lane-badge-completed",
            dotClass: "task-lane-dot task-lane-dot-completed"
        };
    }

    return {
        title: "Ongoing",
        badgeClass: "task-lane-badge task-lane-badge-ongoing",
        dotClass: "task-lane-dot task-lane-dot-ongoing"
    };
}

function getPriorityClass(priority = "") {
    const normalized = normalizeText(priority);

    if (normalized === "high") return "task-priority-high";
    if (normalized === "medium") return "task-priority-medium";
    return "task-priority-low";
}

function getPaginatedItems(items, currentPage, pageSize = TASKS_PER_PAGE) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;

    return {
        totalPages,
        currentPage: safePage,
        items: items.slice(startIndex, startIndex + pageSize)
    };
}

function useDismissiblePopup(rootRef, onClose) {
    React.useEffect(() => {
        function handleOutside(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                onClose();
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [rootRef, onClose]);
}

function TaskDateFilter({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
    const selectedDate = parseYMD(value);
    const [viewDate, setViewDate] = React.useState(selectedDate || new Date());
    const rootRef = React.useRef(null);
    const today = new Date();

    const closeMenus = React.useCallback(() => {
        setOpen(false);
        setYearMenuOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenus);

    React.useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate);
        }
    }, [selectedDate]);

    const days = React.useMemo(() => getCalendarDays(viewDate), [viewDate]);
    const years = React.useMemo(
        () => getYearOptions(viewDate.getFullYear()),
        [viewDate]
    );

    function pickDate(date) {
        onChange(formatYMD(date));
        closeMenus();
    }

    function clearDate() {
        onChange("");
        closeMenus();
    }

    function changeYear(year) {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setYearMenuOpen(false);
    }

    return (
        <div className="task-toolbar-filter-shell" ref={rootRef}>
            <button
                type="button"
                className={`task-toolbar-chip ${open ? "is-open" : ""} ${value ? "is-selected" : ""}`}
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <i className="bi bi-calendar3"></i>
                <span>{formatDueDateChipLabel(value)}</span>
                <i className="bi bi-chevron-down"></i>
            </button>

            {open && (
                <div className="task-toolbar-picker-popup" role="dialog" aria-label="Choose due date">
                    <div className="task-toolbar-picker-header">
                        <div className="task-toolbar-picker-title">
                            <button
                                type="button"
                                className="task-toolbar-year-trigger"
                                onClick={() => setYearMenuOpen((current) => !current)}
                                aria-expanded={yearMenuOpen}
                            >
                                <span>
                                    {formatCalendarMonth(viewDate)} {viewDate.getFullYear()}
                                </span>
                                <i className={`bi ${yearMenuOpen ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                            </button>

                            {yearMenuOpen && (
                                <div className="task-toolbar-year-menu">
                                    {years.map((year) => (
                                        <button
                                            key={year}
                                            type="button"
                                            className={`task-toolbar-year-option ${
                                                year === viewDate.getFullYear() ? "is-selected" : ""
                                            }`}
                                            onClick={() => changeYear(year)}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="task-toolbar-picker-nav">
                            <button
                                type="button"
                                onClick={() =>
                                    setViewDate(
                                        new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                                    )
                                }
                                aria-label="Previous month"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setViewDate(
                                        new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                                    )
                                }
                                aria-label="Next month"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>

                    <div className="task-toolbar-picker-weekdays">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <div key={day} className="task-toolbar-picker-weekday">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="task-toolbar-picker-grid">
                        {days.map((day) => {
                            const isOutside = day.getMonth() !== viewDate.getMonth();
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, today);

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    className={[
                                        "task-toolbar-picker-day",
                                        isOutside ? "is-outside" : "",
                                        isSelected ? "is-selected" : "",
                                        !isSelected && isToday ? "is-today" : ""
                                    ].join(" ").trim()}
                                    onClick={() => pickDate(day)}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="task-toolbar-picker-footer">
                        <button
                            type="button"
                            className="task-toolbar-clear-btn"
                            onClick={clearDate}
                        >
                            All dates
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TaskPriorityFilter({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef(null);

    const options = [
        { value: "all", label: "All" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" }
    ];

    const closeMenu = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenu);

    return (
        <div className="task-toolbar-filter-shell" ref={rootRef}>
            <button
                type="button"
                className={`task-toolbar-chip ${open ? "is-open" : ""} ${value !== "all" ? "is-selected" : ""}`}
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <i className="bi bi-flag"></i>
                <span>{formatPriorityChipLabel(value)}</span>
                <i className="bi bi-chevron-down"></i>
            </button>

            {open && (
                <div className="task-toolbar-select-popup" role="listbox" aria-label="Choose priority">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`task-toolbar-select-option ${
                                value === option.value ? "is-selected" : ""
                            }`}
                            aria-selected={value === option.value}
                            onClick={() => {
                                onChange(option.value);
                                closeMenu();
                            }}
                        >
                            <span>{option.label}</span>
                            {value === option.value && <i className="bi bi-check2"></i>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function App() {
    const [tasks, setTasks] = React.useState([]);
    const [dueDateFilter, setDueDateFilter] = React.useState("");
    const [priorityFilter, setPriorityFilter] = React.useState("all");

    const fetchTasks = React.useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/get_tasks.php`);
            const data = await response.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error:", error);
            setTasks([]);
        }
    }, []);

    React.useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return (
        <div className="task-view">
            <div className="task-toolbar">
                <div className="task-toolbar-left">
                    <TaskDateFilter
                        value={dueDateFilter}
                        onChange={setDueDateFilter}
                    />

                    <TaskPriorityFilter
                        value={priorityFilter}
                        onChange={setPriorityFilter}
                    />
                </div>

                <button
                    type="button"
                    className="task-create-btn"
                    onClick={() => document.getElementById("openReactModalBtn")?.click()}
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>Add New Task</span>
                </button>
            </div>

            <ModalController refreshTasks={fetchTasks} />

            <TaskTable
                tasks={tasks}
                refreshTasks={fetchTasks}
                dueDateFilter={dueDateFilter}
                priorityFilter={priorityFilter}
            />
        </div>
    );
}

function TaskTable({ tasks, refreshTasks, dueDateFilter, priorityFilter }) {
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [showDetailModal, setShowDetailModal] = React.useState(false);

    const [collapsedLanes, setCollapsedLanes] = React.useState({
        ongoing: false,
        overdue: false,
        completed: false
    });

    const [lanePages, setLanePages] = React.useState({
        ongoing: 1,
        overdue: 1,
        completed: 1
    });

    const filteredTasks = tasks.filter((task) => {
        const matchesDueDate = !dueDateFilter || task.deadline === dueDateFilter;
        const matchesPriority =
            priorityFilter === "all" ||
            normalizeText(task.priority) === priorityFilter;

        return matchesDueDate && matchesPriority;
    });

    const laneTaskMap = {
        ongoing: filteredTasks.filter((task) => getLaneKey(task) === "ongoing"),
        overdue: filteredTasks.filter((task) => getLaneKey(task) === "overdue"),
        completed: filteredTasks.filter((task) => getLaneKey(task) === "completed")
    };

    React.useEffect(() => {
        setLanePages({
            ongoing: 1,
            overdue: 1,
            completed: 1
        });
    }, [dueDateFilter, priorityFilter, tasks]);

    function handleRowClick(task) {
        setSelectedTask(task);
        setShowDetailModal(true);
    }

    function handleToggleLane(laneKey) {
        setCollapsedLanes((prev) => ({
            ...prev,
            [laneKey]: !prev[laneKey]
        }));
    }

    function handlePageChange(laneKey, page) {
        setLanePages((prev) => ({
            ...prev,
            [laneKey]: page
        }));
    }

    return (
        <>
            <div className="task-board-shell">
                {["ongoing", "overdue", "completed"].map((laneKey) => (
                    <TaskLane
                        key={laneKey}
                        laneKey={laneKey}
                        tasks={laneTaskMap[laneKey]}
                        onRowClick={handleRowClick}
                        collapsed={collapsedLanes[laneKey]}
                        onToggle={() => handleToggleLane(laneKey)}
                        currentPage={lanePages[laneKey]}
                        onPageChange={(page) => handlePageChange(laneKey, page)}
                    />
                ))}
            </div>

            {showDetailModal && selectedTask && (
                <TaskDetailModal
                    show={showDetailModal}
                    task={selectedTask}
                    onClose={() => setShowDetailModal(false)}
                    refreshTasks={refreshTasks}
                />
            )}
        </>
    );
}

function TaskLane({
    laneKey,
    tasks,
    onRowClick,
    collapsed,
    onToggle,
    currentPage,
    onPageChange
}) {
    const meta = getLaneMeta(laneKey);

    const {
        items: paginatedTasks,
        totalPages,
        currentPage: safePage
    } = getPaginatedItems(tasks, currentPage);

    const startItem = tasks.length === 0 ? 0 : (safePage - 1) * TASKS_PER_PAGE + 1;
    const endItem = Math.min(safePage * TASKS_PER_PAGE, tasks.length);

    return (
        <section className="task-lane-card">
            <div className="task-lane-head">
                <div className="task-lane-head-left">
                    <button
                        type="button"
                        className={`task-lane-icon-btn ${collapsed ? "is-collapsed" : ""}`}
                        aria-label={`${collapsed ? "Expand" : "Collapse"} ${meta.title}`}
                        aria-expanded={!collapsed}
                        onClick={onToggle}
                    >
                        <i className="bi bi-chevron-down"></i>
                    </button>

                    <span className={meta.badgeClass}>
                        <span className={meta.dotClass}></span>
                        {meta.title}
                    </span>
                </div>

                <div className="task-lane-head-right">
                    <span className="task-lane-count">{tasks.length}</span>
                </div>
            </div>

            {!collapsed && (
                <>
                    <div className="task-lane-grid">
                        <div className="task-lane-grid-head">
                            <div>Task Name</div>
                            <div>Task Description</div>
                            <div>Start Date</div>
                            <div>Due Date</div>
                            <div>Priority</div>
                            <div></div>
                        </div>

                        <div className="task-lane-grid-body">
                            {tasks.length === 0 ? (
                                <div className="task-lane-empty">No tasks found</div>
                            ) : (
                                paginatedTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`task-lane-row ${task.is_overdue ? "is-overdue" : ""}`}
                                        onClick={() => onRowClick(task)}
                                        role="button"
                                        tabIndex="0"
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                onRowClick(task);
                                            }
                                        }}
                                    >
                                        <div className="task-lane-col task-lane-col-name">
                                            <span className="task-lane-title">{task.title}</span>
                                        </div>

                                        <div className="task-lane-col task-lane-col-description">
                                            {task.description ? (
                                                <span
                                                    className="task-description-text"
                                                    title={task.description}
                                                >
                                                    {task.description}
                                                </span>
                                            ) : (
                                                <span className="task-description-empty">
                                                    No description
                                                </span>
                                            )}
                                        </div>

                                        <div className="task-lane-col task-lane-col-date">
                                            {formatDate(task.start_date)}
                                        </div>

                                        <div className="task-lane-col task-lane-col-date">
                                            {formatDate(task.deadline)}
                                        </div>

                                        <div className="task-lane-col task-lane-col-priority">
                                            <span className={`task-priority-tag ${getPriorityClass(task.priority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                {task.priority || "Low"}
                                            </span>
                                        </div>

                                        <div className="task-lane-col task-lane-col-menu">
                                            <i className="bi bi-three-dots"></i>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {tasks.length > 0 && totalPages > 1 && (
                        <div className="task-lane-pagination">
                            <div className="task-lane-page-summary">
                                Showing {startItem}-{endItem} of {tasks.length}
                            </div>

                            <div className="task-lane-pagination-controls">
                                <button
                                    type="button"
                                    className="task-lane-page-nav"
                                    onClick={() => onPageChange(safePage - 1)}
                                    disabled={safePage === 1}
                                    aria-label={`Previous ${meta.title} page`}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>

                                <div className="task-lane-pagination-pages">
                                    {Array.from({ length: totalPages }, (_, index) => {
                                        const page = index + 1;

                                        return (
                                            <button
                                                key={page}
                                                type="button"
                                                className={`task-lane-page-btn ${
                                                    page === safePage ? "is-active" : ""
                                                }`}
                                                onClick={() => onPageChange(page)}
                                                aria-current={page === safePage ? "page" : undefined}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    className="task-lane-page-nav"
                                    onClick={() => onPageChange(safePage + 1)}
                                    disabled={safePage === totalPages}
                                    aria-label={`Next ${meta.title} page`}
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function TaskFormFields({
    taskName,
    setTaskName,
    description,
    setDescription,
    startDate,
    setStartDate,
    deadline,
    setDeadline,
    priority,
    setPriority
}) {
    return (
        <>
            <div className="task-form-grid">
                <div className="task-form-field">
                    <label className="form-label task-form-label">Task Name</label>
                    <input
                        type="text"
                        className="form-control task-form-control"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="Enter task name"
                    />
                </div>

                <ModalPriorityPicker
                    value={priority}
                    onChange={setPriority}
                />

                <ModalDatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select start date"
                />

                <ModalDatePicker
                    label="Due Date"
                    value={deadline}
                    onChange={setDeadline}
                    placeholder="Select due date"
                />

                <div className="task-form-field task-form-field-full">
                    <label className="form-label task-form-label">
                        Description <span className="text-muted">(Optional)</span>
                    </label>
                    <textarea
                        className="form-control task-form-control task-form-textarea"
                        rows="4"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter task description"
                    />
                </div>
            </div>
        </>
    );
}
function TaskDetailModal({ show, task, onClose, refreshTasks }) {
    const [taskName, setTaskName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [deadline, setDeadline] = React.useState("");
    const [priority, setPriority] = React.useState("Low");
    const [status, setStatus] = React.useState("Ongoing");

    React.useEffect(() => {
        if (!task) return;

        setTaskName(task.title || "");
        setDescription(task.description || "");
        setStartDate(task.start_date || "");
        setDeadline(task.deadline || "");
        setPriority(task.priority || "Low");
        setStatus(task.status || "Ongoing");
    }, [task]);

    if (!show || !task) return null;

    async function handleSave() {
        if (!taskName.trim()) {
            alert("Task name is required.");
            return;
        }

        if (startDate && deadline && deadline < startDate) {
            alert("Due date cannot be earlier than start date.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("task_id", task.id);
            formData.append("task_name", taskName.trim());
            formData.append("description", description.trim());
            formData.append("start_date", startDate);
            formData.append("deadline", deadline);
            formData.append("priority", priority);
            formData.append("status", status);

            const res = await fetch(`${API_BASE}/update_task.php`, {
                method: "POST",
                body: formData
            });

            const result = await res.text();
            alert(result);

            if (res.ok) {
                onClose();
                refreshTasks();
            }
        } catch (error) {
            alert("Failed to update task");
            console.error(error);
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this task?")) return;

        try {
            const formData = new FormData();
            formData.append("task_id", task.id);

            const res = await fetch(`${API_BASE}/delete_task.php`, {
                method: "POST",
                body: formData
            });

            const result = await res.text();
            alert(result);

            onClose();
            refreshTasks();
        } catch (error) {
            alert("Failed to delete task");
            console.error(error);
        }
    }

    return (
        <div className="task-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered task-modal-dialog">
                <div className="modal-content task-modal-card">
                    <div className="task-modal-headerbar">
                        <div>
                            <h5 className="modal-title task-modal-title">Task Details</h5>
                            <div className="task-modal-subtitle">
                                Edit task information, update status, or remove task
                            </div>
                        </div>
                    </div>

                    <div className="task-modal-body">
                        <div className="task-modal-section-label">Task Information</div>

                        <div className="task-modal-panel">
                            <TaskFormFields
                                taskName={taskName}
                                setTaskName={setTaskName}
                                description={description}
                                setDescription={setDescription}
                                startDate={startDate}
                                setStartDate={setStartDate}
                                deadline={deadline}
                                setDeadline={setDeadline}
                                priority={priority}
                                setPriority={setPriority}
                            />

                            <div className="task-form-field task-form-field-full task-form-status-block">
                                <ModalStatusPicker
                                    value={status}
                                    onChange={setStatus}
                                />
                            </div>

                            <div className="task-modal-actions">
                                <button
                                    type="button"
                                    className="btn task-btn task-btn-danger"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </button>

                                <button
                                    type="button"
                                    className="btn task-btn task-btn-neutral"
                                    onClick={onClose}
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    className="btn task-btn task-btn-primary"
                                    onClick={handleSave}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getStatusMeta(status = "") {
    const normalized = normalizeText(status);

    if (normalized === "completed") {
        return {
            label: "Completed",
            chipClass: "status-chip-completed"
        };
    }

    return {
        label: "Ongoing",
        chipClass: "status-chip-ongoing"
    };
}

function ModalStatusPicker({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef(null);

    const closeMenu = React.useCallback(() => {
        setOpen(false);
    }, []);

    useDismissiblePopup(rootRef, closeMenu);

    const currentMeta = getStatusMeta(value);

    return (
        <>
            <label className="form-label task-form-label">Status</label>

            <div className="modal-picker-shell" ref={rootRef}>
                <button
                    type="button"
                    className={`modal-picker-trigger modal-status-trigger ${open ? "is-open" : ""}`}
                    onClick={() => setOpen((current) => !current)}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                >
                    <span className={`modal-status-chip ${currentMeta.chipClass}`}>
                        {currentMeta.label}
                    </span>

                    <span className="modal-picker-trigger-icon">
                        <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                    </span>
                </button>

                {open && (
                    <div className="modal-status-popover" role="listbox" aria-label="Choose status">
                        {STATUS_OPTIONS.map((option) => {
                            const meta = getStatusMeta(option);
                            const active = option === value;

                            return (
                                <button
                                    key={option}
                                    type="button"
                                    className={`modal-status-option ${active ? "is-active" : ""}`}
                                    aria-selected={active}
                                    onClick={() => {
                                        onChange(option);
                                        closeMenu();
                                    }}
                                >
                                    <span className={`modal-status-chip ${meta.chipClass}`}>
                                        {meta.label}
                                    </span>

                                    {active && (
                                        <i className="bi bi-check2 modal-status-check"></i>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

function AddTaskModal({ show, onClose, refreshTasks }) {
    const [taskName, setTaskName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [deadline, setDeadline] = React.useState("");
    const [priority, setPriority] = React.useState("Low");

    if (!show) return null;

    async function handleSubmit() {
        const formData = new FormData();
        formData.append("task_name", taskName);
        formData.append("description", description.trim());
        formData.append("start_date", startDate);
        formData.append("deadline", deadline);
        formData.append("priority", priority);

        try {
            const response = await fetch(`${API_BASE}/create_task.php`, {
                method: "POST",
                body: formData
            });

            const result = await response.text();
            alert(result);

            refreshTasks();

            setTaskName("");
            setDescription("");
            setStartDate("");
            setDeadline("");
            setPriority("Low");

            onClose();
        } catch (error) {
            console.error("Error:", error);
        }
    }

    return (
        <div className="task-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered task-modal-dialog">
                <div className="modal-content task-modal-card">
                    <div className="task-modal-headerbar">
                        <h5 className="modal-title task-modal-title">Add Task</h5>
                    </div>

                    <div className="task-modal-body">
                        <div className="task-modal-section-label">Task Information</div>

                        <div className="task-modal-panel">
                            <TaskFormFields
                                taskName={taskName}
                                setTaskName={setTaskName}
                                description={description}
                                setDescription={setDescription}
                                startDate={startDate}
                                setStartDate={setStartDate}
                                deadline={deadline}
                                setDeadline={setDeadline}
                                priority={priority}
                                setPriority={setPriority}
                            />

                            <div className="task-modal-actions">
                                <button
                                    type="button"
                                    className="btn task-btn task-btn-neutral"
                                    onClick={onClose}
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    className="btn task-btn task-btn-primary"
                                    onClick={handleSubmit}
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalController({ refreshTasks }) {
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const btn = document.getElementById("openReactModalBtn");

        if (btn) {
            btn.onclick = () => setShow(true);
        }

        return () => {
            if (btn) btn.onclick = null;
        };
    }, []);

    return (
        <AddTaskModal
            show={show}
            onClose={() => setShow(false)}
            refreshTasks={refreshTasks}
        />
    );
}

const rootElement = document.getElementById("root");
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<App />);
}