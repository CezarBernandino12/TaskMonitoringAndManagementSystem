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

function getInitials(name) {
    if (!name) return "U";

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";

    return parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
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

    if (value === "male") return "Sir.";
    if (value === "female") return "Ma'am";
    return "";
}

function getPreferredName(user) {
    const nickname = user?.nickname?.trim();
    if (nickname) return nickname;

    const name = user?.name?.trim();
    return name || "User";
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
    const preferredName = getPreferredName(user);

    return `${meta.label}, ${title ? `${title} ` : ""}${preferredName}`;
}

function getFriendlyDate(date = new Date()) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    }).format(date);
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
    const initials = user.initials || getInitials(user.name || user.nickname || "U");
    const displayName = getDisplayName(user);
    const email = user.email || "";
    const roleText = getRoleLabel(user);

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
                    {hasImage
                        ? <img src={user.profile_image_url} alt={displayName} onError={() => setImgFailed(true)} />
                        : <span className="topbar-user-initials">{initials}</span>
                    }
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
                        {userLoaded ? `${email}` : ""}
                    </div>
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
        nickname: "",
        gender: "",
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
                    nickname: data.nickname || "",
                    gender: data.gender || "",
                    email: data.email || "",
                    role: data.role || "",
                    role_label: data.role_label || "",
                    department_name: data.department_name || "",
                    initials: data.initials || getInitials(data.name || "User"),
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
                nickname: d.nickname || "",
                gender: d.gender || "",
                email: d.email || "",
                role: d.role || "",
                role_label: d.role_label || "",
                department_name: d.department_name || "",
                initials: d.initials || getInitials(d.name || "User"),
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

    const greetingMeta = getGreetingMeta(now);
    const greetingText = buildGreeting(user, now);
    const roleText = getRoleLabel(user);
    const todayText = getFriendlyDate(now);
    const secondaryText = user.department_name
        ? `${roleText} • ${user.department_name}`
        : roleText;

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div
                    className="d-flex align-items-center gap-3"
                    style={{ minWidth: 0 }}
                >
                    <div
                        className="d-inline-flex align-items-center justify-content-center shadow-sm"
                        style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "18px",
                            background: "linear-gradient(135deg, rgba(255,193,7,0.18), rgba(13,110,253,0.12))",
                            border: "1px solid var(--bs-border-color)",
                            flexShrink: 0
                        }}
                    >
                        <i
                            className={`bi ${greetingMeta.icon}`}
                            style={{
                                fontSize: "24px"
                            }}
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
                                <i className={`bi ${greetingMeta.icon} me-1`}></i>
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