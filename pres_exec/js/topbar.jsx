import React from "https://esm.sh/react@18.3.1";
import ReactDOM from "https://esm.sh/react-dom@18.3.1";
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
        function handleThemeChange(e) {
            const t = e.detail?.theme;
            if (t === "dark" || t === "light") setTheme(t);
        }
        window.addEventListener("dashboard-theme-changed", handleThemeChange);
        return () => window.removeEventListener("dashboard-theme-changed", handleThemeChange);
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

// ====================================================================
// MESSAGING MODAL — constants & helpers
// ====================================================================
const MSG_CONVERSATIONS_API = "php/get_conversations.php";
const MSG_MESSAGES_API      = "php/get_task_messages.php";
const MSG_SEND_API          = "php/send_task_message.php";

function getInitialsColor(name = "") {
    const COLORS = [
        "#4f46e5","#0ea5e9","#10b981","#f59e0b",
        "#ef4444","#8b5cf6","#ec4899","#06b6d4",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
}

function UserAvatar({ name = "", imageUrl = "", size = 36 }) {
    const [imgFailed, setImgFailed] = React.useState(false);

    React.useEffect(() => {
        setImgFailed(false);
    }, [imageUrl]);

    const initials = getInitials(name);
    const bg = getInitialsColor(name);
    const hasImage = Boolean(imageUrl) && !imgFailed;

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: bg,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.38,
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: "0.02em",
                overflow: "hidden",
            }}
        >
            {hasImage ? (
                <img
                    src={imageUrl}
                    alt={name || "User"}
                    onError={() => setImgFailed(true)}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            ) : (
                initials
            )}
        </div>
    );
}

