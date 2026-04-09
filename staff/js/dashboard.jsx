import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";
import * as echarts from "https://esm.sh/echarts@6";

window.sileo = sileo;

const MANILA_TIMEZONE = "Asia/Manila";
const ITEMS_PER_PAGE = 10;

const TASK_PROGRESS_STEP = 10;

function clampProgress(value = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
}


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
        progress:         clampProgress(task.progress ?? task.progress_percentage ?? 0),
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
    const [tasks, setTasks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [isMutating, setIsMutating] = React.useState(false);
    const [focusedTaskId, setFocusedTaskId] = React.useState("");

    const updateTaskProgressOnServer = async (taskId, direction) => {
        const body = new URLSearchParams();
        body.append("task_id", taskId);
        body.append("direction", direction);
        body.append("step", String(TASK_PROGRESS_STEP));

        const response = await fetch("php/update_task_progress.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        });

        return parseMutationResponse(response, `Failed to update progress for task ${taskId}.`);
    };

    const handleTaskProgressChange = async (taskId, direction) => {
        if (!taskId) return;

        setError("");
        setIsMutating(true);

        try {
            await updateTaskProgressOnServer(taskId, direction);
            await finalizeMutation();

            showSileoToast(direction === "increase" ? "success" : "info", {
                title: "Task progress updated",
                description:
                    direction === "increase"
                        ? `Task progress increased by ${TASK_PROGRESS_STEP}%.`
                        : `Task progress decreased by ${TASK_PROGRESS_STEP}%.`
            });
        } catch (err) {
            const msg = err.message || "Unable to update task progress.";
            setError(msg);
            showSileoToast("error", { title: "Update failed", description: msg });
        } finally {
            setIsMutating(false);
        }
    };

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

            const normalized = normalizeTasks(data);
            setTasks(normalized);

            setFocusedTaskId(prev => {
                if (prev && normalized.some(task => task.id === prev)) return prev;
                return normalized[0]?.id || "";
            });

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
        setError("");
        setIsMutating(true);

        try {
            const results = await Promise.allSettled(taskIds.map(id => updateTaskStatusOnServer(id, nextStatus)));
            await finalizeMutation();

            const failedCount = results.filter(r => r.status === "rejected").length;
            const successCount = results.length - failedCount;
            const n = normalizeText(nextStatus);

            window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));

            if (failedCount === 0) {
                const desc = n === "completed"
                    ? `${successCount} ${successCount === 1 ? "task was" : "tasks were"} marked as Completed.`
                    : n === "ongoing"
                        ? `${successCount} ${successCount === 1 ? "task was" : "tasks were"} moved to Ongoing.`
                        : `${successCount} ${successCount === 1 ? "task was" : "tasks were"} updated to ${nextStatus}.`;

                showSileoToast(n === "completed" ? "success" : "info", {
                    title: "Status updated",
                    description: desc
                });
                return;
            }

            const msg = `${successCount} succeeded, ${failedCount} failed. ${results.find(r => r.status === "rejected")?.reason?.message || "Some tasks could not be updated."}`;
            setError(msg);
            showSileoToast("error", { title: "Partial update", description: msg });
        } catch (err) {
            const msg = err.message || "Unable to refresh tasks after saving the status update.";
            setError(msg);
            showSileoToast("error", { title: "Update failed", description: msg });
        } finally {
            setIsMutating(false);
        }
    };

    const handleBulkUpdatePriority = async (taskIds, nextPriority) => {
        if (taskIds.length === 0) return;
        const scrollY = window.scrollY;
        setError("");
        setIsMutating(true);

        try {
            const results = await Promise.allSettled(taskIds.map(id => updateTaskPriorityOnServer(id, nextPriority)));
            await finalizeMutation();

            const failedCount = results.filter(r => r.status === "rejected").length;
            const successCount = results.length - failedCount;

            window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));

            if (failedCount === 0) {
                showSileoToast("info", {
                    title: "Priority updated",
                    description: `${successCount} ${successCount === 1 ? "task was" : "tasks were"} updated to ${nextPriority}.`
                });
                return;
            }

            const msg = `${successCount} succeeded, ${failedCount} failed. ${results.find(r => r.status === "rejected")?.reason?.message || "Some tasks could not be updated."}`;
            setError(msg);
            showSileoToast("error", { title: "Partial update", description: msg });
        } catch (err) {
            const msg = err.message || "Unable to refresh tasks after saving the priority update.";
            setError(msg);
            showSileoToast("error", { title: "Update failed", description: msg });
        } finally {
            setIsMutating(false);
        }
    };

    const handleBulkDelete = async (taskIds) => {
        if (taskIds.length === 0) return;
        const scrollY = window.scrollY;
        setError("");
        setIsMutating(true);

        try {
            const results = await Promise.allSettled(taskIds.map(id => deleteTaskOnServer(id)));
            await finalizeMutation();

            const failedCount = results.filter(r => r.status === "rejected").length;
            const successCount = results.length - failedCount;

            window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));

            if (failedCount === 0) {
                showSileoToast("success", {
                    title: "Tasks deleted",
                    description: `${successCount} ${successCount === 1 ? "task has" : "tasks have"} been removed.`
                });
                return;
            }

            const msg = `${successCount} deleted, ${failedCount} failed. ${results.find(r => r.status === "rejected")?.reason?.message || "Some tasks could not be deleted."}`;
            setError(msg);
            showSileoToast("error", { title: "Partial delete", description: msg });
        } catch (err) {
            const msg = err.message || "Unable to refresh tasks after deleting selected tasks.";
            setError(msg);
            showSileoToast("error", { title: "Delete failed", description: msg });
        } finally {
            setIsMutating(false);
        }
    };

    return (
        <>
            <Toaster />
            <TaskSummary tasks={tasks} />

            <div className="task-dashboard-grid">
                <TaskTable
                    tasks={tasks}
                    loading={loading}
                    error={error}
                    isMutating={isMutating}
                    focusedTaskId={focusedTaskId}
                    onTaskFocus={setFocusedTaskId}
                    onRetry={() => fetchTasks()}
                    onBulkUpdateStatus={handleBulkUpdateStatus}
                    onBulkUpdatePriority={handleBulkUpdatePriority}
                    onBulkDelete={handleBulkDelete}
                />

                <TaskProgressCard
                    task={tasks.find(task => task.id === focusedTaskId) || null}
                    isMutating={isMutating}
                    onIncrease={() => handleTaskProgressChange(focusedTaskId, "increase")}
                    onDecrease={() => handleTaskProgressChange(focusedTaskId, "decrease")}
                />
            </div>
        </>
    );
}

