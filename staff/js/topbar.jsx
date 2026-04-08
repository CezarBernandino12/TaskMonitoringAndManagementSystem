import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

const TOPBAR_USER_API = "php/sidebar.php";
const THEME_KEY = "dashboard-theme";
const GREETING_REFRESH_MS = 60 * 1000;

const FALLBACK_USER = {
    name: "User",
    nickname: "",
    gender: "",
    email: "",
    role: "",
    role_label: "",
    department_name: "",
    initials: "U",
    profile_image_url: ""
};

const STATIC_NOTIFICATIONS = [
    {
        id: 1,
        icon: "bi-check2-circle",
        iconColor: "notif-green",
        title: "Task completed",
        desc: "Q2 Report has been marked as done.",
        time: "2 min ago",
        unread: true
    },
    {
        id: 2,
        icon: "bi-calendar-event",
        iconColor: "notif-blue",
        title: "Meeting reminder",
        desc: "Team standup starts in 15 minutes.",
        time: "14 min ago",
        unread: true
    },
    {
        id: 3,
        icon: "bi-person-plus",
        iconColor: "notif-purple",
        title: "New team member",
        desc: "Maria Santos joined your department.",
        time: "1 hr ago",
        unread: true
    },
    {
        id: 4,
        icon: "bi-file-earmark-text",
        iconColor: "notif-amber",
        title: "Document shared",
        desc: "Budget proposal was shared with you.",
        time: "Yesterday",
        unread: false
    }
];

function getStoredTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    return storedTheme === "dark" ? "dark" : "light";
}

function getCurrentTheme() {
    const attrTheme = document.documentElement.getAttribute("data-theme");
    if (attrTheme === "dark" || attrTheme === "light") return attrTheme;

    const bsTheme = document.documentElement.getAttribute("data-bs-theme");
    if (bsTheme === "dark" || bsTheme === "light") return bsTheme;

    return getStoredTheme();
}

async function parseJsonResponse(response) {
    const rawText = await response.text();

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Invalid JSON response:", rawText);
        throw new Error("Server returned invalid JSON.");
    }
}

function getInitials(name) {
    if (!name) return "U";

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";

    return parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function normalizeUserPayload(data = {}) {
    const name = (data.name || "User").trim();
    const nickname = (data.nickname || "").trim();

    return {
        name,
        nickname,
        gender: (data.gender || "").trim(),
        email: (data.email || "").trim(),
        role: (data.role || "").trim(),
        role_label: (data.role_label || "").trim(),
        department_name: (data.department_name || "").trim(),
        initials: (data.initials || getInitials(nickname || name)).trim(),
        profile_image_url: (data.profile_image_url || "").trim()
    };
}

function getToasterOptions() {
    return {
        fill: "#000000",
        roundness: 15,
        styles: {
            description: "text-[#d1d5db]! text-[16px]! leading-[1.45]!",
            badge: "bg-white/10! text-white!",
            button: "bg-white/10! text-white! hover:bg-white/15!"
        }
    };
}

function useSileoTheme() {
    const [theme, setTheme] = React.useState(getCurrentTheme);

    React.useEffect(() => {
        function syncTheme(event) {
            const nextTheme = event?.detail?.theme;
            if (nextTheme === "dark" || nextTheme === "light") {
                setTheme(nextTheme);
                return;
            }

            setTheme(getCurrentTheme());
        }

        const observer = new MutationObserver(() => {
            setTheme(getCurrentTheme());
        });

        window.addEventListener("dashboard-theme-changed", syncTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme", "data-bs-theme"]
        });

        return () => {
            window.removeEventListener("dashboard-theme-changed", syncTheme);
            observer.disconnect();
        };
    }, []);

    return theme;
}

function SileoRootStyles() {
    return (
        <style>{`
            #sileo-root {
                position: fixed;
                inset: 0;
                z-index: 5000;
                pointer-events: none;
            }

            #sileo-root > * {
                pointer-events: auto;
            }

            #sileo-root [data-sileo-title] {
                font-size: 16px;
            }

            #sileo-root [data-sileo-description] {
                font-size: 15px;
                font-weight: 500;
                color: #d1d5db !important;
            }
        `}</style>
    );
}

function ThemeToaster() {
    const theme = useSileoTheme();

    return (
        <>
            <SileoRootStyles />
            <Toaster
                key={theme}
                position="top-center"
                offset={{ top: 10 }}
                options={getToasterOptions()}
            />
        </>
    );
}

