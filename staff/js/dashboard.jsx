import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

window.sileo = sileo;

const MANILA_TIMEZONE = "Asia/Manila";
const ITEMS_PER_PAGE = 10;

// ─── Period options ────────────────────────────────────────────────────────────
// Default is "week" — broad enough to show meaningful counts, narrow enough
// to feel actionable on a daily-use dashboard.
const PERIOD_OPTIONS = [
    { key: "today",   label: "Today" },
    { key: "week",    label: "This Week" },
    { key: "month",   label: "This Month" },
    { key: "all",     label: "All Time" },
];
const DEFAULT_PERIOD = "week";

// ─── Utilities ─────────────────────────────────────────────────────────────────

function showSileoToast(type = "info", payload = {}) {
    const toastMethod = window.sileo?.[type] || window.sileo?.info;
    if (typeof toastMethod === "function") { toastMethod(payload); return; }
    console.warn("Sileo is not ready yet.", { type, payload });
}

function getTodayYMDInManila() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MANILA_TIMEZONE,
        year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());

    const year  = parts.find(p => p.type === "year")?.value;
    const month = parts.find(p => p.type === "month")?.value;
    const day   = parts.find(p => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
}

function parseYMDToUTC(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(dateStr) {
    const date = parseYMDToUTC(dateStr);
    if (!date) return "-";
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC", year: "numeric", month: "short", day: "numeric"
    }).format(date);
}

function normalizeText(value = "") {
    return String(value).trim().toLowerCase();
}

function normalizeStatus(status = "", deadline = "") {
    const normalized = normalizeText(status);
    const todayYMD   = getTodayYMDInManila();
    if (normalized === "completed") return "completed";
    if (deadline && deadline < todayYMD) return "overdue";
    if (normalized === "overdue") return "overdue";
    if (normalized === "ongoing") return "ongoing";
    return "other";
}

function normalizePriority(priority = "") {
    const normalized = normalizeText(priority);
    if (normalized === "high")   return "high";
    if (normalized === "medium") return "medium";
    if (normalized === "low")    return "low";
    return "medium";
}

function buildTaskId(task = {}, index = 0) {
    if (task.id !== undefined && task.id !== null && String(task.id).trim() !== "") {
        return String(task.id).trim();
    }
    const parts = [
        task.project_name, task.title, task.assignee,
        task.start_date, task.deadline, task.description, task.remarks
    ].map(v => normalizeText(v)).filter(Boolean);
    return parts.length > 0 ? parts.join("::") : `task-${index + 1}`;
}

function normalizeTask(task = {}, index = 0) {
    const normalizedStatus   = normalizeStatus(task.status, task.deadline);
    const normalizedPriority = normalizePriority(task.priority);
    return {
        ...task,
        id:               buildTaskId(task, index),
        title:            task.title || "Untitled Task",
        description:      task.description || "",
        remarks:          task.remarks || "",
        assignee:         task.assignee || "",
        project_name:     task.project_name || "",
        start_date:       task.start_date || "",
        deadline:         task.deadline || "",
        status:           normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1),
        priority:         normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1),
        normalizedStatus,
        normalizedPriority,
        isCompleted:      normalizedStatus === "completed",
        isOverdue:        normalizedStatus === "overdue"
    };
}

function normalizeTasks(taskList = []) {
    const seenIds = new Map();
    return taskList.map((task, index) => {
        const normalized = normalizeTask(task, index);
        const count      = seenIds.get(normalized.id) || 0;
        seenIds.set(normalized.id, count + 1);
        if (count === 0) return normalized;
        return { ...normalized, id: `${normalized.id}__${count + 1}` };
    });
}