function formatMsgTime(isoStr) {
    if (!isoStr) return "";
    const d   = new Date(isoStr);
    const now = new Date();
    const diffMs  = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr  / 24);

    if (diffMin < 1)   return "just now";
    if (diffMin < 60)  return `${diffMin}m ago`;
    if (diffHr  < 24)  return `${diffHr}h ago`;
    if (diffDay < 7)   return `${diffDay}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatBubbleTime(isoStr) {
    if (!isoStr) return "";
    return new Date(isoStr).toLocaleTimeString(undefined, {
        hour: "2-digit", minute: "2-digit",
    });
}

// ====================================================================
// MESSAGING MODAL COMPONENT
// ====================================================================
function MessagingModal({ open, onClose, currentUserId }) {
    const [view, setView] = React.useState("list"); // "list" | "thread"
    const [search, setSearch] = React.useState("");
    const [tab, setTab] = React.useState("recent"); // "recent" | "all"
    const [conversations, setConversations] = React.useState([]);
    const [allUsers, setAllUsers] = React.useState([]);
    const [totalUnread, setTotalUnread] = React.useState(0);
    const [loadingList, setLoadingList] = React.useState(false);

    const [activeUser, setActiveUser] = React.useState(null);
    const [messages, setMessages] = React.useState([]);
    const [loadingMsgs, setLoadingMsgs] = React.useState(false);
    const [msgText, setMsgText] = React.useState("");
    const [sending, setSending] = React.useState(false);

    const messagesEndRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const modalRef = React.useRef(null);

    React.useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    React.useEffect(() => {
        if (!open) return;

        setLoadingList(true);

        fetch(MSG_CONVERSATIONS_API, { credentials: "same-origin" })
            .then(r => r.json())
            .then(data => {
                setConversations(Array.isArray(data.conversations) ? data.conversations : []);
                setAllUsers(Array.isArray(data.all_users) ? data.all_users : []);
                setTotalUnread(Number(data.total_unread || 0));
            })
            .catch(err => {
                console.error("[MSG] conversations fetch error:", err);
                setConversations([]);
                setAllUsers([]);
                setTotalUnread(0);
            })
            .finally(() => setLoadingList(false));
    }, [open]);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    React.useEffect(() => {
        if (view !== "thread") return;
        const id = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(id);
    }, [view]);

    function normalizeThreadUser(user = {}) {
        return {
            user_id: user.user_id ?? user.id ?? null,
            user_name: user.user_name ?? user.name ?? "User",
            user_role: user.user_role ?? user.role ?? "",
            user_role_label: user.user_role_label ?? user.role_label ?? user.role ?? "",
            user_initials: user.user_initials ?? user.initials ?? getInitials(user.user_name ?? user.name ?? "User"),
            profile_image: user.profile_image ?? null,
            profile_image_url: user.profile_image_url ?? "",
        };
    }

    function sortConversationsByRecent(list = []) {
        return [...list].sort((a, b) => {
            const aTime = a?.last_time ? new Date(a.last_time).getTime() : 0;
            const bTime = b?.last_time ? new Date(b.last_time).getTime() : 0;
            return bTime - aTime;
        });
    }

    function openThread(user) {
        const normalizedUser = normalizeThreadUser(user);
        setActiveUser(normalizedUser);
        setMessages([]);
        setMsgText("");
        setView("thread");
        loadThreadMessages(normalizedUser.user_id);
    }

    function loadThreadMessages(otherUserId) {
        if (!otherUserId) return;

        setLoadingMsgs(true);

        const url = `php/get_user_messages.php?other_user_id=${encodeURIComponent(otherUserId)}`;

        fetch(url, { credentials: "same-origin" })
            .then(r => r.json())
            .then(data => {
                setMessages(Array.isArray(data.messages) ? data.messages : []);

                if (data.other_user) {
                    setActiveUser(prev => ({
                        ...normalizeThreadUser(prev || {}),
                        ...normalizeThreadUser({
                            user_id: data.other_user.id,
                            user_name: data.other_user.name,
                            user_role: data.other_user.role,
                            user_role_label: data.other_user.role_label,
                            user_initials: data.other_user.initials,
                            profile_image: data.other_user.profile_image,
                            profile_image_url: data.other_user.profile_image_url,
                        }),
                    }));
                }

                setConversations(prev =>
                    prev.map(c =>
                        c.user_id === otherUserId
                            ? { ...c, unread_count: 0 }
                            : c
                    )
                );

                setTotalUnread(prev => {
                    const openedConversation = conversations.find(c => c.user_id === otherUserId);
                    const unreadToClear = Number(openedConversation?.unread_count || 0);
                    return Math.max(0, prev - unreadToClear);
                });
            })
            .catch(err => {
                console.error("[MSG] fetch error:", err);
                setMessages([]);
            })
            .finally(() => setLoadingMsgs(false));
    }

    async function sendMessage() {
        const trimmed = msgText.trim();
        if (!trimmed || !activeUser) return;

        setSending(true);

        try {
            const recipientId = activeUser.user_id || activeUser.id;

            const res = await fetch(MSG_SEND_API, {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient_id: recipientId,
                    message: trimmed,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success || !data.message) {
                throw new Error(data?.error || "Failed to send message.");
            }

            setMessages(prev => [...prev, data.message]);
            setMsgText("");

            setConversations(prev => {
                const exists = prev.some(c => c.user_id === recipientId);

                const nextItem = {
                    user_id: recipientId,
                    user_name: activeUser.user_name || activeUser.name,
                    user_role: activeUser.user_role || "",
                    user_role_label: activeUser.user_role_label || "",
                    user_initials: activeUser.user_initials || getInitials(activeUser.user_name || activeUser.name || "User"),
                    profile_image: activeUser.profile_image || null,
                    profile_image_url: activeUser.profile_image_url || "",
                    last_message: trimmed,
                    last_time: data.message.time_sent || new Date().toISOString(),
                    unread_count: 0,
                };

                const updated = exists
                    ? prev.map(c => (c.user_id === recipientId ? { ...c, ...nextItem } : c))
                    : [nextItem, ...prev];

                return sortConversationsByRecent(updated);
            });
        } catch (err) {
            console.error("Send failed:", err);
        } finally {
            setSending(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    const lowerSearch = search.toLowerCase();

    const filteredConvos = conversations.filter(c =>
        c.user_name?.toLowerCase().includes(lowerSearch)
    );

    const filteredUsers = allUsers.filter(u =>
        u.name?.toLowerCase().includes(lowerSearch)
    );

    if (!open) return null;

    return ReactDOM.createPortal(
        <>
            <style>{`
                .msg-backdrop {
                    position: fixed; inset: 0; z-index: 99998;
                    background: rgba(0,0,0,0.45);
                    backdrop-filter: blur(4px);
                    animation: msgFadeIn .15s ease;
                }
                @keyframes msgFadeIn { from { opacity:0 } to { opacity:1 } }
                @keyframes msgSlideUp {
                    from { opacity:0; transform:translateY(24px) scale(.97) }
                    to   { opacity:1; transform:translateY(0) scale(1) }
                }
                .msg-modal {
                    position: fixed;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 99999;
                    width: min(560px, 96vw);
                    height: min(680px, 90vh);
                    background: var(--bs-body-bg);
                    border: 1px solid var(--bs-border-color);
                    border-radius: 20px;
                    box-shadow: 0 24px 80px rgba(0,0,0,.22);
                    display: flex; flex-direction: column; overflow: hidden;
                    animation: msgSlideUp .2s cubic-bezier(.34,1.56,.64,1);
                }
                .msg-header {
                    display: flex; align-items: center; gap: 10px;
                    padding: 18px 20px 14px;
                    border-bottom: 1px solid var(--bs-border-color);
                    flex-shrink: 0;
                }
                .msg-header-title {
                    font-size: 17px; font-weight: 700;
                    color: var(--bs-body-color);
                    flex: 1; margin: 0;
                }
                .msg-close-btn {
                    background: var(--bs-tertiary-bg);
                    border: 1px solid var(--bs-border-color);
                    border-radius: 10px;
                    width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: var(--bs-body-color);
                    transition: background .15s;
                }
                .msg-close-btn:hover { background: var(--bs-secondary-bg); }
                .msg-search-wrap {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--bs-border-color);
                    flex-shrink: 0;
                }
                .msg-search {
                    width: 100%;
                    background: var(--bs-tertiary-bg);
                    border: 1px solid var(--bs-border-color);
                    border-radius: 10px;
                    padding: 8px 12px 8px 36px;
                    font-size: 14px; color: var(--bs-body-color);
                    outline: none; transition: border-color .15s;
                }
                .msg-search:focus { border-color: #0d6efd; }
                .msg-search-icon {
                    position: absolute; left: 27px; top: 50%;
                    transform: translateY(-50%);
                    color: var(--bs-secondary-color); font-size: 14px;
                    pointer-events: none;
                }
                .msg-tabs {
                    display: flex; gap: 4px;
                    padding: 8px 16px 0;
                    border-bottom: 1px solid var(--bs-border-color);
                    flex-shrink: 0;
                }
                .msg-tab {
                    padding: 7px 14px; font-size: 13px; font-weight: 600;
                    border: none; background: none; cursor: pointer;
                    color: var(--bs-secondary-color);
                    border-bottom: 2px solid transparent;
                    transition: color .15s, border-color .15s;
                    border-radius: 0;
                }
                .msg-tab.active {
                    color: #0d6efd;
                    border-bottom-color: #0d6efd;
                }
                .msg-list { flex: 1; overflow-y: auto; padding: 8px 0; }
                .msg-list::-webkit-scrollbar { width: 4px; }
                .msg-list::-webkit-scrollbar-thumb {
                    background: var(--bs-border-color); border-radius: 4px;
                }
                .msg-row {
                    display: flex; align-items: center; gap: 12px;
                    padding: 10px 16px; cursor: pointer;
                    transition: background .12s;
                }
                .msg-row:hover { background: var(--bs-tertiary-bg); }
                .msg-row-info { flex: 1; min-width: 0; }
                .msg-row-name {
                    font-size: 14px; font-weight: 600;
                    color: var(--bs-body-color);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .msg-row-preview {
                    font-size: 12px; color: var(--bs-secondary-color);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    margin-top: 2px;
                }
                .msg-row-meta {
                    display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
                }
                .msg-row-time { font-size: 11px; color: var(--bs-secondary-color); }
                .msg-unread-badge {
                    background: #0d6efd; color: #fff;
                    border-radius: 99px; font-size: 11px; font-weight: 700;
                    padding: 1px 6px; min-width: 18px; text-align: center;
                }
                .msg-role-chip {
                    font-size: 11px; font-weight: 500;
                    color: var(--bs-secondary-color);
                    margin-top: 1px;
                }
                .msg-section-label {
                    padding: 10px 16px 4px;
                    font-size: 11px; font-weight: 700; letter-spacing: .06em;
                    text-transform: uppercase; color: var(--bs-secondary-color);
                }
                .msg-empty {
                    padding: 40px 24px; text-align: center;
                    color: var(--bs-secondary-color); font-size: 14px;
                }
                .msg-thread-header {
                    display: flex; align-items: center; gap: 12px;
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--bs-border-color);
                    flex-shrink: 0;
                }
                .msg-back-btn {
                    background: var(--bs-tertiary-bg);
                    border: 1px solid var(--bs-border-color);
                    border-radius: 8px; width: 30px; height: 30px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: var(--bs-body-color);
                    flex-shrink: 0; transition: background .15s;
                }
                .msg-back-btn:hover { background: var(--bs-secondary-bg); }
                .msg-thread-name {
                    font-size: 15px; font-weight: 700;
                    color: var(--bs-body-color); flex: 1;
                }
                .msg-bubbles {
                    flex: 1; overflow-y: auto;
                    padding: 16px;
                    display: flex; flex-direction: column; gap: 8px;
                }
                .msg-bubbles::-webkit-scrollbar { width: 4px; }
                .msg-bubbles::-webkit-scrollbar-thumb {
                    background: var(--bs-border-color); border-radius: 4px;
                }
                .msg-bubble-wrap {
                    display: flex; gap: 8px; align-items: flex-end;
                    max-width: 80%;
                }
                .msg-bubble-wrap.mine {
                    align-self: flex-end; flex-direction: row-reverse;
                }
                .msg-bubble {
                    padding: 10px 14px;
                    border-radius: 18px; font-size: 14px;
                    line-height: 1.45; word-break: break-word;
                }
                .msg-bubble-wrap.mine .msg-bubble {
                    background: #0d6efd; color: #fff;
                    border-bottom-right-radius: 4px;
                }
                .msg-bubble-wrap.theirs .msg-bubble {
                    background: var(--bs-tertiary-bg);
                    color: var(--bs-body-color);
                    border-bottom-left-radius: 4px;
                    border: 1px solid var(--bs-border-color);
                }
                .msg-bubble-time {
                    font-size: 10px; color: var(--bs-secondary-color);
                    margin-top: 3px; padding: 0 4px;
                    align-self: flex-end;
                }
                .msg-input-row {
                    display: flex; gap: 8px; align-items: flex-end;
                    padding: 12px 14px;
                    border-top: 1px solid var(--bs-border-color);
                    flex-shrink: 0;
                }
                .msg-textarea {
                    flex: 1; resize: none;
                    background: var(--bs-tertiary-bg);
                    border: 1px solid var(--bs-border-color);
                    border-radius: 12px;
                    padding: 10px 14px;
                    font-size: 14px; color: var(--bs-body-color);
                    outline: none; min-height: 42px; max-height: 120px;
                    line-height: 1.45; transition: border-color .15s;
                    font-family: inherit;
                }
                .msg-textarea:focus { border-color: #0d6efd; }
                .msg-send-btn {
                    background: #0d6efd; color: #fff;
                    border: none; border-radius: 12px;
                    width: 42px; height: 42px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; flex-shrink: 0;
                    transition: background .15s, transform .1s;
                }
                .msg-send-btn:hover:not(:disabled) { background: #0b5ed7; }
                .msg-send-btn:active:not(:disabled) { transform: scale(.92); }
                .msg-send-btn:disabled { opacity: .5; cursor: not-allowed; }
                .msg-loading {
                    display: flex; align-items: center; justify-content: center;
                    gap: 6px; padding: 32px; color: var(--bs-secondary-color);
                    font-size: 14px;
                }
                .msg-spinner {
                    width: 18px; height: 18px;
                    border: 2px solid var(--bs-border-color);
                    border-top-color: #0d6efd;
                    border-radius: 50%;
                    animation: spin .6s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="msg-backdrop" onClick={onClose} />

            <div className="msg-modal" ref={modalRef} role="dialog" aria-modal="true" aria-label="Messages">
                {view === "list" && (
                    <>
                        <div className="msg-header">
                            <i className="bi bi-chat-dots-fill" style={{ fontSize: 20, color: "#0d6efd" }} />
                            <h2 className="msg-header-title">
                                Messages
                                {totalUnread > 0 && (
                                    <span className="msg-unread-badge" style={{ marginLeft: 8, fontSize: 12 }}>
                                        {totalUnread}
                                    </span>
                                )}
                            </h2>
                            <button className="msg-close-btn" onClick={onClose} aria-label="Close">
                                <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                            </button>
                        </div>

                        <div className="msg-search-wrap" style={{ position: "relative" }}>
                            <i className="bi bi-search msg-search-icon" />
                            <input
                                type="text"
                                className="msg-search"
                                placeholder="Search people…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="msg-tabs">
                            <button
                                className={`msg-tab ${tab === "recent" ? "active" : ""}`}
                                onClick={() => setTab("recent")}
                            >
                                Recent {conversations.length > 0 && `(${conversations.length})`}
                            </button>
                            <button
                                className={`msg-tab ${tab === "all" ? "active" : ""}`}
                                onClick={() => setTab("all")}
                            >
                                All People {allUsers.length > 0 && `(${allUsers.length})`}
                            </button>
                        </div>

                        <div className="msg-list">
                            {loadingList ? (
                                <div className="msg-loading">
                                    <div className="msg-spinner" />
                                    Loading…
                                </div>
                            ) : tab === "recent" ? (
                                filteredConvos.length === 0 ? (
                                    <div className="msg-empty">
                                        <i className="bi bi-chat-square-text" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
                                        {search ? "No conversations match your search." : "No conversations yet. Switch to \"All People\" to start one."}
                                    </div>
                                ) : (
                                    filteredConvos.map(c => (
                                        <div
                                            key={c.user_id}
                                            className="msg-row"
                                            onClick={() => openThread(c)}
                                        >
                                            <UserAvatar
                                                name={c.user_name}
                                                imageUrl={c.profile_image_url}
                                                size={40}
                                            />
                                            <div className="msg-row-info">
                                                <div className="msg-row-name">{c.user_name}</div>
                                                <div className="msg-row-preview">{c.last_message || "No messages yet"}</div>
                                            </div>
                                            <div className="msg-row-meta">
                                                <span className="msg-row-time">{formatMsgTime(c.last_time)}</span>
                                                {c.unread_count > 0 && (
                                                    <span className="msg-unread-badge">{c.unread_count}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                filteredUsers.length === 0 ? (
                                    <div className="msg-empty">No people found.</div>
                                ) : (
                                    <>
                                        {filteredUsers.some(u => u.has_history) && (
                                            <>
                                                <div className="msg-section-label">Previous Conversations</div>
                                                {filteredUsers.filter(u => u.has_history).map(u => (
                                                    <div
                                                        key={u.id}
                                                        className="msg-row"
                                                        onClick={() => openThread({
                                                            user_id: u.id,
                                                            user_name: u.name,
                                                            user_role: u.role,
                                                            user_role_label: u.role_label || u.role,
                                                            user_initials: u.initials,
                                                            profile_image: u.profile_image,
                                                            profile_image_url: u.profile_image_url,
                                                        })}
                                                    >
                                                        <UserAvatar
                                                            name={u.name}
                                                            imageUrl={u.profile_image_url}
                                                            size={40}
                                                        />
                                                        <div className="msg-row-info">
                                                            <div className="msg-row-name">{u.name}</div>
                                                            <div className="msg-role-chip">{u.role_label || u.role}</div>
                                                        </div>
                                                        <i className="bi bi-clock-history" style={{ fontSize: 13, color: "var(--bs-secondary-color)" }} />
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {filteredUsers.some(u => !u.has_history) && (
                                            <>
                                                <div className="msg-section-label">All Users</div>
                                                {filteredUsers.filter(u => !u.has_history).map(u => (
                                                    <div
                                                        key={u.id}
                                                        className="msg-row"
                                                        onClick={() => openThread({
                                                            user_id: u.id,
                                                            user_name: u.name,
                                                            user_role: u.role,
                                                            user_role_label: u.role_label || u.role,
                                                            user_initials: u.initials,
                                                            profile_image: u.profile_image,
                                                            profile_image_url: u.profile_image_url,
                                                        })}
                                                    >
                                                        <UserAvatar
                                                            name={u.name}
                                                            imageUrl={u.profile_image_url}
                                                            size={40}
                                                        />
                                                        <div className="msg-row-info">
                                                            <div className="msg-row-name">{u.name}</div>
                                                            <div className="msg-role-chip">{u.role_label || u.role}</div>
                                                        </div>
                                                        <i className="bi bi-chevron-right" style={{ fontSize: 12, color: "var(--bs-secondary-color)" }} />
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )
                            )}
                        </div>
                    </>
                )}

                {view === "thread" && activeUser && (
                    <>
                        <div className="msg-thread-header">
                            <button
                                className="msg-back-btn"
                                onClick={() => {
                                    setView("list");
                                    setMessages([]);
                                }}
                                aria-label="Back"
                            >
                                <i className="bi bi-chevron-left" style={{ fontSize: 13 }} />
                            </button>

                            <UserAvatar
                                name={activeUser.user_name}
                                imageUrl={activeUser.profile_image_url}
                                size={36}
                            />

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="msg-thread-name">{activeUser.user_name}</div>
                                {activeUser.user_role_label && (
                                    <div className="msg-role-chip">{activeUser.user_role_label}</div>
                                )}
                            </div>

                            <button className="msg-close-btn" onClick={onClose} aria-label="Close">
                                <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                            </button>
                        </div>

                        <div className="msg-bubbles">
                            {loadingMsgs ? (
                                <div className="msg-loading">
                                    <div className="msg-spinner" />
                                    Loading messages…
                                </div>
                            ) : messages.length === 0 ? (
                                <div
                                    className="msg-empty"
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <i className="bi bi-chat-heart" style={{ fontSize: 36, display: "block", marginBottom: 10, color: "#0d6efd" }} />
                                    <div>No messages yet.</div>
                                    <div style={{ fontSize: 12, marginTop: 4 }}>Send the first one!</div>
                                </div>
                            ) : (
                                messages.map(m => {
                                    const isMine = m.sender_id === currentUserId;

                                    return (
                                        <div
                                            key={m.id}
                                            className={`msg-bubble-wrap ${isMine ? "mine" : "theirs"}`}
                                        >
                                            {!isMine && (
                                                <UserAvatar
                                                    name={m.sender_name}
                                                    imageUrl={m.sender_profile_image_url}
                                                    size={28}
                                                />
                                            )}

                                            <div>
                                                <div className="msg-bubble">{m.message}</div>

                                                {m.attachments?.length > 0 && (
                                                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                        {m.attachments.map(a => (
                                                            <a
                                                                key={a.id}
                                                                href={a.file_path}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    fontSize: 12,
                                                                    padding: "3px 8px",
                                                                    background: "var(--bs-tertiary-bg)",
                                                                    border: "1px solid var(--bs-border-color)",
                                                                    borderRadius: 6,
                                                                    color: "#0d6efd",
                                                                    textDecoration: "none",
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <i className="bi bi-paperclip" />
                                                                {a.file_name}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}

                                                <div
                                                    className="msg-bubble-time"
                                                    style={{ textAlign: isMine ? "right" : "left" }}
                                                >
                                                    {formatBubbleTime(m.time_sent)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        <div className="msg-input-row">
                            <textarea
                                ref={inputRef}
                                className="msg-textarea"
                                placeholder={`Message ${activeUser.user_name}…`}
                                value={msgText}
                                onChange={e => setMsgText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                disabled={sending}
                            />
                            <button
                                className="msg-send-btn"
                                onClick={sendMessage}
                                disabled={!msgText.trim() || sending}
                                aria-label="Send message"
                            >
                                {sending
                                    ? <div className="msg-spinner" style={{ borderTopColor: "#fff", width: 16, height: 16 }} />
                                    : <i className="bi bi-send-fill" style={{ fontSize: 15 }} />
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>,
        document.body
    );
}

// ====================================================================
// CHAT BUTTON — opens the messaging modal
// ====================================================================
function ChatButton() {
    const [open, setOpen]             = React.useState(false);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [currentUserId, setCurrentUserId] = React.useState(null);

    // Fetch unread count on mount and periodically
    React.useEffect(() => {
        function fetchUnread() {
            fetch(MSG_CONVERSATIONS_API, { credentials: "same-origin" })
                .then(r => r.json())
                .then(data => {
                    setUnreadCount(data.total_unread || 0);
                    setCurrentUserId(data.current_user_id || null);
                })
                .catch(() => {});
        }
        fetchUnread();
        const id = window.setInterval(fetchUnread, 30_000);
        return () => window.clearInterval(id);
    }, []);

    return (
        <>
            <button
                type="button"
                className="topbar-icon-btn"
                aria-label="Messages"
                title="Messages"
                onClick={() => setOpen(true)}
                style={{ position: "relative" }}
            >
                <i className="bi bi-chat-dots"></i>
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: "absolute", top: 2, right: 2,
                            background: "#ef4444", color: "#fff",
                            borderRadius: "99px", fontSize: "10px", fontWeight: 700,
                            padding: "1px 5px", lineHeight: 1.4,
                            border: "2px solid var(--bs-body-bg)",
                        }}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            <MessagingModal
                open={open}
                onClose={() => setOpen(false)}
                currentUserId={currentUserId}
            />
        </>
    );
}


function NotificationBell() {
    const [open, setOpen] = React.useState(false);
    const panelRef = React.useRef(null);
    const btnRef = React.useRef(null);
    const panelId = React.useId();

    const unreadCount = React.useMemo(
        () => STATIC_NOTIFICATIONS.filter((item) => item.unread).length,
        []
    );

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
                        {STATIC_NOTIFICATIONS.map((item) => (
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
                        ))}
                    </div>

                    <div className="notif-panel-footer">
                        <button
                            type="button"
                            className="notif-view-all btn btn-link p-0 text-decoration-none"
                            onClick={() => setOpen(false)}
                        >
                            View all notifications
                        </button>
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
    const [dark, setDark] = React.useState(() => getCurrentTheme() === "dark");
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