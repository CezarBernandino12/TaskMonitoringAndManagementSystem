/* ============================================================
   topbar.jsx  –  Dashboard Top Bar
   Renders into #topbar-root
   ============================================================ */

import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

const TOPBAR_USER_API = "php/sidebar.php";
const THEME_KEY = "dashboard-theme";
const GREETING_REFRESH_MS = 60 * 1000;

function getCurrentTheme() {
    const attrTheme = document.documentElement.getAttribute("data-theme");
    if (attrTheme === "dark" || attrTheme === "light") return attrTheme;

    const bsTheme = document.documentElement.getAttribute("data-bs-theme");
    if (bsTheme === "dark" || bsTheme === "light") return bsTheme;

    const storedTheme = localStorage.getItem(THEME_KEY);
    return storedTheme === "dark" ? "dark" : "light";
}

function getToasterOptions(theme) {
    const isDark = theme === "dark";

    return {
        fill: isDark ? "#111111" : "#ffffff",
        roundness: 15,
        styles: {
            title: isDark
                ? "text-[#f4f4f5]! text-[20px] font-semibold! leading-none!"
                : "text-[#111111]! text-[20px] font-semibold! leading-none!",
            description: isDark
                ? "text-[#d4d4d8]! text-[18px]! leading-[1.45]!"
                : "text-[#52525b]! text-[18px]! leading-[1.45]!",
            badge: isDark
                ? "bg-[#1f3b22]! text-[#32d74b]!"
                : "bg-[#e8f7ec]! text-[#1f8f38]!",
            button: isDark
                ? "bg-white/10! text-white! hover:bg-white/15!"
                : "bg-dark-subtle! text-dark! hover:bg-secondary-subtle!"
        }
    };
}

function useSileoTheme() {
    const [theme, setTheme] = React.useState(getCurrentTheme);

    React.useEffect(() => {
        function syncTheme(e) {
            const nextTheme = e?.detail?.theme;
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

function ThemeToaster() {
    const theme = useSileoTheme();

    return (
        <Toaster
            position="top-center"
            offset={{ top: 10 }}
            options={getToasterOptions(theme)}
        />
    );
}

function getGreetingByTime(date = new Date()) {
    const hour = date.getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
}

function getDisplayName(name) {
    return name && name.trim() ? name.trim() : "User";
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
        { id: 1, icon: "bi-check2-circle", iconColor: "notif-green", title: "Task completed", desc: "Q2 Report has been marked as done.", time: "2 min ago", unread: true },
        { id: 2, icon: "bi-calendar-event", iconColor: "notif-blue", title: "Meeting reminder", desc: "Team standup starts in 15 minutes.", time: "14 min ago", unread: true },
        { id: 3, icon: "bi-person-plus", iconColor: "notif-purple", title: "New team member", desc: "Maria Santos joined your department.", time: "1 hr ago", unread: true },
        { id: 4, icon: "bi-file-earmark-text", iconColor: "notif-amber", title: "Document shared", desc: "Budget proposal was shared with you.", time: "Yesterday", unread: false }
    ];

    const unreadCount = notifications.filter((n) => n.unread).length;

    return (
        <div className="topbar-notif-wrap">
            <button
                ref={btnRef}
                type="button"
                className={`topbar-icon-btn notif-btn ${open ? "active" : ""}`}
                onClick={() => setOpen((v) => !v)}
                aria-label="Notifications"
            >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {open && (
                <div ref={panelRef} className="notif-panel" role="dialog" aria-label="Notifications">
                    <div className="notif-panel-head">
                        <span className="notif-panel-title">Notifications</span>
                        {unreadCount > 0 && <span className="notif-panel-count">{unreadCount} new</span>}
                    </div>

                    <div className="notif-list">
                        {notifications.map((n) => (
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
    const didInitThemeRef = React.useRef(false);

    React.useEffect(() => {
        const theme = dark ? "dark" : "light";

        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.setAttribute("data-bs-theme", theme);
        localStorage.setItem(THEME_KEY, theme);

        if (didInitThemeRef.current) {
            window.dispatchEvent(
                new CustomEvent("dashboard-theme-changed", {
                    detail: { theme }
                })
            );

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
                    profile_image_url: data.profile_image_url || ""
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
                profile_image_url: d.profile_image_url || ""
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
                <DarkModeToggle dark={dark} onToggle={() => setDark((v) => !v)} />
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
if (topbarRoot) {
    createRoot(topbarRoot).render(<TopBar />);
}