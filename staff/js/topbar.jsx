/* ============================================================
   topbar.jsx  –  Dashboard Top Bar
   Renders into #topbar-root
   ============================================================ */

const TOPBAR_USER_API = "php/sidebar.php";
const THEME_KEY       = "dashboard-theme";
const GREETING_REFRESH_MS = 60 * 1000;

function getGreetingByTime(date = new Date()) {
    const hour = date.getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
}

function getDisplayName(name) {
    return name && name.trim() ? name.trim() : "User";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
}

function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

function DarkModeToggle({ dark, onToggle }) {
    return (
        <button
            type="button"
            className={`topbar-icon-btn theme-toggle ${dark ? "is-dark" : ""}`}
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

function NotificationBell() {
    const [open, setOpen] = React.useState(false);
    const [count] = React.useState(3);
    const panelRef = React.useRef(null);
    const btnRef = React.useRef(null);

    React.useEffect(() => {
        if (!open) return;

        function handle(e) {
            if (
                panelRef.current && !panelRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);

    const notifications = [
        { id: 1, icon: "bi-check2-circle",    iconColor: "notif-green",  title: "Task completed",   desc: "Q2 Report has been marked as done.",  time: "2 min ago",  unread: true  },
        { id: 2, icon: "bi-calendar-event",   iconColor: "notif-blue",   title: "Meeting reminder", desc: "Team standup starts in 15 minutes.",   time: "14 min ago", unread: true  },
        { id: 3, icon: "bi-person-plus",      iconColor: "notif-purple", title: "New team member",  desc: "Maria Santos joined your department.", time: "1 hr ago",   unread: true  },
        { id: 4, icon: "bi-file-earmark-text",iconColor: "notif-amber",  title: "Document shared",  desc: "Budget proposal was shared with you.", time: "Yesterday",  unread: false },
    ];

    return (
        <div className="topbar-notif-wrap">
            <button
                ref={btnRef}
                type="button"
                className={`topbar-icon-btn notif-btn ${open ? "active" : ""}`}
                onClick={() => setOpen(v => !v)}
                aria-label="Notifications"
            >
                <i className="bi bi-bell"></i>
                {count > 0 && <span className="notif-badge">{count}</span>}
            </button>

            {open && (
                <div ref={panelRef} className="notif-panel" role="dialog" aria-label="Notifications">
                    <div className="notif-panel-head">
                        <span className="notif-panel-title">Notifications</span>
                        {count > 0 && <span className="notif-panel-count">{count} new</span>}
                    </div>

                    <div className="notif-list">
                        {notifications.map(n => (
                            <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`}>
                                <div className={`notif-item-icon ${n.iconColor}`}>
                                    <i className={`bi ${n.icon}`}></i>
                                </div>
                                <div className="notif-item-body">
                                    <div className="notif-item-title">{n.title}</div>
                                    <div className="notif-item-desc">{n.desc}</div>
                                    <div className="notif-item-time">{n.time}</div>
                                </div>
                                {n.unread && <span className="notif-unread-dot"></span>}
                            </div>
                        ))}
                    </div>

                    <div className="notif-panel-footer">
                        <a href="#" className="notif-view-all">View all notifications</a>
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

    const hasImage = user.profile_image_url && !imgFailed;
    const initials = user.initials || "U";
    const name = user.name || "User";
    const email = user.email || "";

    return (
        <div className="topbar-user-wrap" aria-label="Current user">
            <div className="topbar-user-chip">
                <div className="topbar-user-avatar">
                    {hasImage
                        ? <img src={user.profile_image_url} alt={name} onError={() => setImgFailed(true)} />
                        : <span className="topbar-user-initials">{initials}</span>
                    }
                    <span className="topbar-online-dot"></span>
                </div>

                <div className="topbar-user-info">
                    <span className="topbar-user-email">{userLoaded ? email : ""}</span>
                </div>
            </div>
        </div>
    );
}

function TopBar() {
    const [dark, setDark] = React.useState(() => getStoredTheme() === "dark");
    const [now, setNow] = React.useState(() => new Date());
    const [user, setUser] = React.useState({
        name: "",
        email: "",
        role: "",
        role_label: "",
        department_name: "",
        initials: "",
        profile_image_url: ""
    });
    const [userLoaded, setUserLoaded] = React.useState(false);

    React.useEffect(() => {
        applyTheme(dark ? "dark" : "light");
    }, [dark]);

    React.useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, GREETING_REFRESH_MS);

        return () => window.clearInterval(timer);
    }, []);

    React.useEffect(() => {
        let active = true;

        async function load() {
            try {
                const res = await fetch(TOPBAR_USER_API, {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" }
                });

                const data = await res.json();
                if (!active || !res.ok || data.error) return;

                setUser({
                    name: data.name || "User",
                    email: data.email || "",
                    role: data.role || "",
                    role_label: data.role_label || "",
                    department_name: data.department_name || "",
                    initials: data.initials || "U",
                    profile_image_url: data.profile_image_url || "",
                });

                setUserLoaded(true);
            } catch (_) {
                if (active) setUserLoaded(true);
            }
        }

        function onProfileUpdated(e) {
            const d = e.detail;
            if (!d) {
                load();
                return;
            }

            setUser({
                name: d.name || "User",
                email: d.email || "",
                role: d.role || "",
                role_label: d.role_label || "",
                department_name: d.department_name || "",
                initials: d.initials || "U",
                profile_image_url: d.profile_image_url || "",
            });

            setUserLoaded(true);
        }

        load();
        window.addEventListener("profile-updated", onProfileUpdated);

        return () => {
            active = false;
            window.removeEventListener("profile-updated", onProfileUpdated);
        };
    }, []);

    const greetingText = `${getGreetingByTime(now)}, ${getDisplayName(user.name)}`;

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="topbar-greeting">
                    <h1 className="topbar-greeting-title">{greetingText}</h1>
                </div>
            </div>

            <div className="topbar-right">
                <DarkModeToggle dark={dark} onToggle={() => setDark(v => !v)} />
                <div className="topbar-sep"></div>
                <NotificationBell />
                <div className="topbar-sep"></div>
                <UserChip user={user} userLoaded={userLoaded} />
            </div>
        </header>
    );
}

const topbarRoot = document.getElementById("topbar-root");
if (topbarRoot) {
    ReactDOM.createRoot(topbarRoot).render(<TopBar />);
}