async function parseMutationResponse(response, fallbackMessage) {
    const rawText = (await response.text()).trim();
    let parsed = null;
    try { parsed = rawText ? JSON.parse(rawText) : null; } catch { parsed = null; }
    const parsedStatus  = normalizeText(parsed?.status);
    const parsedSuccess = parsed?.success === true || parsedStatus === "success" || parsedStatus === "ok";
    const textSuccess   = /^success\b/i.test(rawText) || /successfully/i.test(rawText);
    const success       = response.ok && (parsedSuccess || textSuccess);
    const message       = parsed?.message || rawText || fallbackMessage;
    if (!success) throw new Error(message || fallbackMessage);
    return message;
}

// ─── Period helpers ────────────────────────────────────────────────────────────

/**
 * Returns { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } for the chosen period,
 * anchored to today in Manila time.
 */
function getPeriodRange(periodKey) {
    const todayYMD = getTodayYMDInManila();
    const today    = parseYMDToUTC(todayYMD);

    if (periodKey === "today") {
        return { start: todayYMD, end: todayYMD };
    }

    if (periodKey === "week") {
        // Monday → Sunday of the current ISO week
        const dow       = today.getUTCDay();                          // 0 = Sun
        const diffToMon = dow === 0 ? -6 : 1 - dow;
        const monday    = new Date(today);
        monday.setUTCDate(today.getUTCDate() + diffToMon);
        const sunday    = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);
        return {
            start: monday.toISOString().slice(0, 10),
            end:   sunday.toISOString().slice(0, 10)
        };
    }

    if (periodKey === "month") {
        const [y, m] = todayYMD.split("-").map(Number);
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        return {
            start: `${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-01`,
            end:   `${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`
        };
    }

    // "all" — no date boundary
    return { start: null, end: null };
}

/**
 * Checks whether a task is "in scope" for the chosen period.
 *
 * Scoping rules:
 *   - Completed tasks   → included if completed_at (or deadline) falls in range
 *   - Ongoing / other   → included if deadline falls in range
 *   - Overdue tasks     → always included (they need attention regardless of period)
 *   - "all"             → every task is in scope
 *
 * Tasks with no deadline are excluded from Today / Week / Month views
 * because they have no natural time anchor.
 */
function isTaskInPeriod(task, periodKey) {
    if (periodKey === "all") return true;

    const { start, end } = getPeriodRange(periodKey);

    // Overdue tasks are always surfaced — they are past-due and need action
    if (task.normalizedStatus === "overdue") return true;

    if (!task.deadline) return false;

    return task.deadline >= start && task.deadline <= end;
}

// ─── Pill / tone maps ──────────────────────────────────────────────────────────

const priorityToneMap = { high: "priority-high", medium: "priority-medium", low: "priority-low" };
const statusToneMap   = { ongoing: "status-ongoing", completed: "status-completed", overdue: "status-overdue", other: "status-other" };

function getPriorityTone(priority = "") { return priorityToneMap[normalizeText(priority)] || "priority-medium"; }
function getStatusTone(status = "")     { return statusToneMap[normalizeText(status)]   || "status-other"; }

function getPriorityLabel(priority = "") {
    const n = normalizeText(priority);
    if (n === "high")   return "High Priority";
    if (n === "medium") return "Normal Priority";
    if (n === "low")    return "Low Priority";
    return "Normal Priority";
}

// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
    const [tasks,      setTasks]      = React.useState([]);
    const [loading,    setLoading]    = React.useState(true);
    const [error,      setError]      = React.useState("");
    const [isMutating, setIsMutating] = React.useState(false);

    // Selected period — lifted here so both TaskSummary and DueSoon can share it
    const [period, setPeriod] = React.useState(DEFAULT_PERIOD);

    const fetchTasks = React.useCallback(async ({ showLoader = true, throwOnError = false, signal } = {}) => {
        if (showLoader) setLoading(true);
        setError("");
        try {
            const response = await fetch("php/get_tasks.php", {
                headers: { Accept: "application/json" },
                signal
            });
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("The server did not return a valid task list.");
            setTasks(normalizeTasks(data));
            return data;
        } catch (err) {
            if (err?.name === "AbortError") return null;
            console.error("Error fetching tasks:", err);
            setError(err.message || "Unable to load tasks.");
            setTasks([]);
            if (throwOnError) throw err;
            return null;
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        const controller = new AbortController();
        fetchTasks({ signal: controller.signal });
        return () => controller.abort();
    }, [fetchTasks]);

    // ── Server mutation helpers (unchanged) ───────────────────────────────────

    const updateTaskStatusOnServer = async (taskId, status) => {
        const body = new URLSearchParams();
        body.append("task_id", taskId);
        body.append("status", status);
        const response = await fetch("php/update_task_status.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        });
        return parseMutationResponse(response, `Failed to update task ${taskId}.`);
    };

    const updateTaskPriorityOnServer = async (taskId, priority) => {
        const body = new URLSearchParams();
        body.append("task_id", taskId);
        body.append("priority", priority);
        const response = await fetch("php/update_task_priority.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        });
        return parseMutationResponse(response, `Failed to update priority for task ${taskId}.`);
    };

    const deleteTaskOnServer = async (taskId) => {
        const body = new URLSearchParams();
        body.append("task_id", taskId);
        const response = await fetch("php/delete_task.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        });
        return parseMutationResponse(response, `Failed to delete task ${taskId}.`);
    };

    const finalizeMutation = async () => {
        await fetchTasks({ showLoader: false, throwOnError: true });
    };

    const handleBulkUpdateStatus = async (taskIds, nextStatus) => {
        if (taskIds.length === 0) return;
        const scrollY = window.scrollY;
        setError(""); setIsMutating(true);
        try {
            const results = await Promise.allSettled(taskIds.map(id => updateTaskStatusOnServer(id, nextStatus)));
            await finalizeMutation();
            const failedCount  = results.filter(r => r.status === "rejected").length;
            const successCount = results.length - failedCount;
            const n = normalizeText(nextStatus);
            window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
            if (failedCount === 0) {
                const desc = n === "completed"
                    ? `${successCount} ${successCount === 1 ? "task was" : "tasks were"} marked as Completed.`
                    : n === "ongoing"
                        ? `${successCount} ${successCount === 1 ? "task was" : "tasks were"} moved to Ongoing.`
                        : `${successCount} ${successCount === 1 ? "task was" : "tasks were"} updated to ${nextStatus}.`;
                showSileoToast(n === "completed" ? "success" : "info", { title: "Status updated", description: desc });
                return;
            }
            const msg = `${successCount} succeeded, ${failedCount} failed. ${results.find(r => r.status === "rejected")?.reason?.message || "Some tasks could not be updated."}`;
            setError(msg);
            showSileoToast("error", { title: "Partial update", description: msg });
        } catch (err) {
            const msg = err.message || "Unable to refresh tasks after saving the status update.";
            setError(msg);
            showSileoToast("error", { title: "Update failed", description: msg });
        } finally { setIsMutating(false); }
    };

    const handleBulkUpdatePriority = async (taskIds, nextPriority) => {
        if (taskIds.length === 0) return;
        const scrollY = window.scrollY;
        setError(""); setIsMutating(true);
        try {
            const results = await Promise.allSettled(taskIds.map(id => updateTaskPriorityOnServer(id, nextPriority)));
            await finalizeMutation();
            const failedCount  = results.filter(r => r.status === "rejected").length;
            const successCount = results.length - failedCount;
            window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
            if (failedCount === 0) {
                showSileoToast("info", { title: "Priority updated", description: `${successCount} ${successCount === 1 ? "task was" : "tasks were"} updated to ${nextPriority}.` });
                return;
            }
            const msg = `${successCount} succeeded, ${failedCount} failed. ${results.find(r => r.status === "rejected")?.reason?.message || "Some tasks could not be updated."}`;
            setError(msg); showSileoToast("error", { title: "Partial update", description: msg });
        } catch (err) {
            const msg = err.message || "Unable to refresh tasks after saving the priority update.";
            setError(msg); showSileoToast("error", { title: "Update failed", description: msg });
        } finally { setIsMutating(false); }
    };

    const handleBulkDelete = async (taskIds) => {
        if (taskIds.length === 0) return;
        const scrollY = window.scrollY;
        setError(""); setIsMutating(true);
        try {
            const results = await Promise.allSettled(taskIds.map(id => deleteTaskOnServer(id)));
            await finalizeMutation();
            const failedCount  = results.filter(r => r.status === "rejected").length;
            const successCount = results.length - failedCount;
            window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
            if (failedCount === 0) {
                showSileoToast("success", { title: "Tasks deleted", description: `${successCount} ${successCount === 1 ? "task has" : "tasks have"} been removed.` });
                return;
            }
            const msg = `${successCount} deleted, ${failedCount} failed. ${results.find(r => r.status === "rejected")?.reason?.message || "Some tasks could not be deleted."}`;
            setError(msg); showSileoToast("error", { title: "Partial delete", description: msg });
        } catch (err) {
            const msg = err.message || "Unable to refresh tasks after deleting selected tasks.";
            setError(msg); showSileoToast("error", { title: "Delete failed", description: msg });
        } finally { setIsMutating(false); }
    };

    return (
        <>
            <Toaster />
            <TaskSummary tasks={tasks} period={period} onPeriodChange={setPeriod} />
            <DueSoon tasks={tasks} period={period} />
            <TaskTable
                tasks={tasks}
                loading={loading}
                error={error}
                isMutating={isMutating}
                onRetry={() => fetchTasks()}
                onBulkUpdateStatus={handleBulkUpdateStatus}
                onBulkUpdatePriority={handleBulkUpdatePriority}
                onBulkDelete={handleBulkDelete}
            />
        </>
    );
}

// ─── TaskSummary ──────────────────────────────────────────────────────────────

function TaskSummary({ tasks, period, onPeriodChange }) {
    // Filter tasks to only those in scope for the selected period
    const scopedTasks = tasks.filter(t => isTaskInPeriod(t, period));

    const total     = scopedTasks.length;
    const ongoing   = scopedTasks.filter(t => t.normalizedStatus === "ongoing").length;
    const completed = scopedTasks.filter(t => t.normalizedStatus === "completed").length;
    const overdue   = scopedTasks.filter(t => t.normalizedStatus === "overdue").length;

    const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.label ?? "This Week";

    // Descriptive meta text changes with the period so the cards feel contextual
    const metaFor = (key) => {
        if (period === "today")  return { total: "due today",   ongoing: "active today",   completed: "done today",  overdue: "past due" }[key];
        if (period === "week")   return { total: "this week",   ongoing: "active this week", completed: "done this week", overdue: "past due" }[key];
        if (period === "month")  return { total: "this month",  ongoing: "active this month", completed: "done this month", overdue: "past due" }[key];
        return                          { total: "total tasks", ongoing: "active tasks",    completed: "finished tasks", overdue: "needs attention" }[key];
    };

    const stats = [
        { key: "total",     title: "Total Tasks", value: total,     icon: "bi-card-checklist",       pillClass: "stats-pill-neutral", pillText: periodLabel,  metaText: metaFor("total") },
        { key: "ongoing",   title: "Ongoing",     value: ongoing,   icon: "bi-arrow-repeat",         pillClass: "stats-pill-info",    pillText: "Open",       metaText: metaFor("ongoing") },
        { key: "completed", title: "Completed",   value: completed, icon: "bi-check2-circle",        pillClass: "stats-pill-success", pillText: "Done",       metaText: metaFor("completed") },
        { key: "overdue",   title: "Overdue",     value: overdue,   icon: "bi-exclamation-triangle", pillClass: "stats-pill-danger",  pillText: "Alert",      metaText: metaFor("overdue") },
    ];

    return (
        <div className="stats-summary-block mb-4">
            <div className="stats-period-wrap">
                <div className="stats-period-bar" aria-label="Task summary period">
                    {PERIOD_OPTIONS.map(opt => {
                        const isActive = period === opt.key;

                        return (
                            <button
                                key={opt.key}
                                type="button"
                                className={`stats-period-tab ${isActive ? "is-active" : ""}`}
                                onClick={() => onPeriodChange(opt.key)}
                                aria-pressed={isActive}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <section className="stats-strip">
                <div className="stats-strip-inner">
                    {stats.map(item => (
                        <div className="stats-metric" key={item.key}>
                            <div className="stats-icon">
                                <i className={`bi ${item.icon}`}></i>
                            </div>
                            <div className="stats-label">{item.title}</div>
                            <div className="stats-bottom">
                                <div className="stats-value">{item.value}</div>
                                <div className="stats-trend">
                                    <span className={`stats-pill ${item.pillClass}`}>{item.pillText}</span>
                                    <span className="stats-meta">{item.metaText}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function DueSoon({ tasks }) {
    const today = parseYMDToUTC(getTodayYMDInManila());

    const dueSoonTasks = tasks.filter(task => {
        if (task.isCompleted || !task.deadline) return false;
        const deadline = parseYMDToUTC(task.deadline);
        if (!deadline || !today) return false;
        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return diffDays === 0 || diffDays === 1;
    });

    const getDueLabel = deadlineStr => {
        const deadline = parseYMDToUTC(deadlineStr);
        if (!deadline || !today) return "";
        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Due Today";
        if (diffDays === 1) return "Due Tomorrow";
        return "";
    };

    if (dueSoonTasks.length === 0) return null;

    return (
        <section className="due-soon-strip mb-4">
            <div className="due-soon-header">
                <i className="bi bi-alarm"></i>
                <span>Coming up — {dueSoonTasks.length} {dueSoonTasks.length === 1 ? "task" : "tasks"} due soon</span>
            </div>
            <div className="due-soon-list">
                {dueSoonTasks.map(task => (
                    <div key={task.id} className="due-soon-item">
                        <span className="due-soon-title">{task.title}</span>
                        <span className={`due-soon-badge ${getDueLabel(task.deadline) === "Due Today" ? "is-today" : "is-tomorrow"}`}>
                            {getDueLabel(task.deadline)}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── TaskTable (unchanged logic, just carried forward) ────────────────────────

function TaskTable({
    tasks, loading, error, isMutating,
    onRetry, onBulkUpdateStatus, onBulkUpdatePriority, onBulkDelete
}) {
    const [selectedTaskIds, setSelectedTaskIds] = React.useState([]);
    const [isFilterOpen,    setIsFilterOpen]    = React.useState(false);
    const [statusFilter,    setStatusFilter]    = React.useState("All");
    const [currentPage,     setCurrentPage]     = React.useState(1);

    const filterRef    = React.useRef(null);
    const checkAllRef  = React.useRef(null);

    const filterOptions = ["All", "Ongoing", "Completed", "Overdue", "Other"];

    React.useEffect(() => {
        const handleOutsideClick = e => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false);
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const filteredTasks = tasks.filter(task => {
        if (statusFilter === "All") return true;
        return task.normalizedStatus === normalizeText(statusFilter);
    });

    const totalPages      = Math.max(1, Math.ceil(filteredTasks.length / ITEMS_PER_PAGE));
    const pageStartIndex  = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPageTasks = filteredTasks.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);

    React.useEffect(() => { setCurrentPage(1); }, [statusFilter]);

    React.useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    React.useEffect(() => {
        const allowedIds = new Set(filteredTasks.map(t => t.id));
        setSelectedTaskIds(prev => prev.filter(id => allowedIds.has(id)));
    }, [statusFilter, tasks]);

    React.useEffect(() => {
        if (!checkAllRef.current) return;
        const visibleIds            = currentPageTasks.map(t => t.id);
        const selectedVisibleCount  = visibleIds.filter(id => selectedTaskIds.includes(id)).length;
        const allVisibleSelected    = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
        const someVisibleSelected   = selectedVisibleCount > 0 && !allVisibleSelected;
        checkAllRef.current.indeterminate = someVisibleSelected;
    }, [currentPageTasks, selectedTaskIds]);

    const visibleTaskIds       = currentPageTasks.map(t => t.id);
    const selectedVisibleCount = visibleTaskIds.filter(id => selectedTaskIds.includes(id)).length;
    const allVisibleSelected   = visibleTaskIds.length > 0 && selectedVisibleCount === visibleTaskIds.length;
    const selectedTasks        = tasks.filter(t => selectedTaskIds.includes(t.id));

    const toggleTaskSelection = taskId => {
        setSelectedTaskIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
    };

    const toggleSelectAllVisible = () => {
        setSelectedTaskIds(prev => {
            if (allVisibleSelected) return prev.filter(id => !visibleTaskIds.includes(id));
            return Array.from(new Set([...prev, ...visibleTaskIds]));
        });
    };

    const clearSelection = () => setSelectedTaskIds([]);

    const getPaginationItems = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const items = [1];
        const start = Math.max(2, currentPage - 1);
        const end   = Math.min(totalPages - 1, currentPage + 1);
        if (start > 2) items.push("left-ellipsis");
        for (let p = start; p <= end; p++) items.push(p);
        if (end < totalPages - 1) items.push("right-ellipsis");
        items.push(totalPages);
        return items;
    };

    const paginationItems = getPaginationItems();

    return (
        <>
            <section className="task-board">
                <div className="task-board-head">
                    <div><h5 className="task-board-title">Your Tasks</h5></div>

                    <div className="task-board-actions">
                        <div className="task-filter" ref={filterRef}>
                            <button
                                type="button"
                                className={`task-filter-btn ${isFilterOpen ? "is-open" : ""}`}
                                onClick={() => setIsFilterOpen(prev => !prev)}
                                aria-haspopup="menu"
                                aria-expanded={isFilterOpen}
                                disabled={loading || isMutating}
                            >
                                <span className="task-filter-btn-inner">
                                    <i className="bi bi-filter"></i>
                                    <span>Filter</span>
                                </span>
                                <i className={`bi ${isFilterOpen ? "bi-chevron-up" : "bi-chevron-down"} task-filter-caret`}></i>
                            </button>

                            {isFilterOpen && (
                                <div className="task-filter-menu" role="menu">
                                    {filterOptions.map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            className={`task-filter-item ${statusFilter === option ? "is-active" : ""}`}
                                            onClick={() => { setStatusFilter(option); setIsFilterOpen(false); }}
                                            disabled={isMutating}
                                        >
                                            <span>{option}</span>
                                            {statusFilter === option && <i className="bi bi-check2"></i>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="task-board-strip">
                    <div className="task-board-check-all" onClick={e => e.stopPropagation()}>
                        <label className="task-checkbox-wrap" onClick={e => e.stopPropagation()}>
                            <input
                                ref={checkAllRef}
                                type="checkbox"
                                className="task-checkbox-input"
                                checked={allVisibleSelected}
                                onChange={toggleSelectAllVisible}
                                aria-label={`Select all ${statusFilter === "All" ? "" : `${statusFilter.toLowerCase()} `}tasks on this page`}
                                disabled={loading || isMutating || currentPageTasks.length === 0}
                            />
                            <span className="task-checkbox-ui"></span>
                        </label>
                        <span className="task-board-check-all-text">Check All</span>
                    </div>

                    <div className="task-board-strip-meta">
                        <span className="task-board-filter-state">Showing: {statusFilter}</span>
                        <span className="task-board-count">{filteredTasks.length}</span>
                        {selectedTaskIds.length > 0 && (
                            <span className="task-board-selected-count">{selectedTaskIds.length} selected</span>
                        )}
                    </div>
                </div>

                <div className="task-board-table-wrap">
                    <table className="table task-board-table align-middle mb-0">
                        <thead>
                            <tr>
                                <th className="task-board-checkbox-col"></th>
                                <th><span className="task-board-th"><i className="bi bi-card-list"></i>Task Name</span></th>
                                <th><span className="task-board-th"><i className="bi bi-text-paragraph"></i>Description</span></th>
                                <th><span className="task-board-th"><i className="bi bi-calendar2-week"></i>Due</span></th>
                                <th><span className="task-board-th"><i className="bi bi-info-circle-fill"></i>Status</span></th>
                                <th><span className="task-board-th"><i className="bi bi-flag-fill"></i>Priority</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="task-board-empty">Loading tasks...</td></tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="task-board-empty">
                                        <div className="task-board-feedback">
                                            <div className="task-board-error">{error}</div>
                                            <button type="button" className="task-action-btn" onClick={onRetry} disabled={isMutating}>Retry</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="task-board-empty">
                                        No {statusFilter === "All" ? "" : `${statusFilter.toLowerCase()} `}tasks found
                                    </td>
                                </tr>
                            ) : (
                                currentPageTasks.map(task => (
                                    <tr
                                        key={task.id}
                                        className={`task-board-row ${selectedTaskIds.includes(task.id) ? "is-selected" : ""}`}
                                        onClick={() => { if (!isMutating) toggleTaskSelection(task.id); }}
                                    >
                                        <td className="task-board-checkbox-col" onClick={e => e.stopPropagation()}>
                                            <label className="task-checkbox-wrap" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="task-checkbox-input"
                                                    checked={selectedTaskIds.includes(task.id)}
                                                    onChange={() => toggleTaskSelection(task.id)}
                                                    aria-label={`Select ${task.title}`}
                                                    disabled={isMutating}
                                                />
                                                <span className="task-checkbox-ui"></span>
                                            </label>
                                        </td>
                                        <td>
                                            <div className="task-board-name-cell">
                                                <div className="task-board-name-copy">
                                                    <div className="task-board-task-title">{task.title}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {task.description
                                                ? <div className="task-board-description" title={task.description}>{task.description}</div>
                                                : <div className="task-board-description is-empty">No description</div>
                                            }
                                        </td>
                                        <td className="task-board-date">{formatDate(task.deadline)}</td>
                                        <td>
                                            <span className={`task-pill task-status-pill ${getStatusTone(task.normalizedStatus)}`}>{task.status}</span>
                                        </td>
                                        <td>
                                            <span className={`task-priority-pill ${getPriorityTone(task.normalizedPriority)}`}>
                                                <i className="bi bi-flag-fill"></i>
                                                {getPriorityLabel(task.normalizedPriority)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && !error && filteredTasks.length > 0 && (
                    <div className="task-board-pagination">
                        <div className="task-board-pagination-controls">
                            <button
                                type="button"
                                className="task-page-btn task-page-nav"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || isMutating}
                                aria-label="Previous page"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            {paginationItems.map(item => (
                                typeof item === "number" ? (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`task-page-btn ${currentPage === item ? "is-active" : ""}`}
                                        onClick={() => setCurrentPage(item)}
                                        aria-current={currentPage === item ? "page" : undefined}
                                        disabled={isMutating}
                                    >
                                        {item}
                                    </button>
                                ) : (
                                    <span key={item} className="task-page-ellipsis">…</span>
                                )
                            ))}

                            <button
                                type="button"
                                className="task-page-btn task-page-nav"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || isMutating}
                                aria-label="Next page"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {selectedTasks.length > 0 && (
                <BulkActionBar
                    selectedCount={selectedTasks.length}
                    selectedTaskIds={selectedTasks.map(t => t.id)}
                    isDisabled={isMutating}
                    onUpdateStatus={async (ids, status) => { await onBulkUpdateStatus(ids, status); clearSelection(); }}
                    onUpdatePriority={async (ids, priority) => { await onBulkUpdatePriority(ids, priority); clearSelection(); }}
                    onDelete={async ids => { await onBulkDelete(ids); clearSelection(); }}
                    onClearSelection={clearSelection}
                />
            )}
        </>
    );
}

// ─── BulkActionBar (unchanged) ────────────────────────────────────────────────

function BulkActionBar({ selectedCount, selectedTaskIds, isDisabled, onUpdateStatus, onUpdatePriority, onDelete, onClearSelection }) {
    const [openMenu, setOpenMenu] = React.useState("");
    const barRef = React.useRef(null);

    React.useEffect(() => {
        const handleOutsideClick = e => {
            if (barRef.current && !barRef.current.contains(e.target)) setOpenMenu("");
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    React.useEffect(() => { if (isDisabled) setOpenMenu(""); }, [isDisabled]);

    const statusOptions   = ["Ongoing", "Completed"];
    const priorityOptions = ["High", "Medium", "Low"];

    return (
        <div className="bulk-action-bar" ref={barRef}>
            <div className="bulk-action-main">
                <div className="bulk-action-count">{selectedCount}</div>
                <div className="bulk-action-copy">
                    <div className="bulk-action-title">{selectedCount === 1 ? "Task selected" : "Tasks selected"}</div>
                    <div className="bulk-action-subtitle">Manage selected items</div>
                </div>
            </div>

            <div className="bulk-action-actions">
                <div className="bulk-action-group">
                    <button
                        type="button"
                        className={`bulk-action-tool ${openMenu === "status" ? "is-open" : ""}`}
                        onClick={() => { if (!isDisabled) setOpenMenu(prev => prev === "status" ? "" : "status"); }}
                        disabled={isDisabled}
                    >
                        <span className="bulk-action-tool-icon"><i className="bi bi-check2-square"></i></span>
                        <span className="bulk-action-tool-label-row">
                            <span className="bulk-action-tool-label">Update status</span>
                            <i className={`bi ${openMenu === "status" ? "bi-chevron-up" : "bi-chevron-down"} bulk-action-tool-caret`}></i>
                        </span>
                    </button>
                    {openMenu === "status" && (
                        <div className="bulk-action-menu">
                            {statusOptions.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    className="bulk-action-menu-item"
                                    onClick={async () => { setOpenMenu(""); await onUpdateStatus(selectedTaskIds, option); }}
                                    disabled={isDisabled}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bulk-action-group">
                    <button
                        type="button"
                        className={`bulk-action-tool ${openMenu === "priority" ? "is-open" : ""}`}
                        onClick={() => { if (!isDisabled) setOpenMenu(prev => prev === "priority" ? "" : "priority"); }}
                        disabled={isDisabled}
                    >
                        <span className="bulk-action-tool-icon"><i className="bi bi-flag"></i></span>
                        <span className="bulk-action-tool-label-row">
                            <span className="bulk-action-tool-label">Update priority</span>
                            <i className={`bi ${openMenu === "priority" ? "bi-chevron-up" : "bi-chevron-down"} bulk-action-tool-caret`}></i>
                        </span>
                    </button>
                    {openMenu === "priority" && (
                        <div className="bulk-action-menu">
                            {priorityOptions.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    className="bulk-action-menu-item"
                                    onClick={async () => { setOpenMenu(""); await onUpdatePriority(selectedTaskIds, option); }}
                                    disabled={isDisabled}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    className="bulk-action-tool is-danger"
                    onClick={async () => { await onDelete(selectedTaskIds); }}
                    disabled={isDisabled}
                >
                    <span className="bulk-action-tool-icon"><i className="bi bi-trash3"></i></span>
                    <span className="bulk-action-tool-label-row">
                        <span className="bulk-action-tool-label">Delete</span>
                    </span>
                </button>
            </div>

            <button
                type="button"
                className="bulk-action-close"
                onClick={onClearSelection}
                aria-label="Close bulk actions"
                title="Close"
                disabled={isDisabled}
            >
                <i className="bi bi-x-lg"></i>
            </button>
        </div>
    );
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element with id "root" was not found.');

createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