// ─── TaskSummary ──────────────────────────────────────────────────────────────

function TaskSummary({ tasks }) {
    const total = tasks.length;
    const ongoing = tasks.filter(t => t.normalizedStatus === "ongoing").length;
    const completed = tasks.filter(t => t.normalizedStatus === "completed").length;
    const overdue = tasks.filter(t => t.normalizedStatus === "overdue").length;

    const stats = [
        { key: "total", title: "Total Tasks", value: total, icon: "bi-card-checklist", pillClass: "stats-pill-neutral", pillText: "All Time", metaText: "total tasks" },
        { key: "ongoing", title: "Ongoing", value: ongoing, icon: "bi-arrow-repeat", pillClass: "stats-pill-info", pillText: "Open", metaText: "active tasks" },
        { key: "completed", title: "Completed", value: completed, icon: "bi-check2-circle", pillClass: "stats-pill-success", pillText: "Done", metaText: "finished tasks" },
        { key: "overdue", title: "Overdue", value: overdue, icon: "bi-exclamation-triangle", pillClass: "stats-pill-danger", pillText: "Alert", metaText: "needs attention" },
    ];

    return (
        <div className="stats-summary-block mb-4">
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

function TaskProgressCard({ task, isMutating, onIncrease, onDecrease }) {
    const rawProgress = Number(task?.progress ?? task?.progress_percentage ?? 0);
    const progressValue = Math.max(0, Math.min(100, Number.isFinite(rawProgress) ? rawProgress : 0));

    const progressLabel =
        Number.isFinite(rawProgress) && !Number.isInteger(rawProgress)
            ? `${Math.max(0, Math.min(100, rawProgress)).toFixed(2)}%`
            : `${Math.round(progressValue)}%`;

    const totalTicks = 72;
    const activeTicks = Math.round((progressValue / 100) * totalTicks);

    const center = 120;
    const outerRadius = 92;
    const shortInnerRadius = 78;
    const longInnerRadius = 72;

    function polarToCartesian(cx, cy, radius, angleDeg) {
        const angleRad = (angleDeg - 90) * (Math.PI / 180);
        return {
            x: cx + radius * Math.cos(angleRad),
            y: cy + radius * Math.sin(angleRad)
        };
    }

    const ticks = Array.from({ length: totalTicks }, (_, index) => {
        const angle = (360 / totalTicks) * index;
        const isMajor = index % 3 === 0;
        const innerRadius = isMajor ? longInnerRadius : shortInnerRadius;
        const start = polarToCartesian(center, center, innerRadius, angle);
        const end = polarToCartesian(center, center, outerRadius, angle);

        const isActive = index < activeTicks;

        let stroke = "rgba(124, 156, 199, 0.14)";
        if (isActive) {
            const glowStrength = 0.45 + (0.55 * ((index + 1) / Math.max(activeTicks, 1)));
            stroke = `rgba(68, 140, 255, ${glowStrength})`;
        }

        return {
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
            stroke,
            strokeWidth: isMajor ? 2.6 : 1.8
        };
    });

    if (!task) {
        return (
            <aside className="task-progress-panel task-progress-panel--empty">
                <div className="task-progress-panel-title">Task Progress</div>
                <div className="task-progress-empty-copy">
                    Select a task from the table to track its progress.
                </div>
            </aside>
        );
    }

        return (
            <aside className="task-progress-panel task-progress-panel--performance">
                <div className="task-progress-panel-head">
                    <div className="task-progress-panel-title">Task Progress</div>
                </div>

                <div className="task-progress-visual">
                    <div className="task-progress-chart-shell is-performance">
                        <svg
                            className="task-progress-svg"
                            viewBox="0 0 240 240"
                            role="img"
                            aria-label={`${progressLabel} progress for ${task.title}`}
                        >
                            <defs>
                                <filter id="taskProgressGlow" x="-40%" y="-40%" width="180%" height="180%">
                                    <feGaussianBlur stdDeviation="1.8" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {ticks.map((tick, index) => (
                                <line
                                    key={index}
                                    x1={tick.x1}
                                    y1={tick.y1}
                                    x2={tick.x2}
                                    y2={tick.y2}
                                    stroke={tick.stroke}
                                    strokeWidth={tick.strokeWidth}
                                    strokeLinecap="round"
                                    filter={index < activeTicks ? "url(#taskProgressGlow)" : undefined}
                                />
                            ))}
                        </svg>

                        <div className="task-progress-center performance-center">
                            <div className="task-progress-value performance-value">{progressLabel}</div>
                            <div className="task-progress-inline-title">{task.title}</div>
                        </div>
                    </div>
                </div>

                <div className="task-progress-actions is-inline">
                    <button
                        type="button"
                        className="task-progress-btn task-progress-btn-icon is-minus"
                        onClick={onDecrease}
                        disabled={isMutating || progressValue <= 0}
                        aria-label={`Decrease progress for ${task.title}`}
                        title="Decrease progress"
                    >
                        <i className="bi bi-dash-lg"></i>
                    </button>

                    <button
                        type="button"
                        className="task-progress-btn task-progress-btn-icon is-plus"
                        onClick={onIncrease}
                        disabled={isMutating || progressValue >= 100}
                        aria-label={`Increase progress for ${task.title}`}
                        title="Increase progress"
                    >
                        <i className="bi bi-plus-lg"></i>
                    </button>
                </div>
            </aside>
        );
}

// ─── TaskTable (unchanged logic, just carried forward) ────────────────────────

function TaskTable({
    tasks, loading, error, isMutating,
    focusedTaskId, onTaskFocus,
    onRetry, onBulkUpdateStatus, onBulkUpdatePriority, onBulkDelete
}) {
    const [selectedTaskIds, setSelectedTaskIds] = React.useState([]);
    const [currentPage, setCurrentPage] = React.useState(1);

    const checkAllRef = React.useRef(null);

    const filteredTasks = tasks;

    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ITEMS_PER_PAGE));
    const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPageTasks = filteredTasks.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);

    React.useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    React.useEffect(() => {
        const allowedIds = new Set(filteredTasks.map(t => t.id));
        setSelectedTaskIds(prev => prev.filter(id => allowedIds.has(id)));
    }, [tasks]);

    React.useEffect(() => {
        if (!checkAllRef.current) return;

        const visibleIds = currentPageTasks.map(t => t.id);
        const selectedVisibleCount = visibleIds.filter(id => selectedTaskIds.includes(id)).length;
        const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
        const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

        checkAllRef.current.indeterminate = someVisibleSelected;
    }, [currentPageTasks, selectedTaskIds]);

    const visibleTaskIds = currentPageTasks.map(t => t.id);
    const selectedVisibleCount = visibleTaskIds.filter(id => selectedTaskIds.includes(id)).length;
    const allVisibleSelected = visibleTaskIds.length > 0 && selectedVisibleCount === visibleTaskIds.length;
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));

    const toggleTaskSelection = taskId => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
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
        const end = Math.min(totalPages - 1, currentPage + 1);

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
                    <div>
                        <h5 className="task-board-title">Your Tasks</h5>
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
                                aria-label="Select all tasks on this page"
                                disabled={loading || isMutating || currentPageTasks.length === 0}
                            />
                            <span className="task-checkbox-ui"></span>
                        </label>
                        <span className="task-board-check-all-text">Check All</span>
                    </div>

                    <div className="task-board-strip-meta">
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
                                        No tasks found
                                    </td>
                                </tr>
                            ) : (
                                currentPageTasks.map(task => (
                                    <tr
                                        key={task.id}
                                        className={`task-board-row ${selectedTaskIds.includes(task.id) ? "is-selected" : ""} ${focusedTaskId === task.id ? "is-focused" : ""}`}
                                        onClick={() => {
                                            if (isMutating) return;
                                            onTaskFocus(task.id);
                                            toggleTaskSelection(task.id);
                                        }}
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