function getGreetingMeta(date = new Date()) {
    const hour = date.getHours();

    if (hour < 12) {
        return {
            label: "Good Morning",
            icon: "bi-sunrise-fill",
            chip: "Morning"
        };
    }

    if (hour < 18) {
        return {
            label: "Good Afternoon",
            icon: "bi-brightness-high-fill",
            chip: "Afternoon"
        };
    }

    return {
        label: "Good Evening",
        icon: "bi-moon-stars-fill",
        chip: "Evening"
    };
}

function getHonorific(gender) {
    const value = (gender || "").trim().toLowerCase();

    if (value === "male") return "Sir";
    if (value === "female") return "Ma'am";
    return "";
}

function getDisplayName(user) {
    const nickname = user?.nickname?.trim();
    if (nickname) return nickname;

    const name = user?.name?.trim();
    return name || "User";
}

function getRoleLabel(user) {
    if (user?.role_label?.trim()) return user.role_label.trim();

    if (user?.role?.trim()) {
        return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }

    return "User";
}

function buildGreeting(user, date = new Date()) {
    const meta = getGreetingMeta(date);
    const title = getHonorific(user?.gender);
    const displayName = getDisplayName(user);

    return `${meta.label}, ${title ? `${title} ` : ""}${displayName}`;
}

function getFriendlyDate(date = new Date()) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    }).format(date);
}

function DarkModeToggle({ dark, onToggle }) {
    return (
        <button
            type="button"
            className={`theme-toggle ${dark ? "is-dark" : ""}`}
            onClick={onToggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
        >
            <span className="theme-toggle-track">
                <span className="theme-toggle-thumb">
                    <i className={`bi ${dark ? "bi-moon-stars-fill" : "bi-sun-fill"}`}></i>
                </span>
            </span>
        </button>
    );
}

function ChatButton() {
    return (
        <button
            type="button"
            className="topbar-icon-btn"
            aria-label="Messages"
            title="Messages"
        >
            <i className="bi bi-chat-dots"></i>
        </button>
    );
}

const TASKS_API = "php/get_tasks.php";
const MANILA_TIMEZONE = "Asia/Manila";

function getTodayYMDInManila() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MANILA_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

function parseYMDToUTC(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function formatTaskDate(dateStr) {
    const date = parseYMDToUTC(dateStr);
    if (!date) return "";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

function normalizeStatus(status = "") {
    return String(status).trim().toLowerCase();
}

function getTaskDueMeta(task) {
    if (!task?.deadline) return null;
    if (normalizeStatus(task.status) === "completed") return null;

    const todayUTC = parseYMDToUTC(getTodayYMDInManila());
    const deadlineUTC = parseYMDToUTC(task.deadline);

    if (!todayUTC || !deadlineUTC) return null;

    const diffDays = Math.ceil((deadlineUTC - todayUTC) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return {
            label: "Overdue",
            icon: "bi-exclamation-circle",
            iconColor: "notif-red",
            time: "Past deadline"
        };
    }

    if (diffDays === 0) {
        return {
            label: "Due Today",
            icon: "bi-calendar2-check",
            iconColor: "notif-amber",
            time: "Today"
        };
    }

    if (diffDays === 1) {
        return {
            label: "Due Tomorrow",
            icon: "bi-calendar2-event",
            iconColor: "notif-blue",
            time: "Tomorrow"
        };
    }

    return null;
}

function buildTaskNotifications(tasks = []) {
    return tasks
        .map((task) => {
            const meta = getTaskDueMeta(task);
            if (!meta) return null;

            return {
                id: `task-${task.id ?? task.title ?? Math.random()}`,
                icon: meta.icon,
                iconColor: meta.iconColor,
                title: meta.label,
                desc: `${task.title || "Untitled Task"}${task.deadline ? ` • ${formatTaskDate(task.deadline)}` : ""}`,
                time: meta.time,
                unread: true
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const priority = {
                "Overdue": 0,
                "Due Today": 1,
                "Due Tomorrow": 2
            };

            return (priority[a.title] ?? 99) - (priority[b.title] ?? 99);
        });
}

function NotificationBell() {
    const [open, setOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState([]);
    const panelRef = React.useRef(null);
    const btnRef = React.useRef(null);
    const panelId = React.useId();

    React.useEffect(() => {
        let active = true;

        async function loadNotifications() {
            try {
                const response = await fetch(TASKS_API, {
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const data = await parseJsonResponse(response);

                if (!response.ok) {
                    throw new Error("Failed to load task notifications.");
                }

                if (!active) return;

                const items = buildTaskNotifications(Array.isArray(data) ? data : []);
                setNotifications(items);
            } catch (error) {
                console.error("Unable to load task notifications:", error);
                if (!active) return;
                setNotifications([]);
            }
        }

        loadNotifications();
        const intervalId = window.setInterval(loadNotifications, 60000);

        return () => {
            active = false;
            window.clearInterval(intervalId);
        };
    }, []);

    const unreadCount = notifications.length;

    React.useEffect(() => {
        if (!open) return undefined;

        function handlePointerDown(event) {
            const target = event.target;

            if (
                panelRef.current &&
                !panelRef.current.contains(target) &&
                btnRef.current &&
                !btnRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setOpen(false);
                btnRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div className="topbar-notif-wrap">
            <button
                ref={btnRef}
                type="button"
                className={`topbar-icon-btn notif-btn ${open ? "active" : ""}`}
                onClick={() => setOpen((value) => !value)}
                aria-label="Notifications"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-controls={panelId}
            >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {open && (
                <div
                    ref={panelRef}
                    id={panelId}
                    className="notif-panel"
                    role="dialog"
                    aria-label="Notifications"
                    tabIndex={-1}
                >
                    <div className="notif-panel-head">
                        <span className="notif-panel-title">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="notif-panel-count">{unreadCount} new</span>
                        )}
                    </div>

                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">No due-soon tasks</div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    className={`notif-item ${item.unread ? "unread" : ""}`}
                                >
                                    <div className={`notif-item-icon ${item.iconColor}`}>
                                        <i className={`bi ${item.icon}`}></i>
                                    </div>

                                    <div className="notif-item-body">
                                        <div className="notif-item-title">{item.title}</div>
                                        <div className="notif-item-desc">{item.desc}</div>
                                        <div className="notif-item-time">{item.time}</div>
                                    </div>

                                    {item.unread && <span className="notif-unread-dot"></span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function UserChip({ user, userLoaded }) {
    const [imgFailed, setImgFailed] = React.useState(false);

    React.useEffect(() => {
        setImgFailed(false);
    }, [user.profile_image_url]);

    const displayName = getDisplayName(user);
    const initials = user.initials || getInitials(user.name || user.nickname || "U");
    const email = userLoaded ? user.email || "" : "";
    const hasImage = Boolean(user.profile_image_url) && !imgFailed;

    return (
        <div className="topbar-user-wrap" aria-label="Current user">
            <div
                className="topbar-user-chip"
                style={{
                    padding: "8px 12px",
                    borderRadius: "18px",
                    background: "var(--bs-tertiary-bg)",
                    border: "1px solid var(--bs-border-color)",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
                }}
            >
                <div className="topbar-user-avatar">
                    {hasImage ? (
                        <img
                            src={user.profile_image_url}
                            alt={displayName}
                            onError={() => setImgFailed(true)}
                        />
                    ) : (
                        <span className="topbar-user-initials">{initials}</span>
                    )}
                    <span className="topbar-online-dot"></span>
                </div>

                <div className="topbar-user-info" style={{ minWidth: 0 }}>
                    <div
                        className="fw-bold text-body"
                        style={{
                            fontSize: "14px",
                            lineHeight: 1.1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}
                    >
                        {displayName}
                    </div>

                    <div
                        className="text-body-secondary"
                        style={{
                            fontSize: "12px",
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}
                    >
                        {email}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TopBar() {
    const [dark, setDark] = React.useState(() => getStoredTheme() === "dark");
    const [now, setNow] = React.useState(() => new Date());
    const [user, setUser] = React.useState(FALLBACK_USER);
    const [userLoaded, setUserLoaded] = React.useState(false);
    const didInitThemeRef = React.useRef(false);

    React.useEffect(() => {
        const theme = dark ? "dark" : "light";

        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.setAttribute("data-bs-theme", theme);
        localStorage.setItem(THEME_KEY, theme);

        window.dispatchEvent(
            new CustomEvent("dashboard-theme-changed", {
                detail: { theme }
            })
        );

        if (didInitThemeRef.current) {
            sileo.info({
                title: theme === "dark" ? "Dark mode enabled" : "Light mode enabled",
                description:
                    theme === "dark"
                        ? "Your dashboard theme is now using dark mode."
                        : "Your dashboard theme is now using light mode."
            });
        } else {
            didInitThemeRef.current = true;
        }
    }, [dark]);

    React.useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, GREETING_REFRESH_MS);

        return () => window.clearInterval(timerId);
    }, []);

    React.useEffect(() => {
        let active = true;

        async function loadUser() {
            try {
                const response = await fetch(TOPBAR_USER_API, {
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const data = await parseJsonResponse(response);

                if (!response.ok || data.error) {
                    throw new Error(data.error || "Failed to load user information.");
                }

                if (!active) return;

                setUser(normalizeUserPayload(data));
            } catch (error) {
                console.error("Unable to load top bar user:", error);

                if (!active) return;

                setUser(FALLBACK_USER);
            } finally {
                if (active) {
                    setUserLoaded(true);
                }
            }
        }

        function applyProfileUpdate(detail) {
            if (!detail) {
                loadUser();
                return;
            }

            setUser(normalizeUserPayload(detail));
            setUserLoaded(true);
        }

        loadUser();
        window.addEventListener("profile-updated", (event) => applyProfileUpdate(event.detail));

        return () => {
            active = false;
            window.removeEventListener("profile-updated", (event) => applyProfileUpdate(event.detail));
        };
    }, []);

    // Fix the event listener cleanup by using stable handlers.
    React.useEffect(() => {
        let active = true;

        async function loadUser() {
            try {
                const response = await fetch(TOPBAR_USER_API, {
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const data = await parseJsonResponse(response);

                if (!response.ok || data.error) {
                    throw new Error(data.error || "Failed to load user information.");
                }

                if (!active) return;

                setUser(normalizeUserPayload(data));
            } catch (error) {
                console.error("Unable to load top bar user:", error);

                if (!active) return;

                setUser(FALLBACK_USER);
            } finally {
                if (active) setUserLoaded(true);
            }
        }

        function handleProfileUpdated(event) {
            const detail = event?.detail;

            if (!detail) {
                loadUser();
                return;
            }

            setUser(normalizeUserPayload(detail));
            setUserLoaded(true);
        }

        loadUser();
        window.addEventListener("profile-updated", handleProfileUpdated);

        return () => {
            active = false;
            window.removeEventListener("profile-updated", handleProfileUpdated);
        };
    }, []);

const greetingMeta = getGreetingMeta(now);
const greetingText = buildGreeting(user, now);
const todayText = getFriendlyDate(now);

return (
    <header className="topbar">
        <div className="topbar-left">
            <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                <div
                    className="d-inline-flex align-items-center justify-content-center shadow-sm"
                    style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "18px",
                        background:
                            "linear-gradient(135deg, rgba(255,193,7,0.18), rgba(13,110,253,0.12))",
                        border: "1px solid var(--bs-border-color)",
                        flexShrink: 0
                    }}
                >
                    <i
                        className={`bi ${greetingMeta.icon}`}
                        style={{ fontSize: "24px" }}
                        aria-hidden="true"
                    ></i>
                </div>

                <div style={{ minWidth: 0 }}>
                    <div
                        className="d-flex align-items-center flex-wrap gap-2 mb-1"
                        style={{ minWidth: 0 }}
                    >
                        <span
                            className="badge rounded-pill text-body-emphasis"
                            style={{
                                background: "var(--bs-tertiary-bg)",
                                border: "1px solid var(--bs-border-color)",
                                padding: "6px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                letterSpacing: "0.04em"
                            }}
                        >
                            <i className={`bi ${greetingMeta.icon} me-1`} aria-hidden="true"></i>
                            {greetingMeta.chip}
                        </span>

                        <span
                            className="text-body-secondary"
                            style={{ fontSize: "12px", fontWeight: 600 }}
                        >
                            {todayText}
                        </span>
                    </div>

                    <h1
                        className="mb-1 fw-bold text-body"
                        style={{
                            fontSize: "28px",
                            lineHeight: 1.1,
                            letterSpacing: "-0.02em",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%"
                        }}
                    >
                        {greetingText}
                    </h1>
                </div>
            </div>
        </div>

        <div className="topbar-right">
            <DarkModeToggle dark={dark} onToggle={() => setDark((value) => !value)} />
            <div className="topbar-sep"></div>

            <ChatButton />
            <div className="topbar-sep"></div>

            <NotificationBell />
            <div className="topbar-sep"></div>

            <UserChip user={user} userLoaded={userLoaded} />
        </div>
    </header>
);
}

const sileoRoot = document.getElementById("sileo-root");
if (sileoRoot && !sileoRoot.dataset.mounted) {
    sileoRoot.dataset.mounted = "true";
    createRoot(sileoRoot).render(<ThemeToaster />);
}

const topbarRoot = document.getElementById("topbar-root");
if (topbarRoot && !topbarRoot.dataset.mounted) {
    topbarRoot.dataset.mounted = "true";
    createRoot(topbarRoot).render(<TopBar />);
}