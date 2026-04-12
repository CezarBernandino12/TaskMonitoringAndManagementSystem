import React from "https://esm.sh/react@18.3.1";
import ReactDOM from "https://esm.sh/react-dom@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

const HEARTBEAT_API = "php/heartbeat.php";
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

const MSG_CONVERSATIONS_API = "php/get_conversations.php";
const MSG_SEND_API = "php/send_task_message.php";
const MSG_PINNED_KEY = "dashboard-message-pins";
const ROLE_FILTERS = ["All", "Supervisor", "Staff", "President", "Admin"];

function getInitialsColor(name = "") {
    const COLORS = [
        "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
        "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

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
                fontSize: size * 0.36,
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: "0.02em",
                overflow: "hidden"
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
                        display: "block"
                    }}
                />
            ) : (
                initials
            )}
        </div>
    );
}

function sameUserId(a, b) {
    return String(a ?? "") === String(b ?? "");
}

function normalizeRoleLabel(role = "") {
    const value = String(role || "").trim();
    if (!value) return "Staff";

    return value
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function getInboxRoleLabel(item = {}) {
    return normalizeRoleLabel(
        item.user_role_label || item.role_label || item.user_role || item.role || "Staff"
    );
}

function formatPanelTime(isoStr) {
    if (!isoStr) return "";

    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    });
}

function formatListDate(isoStr) {
    if (!isoStr) return "";

    return new Date(isoStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    });
}

function formatBubbleTime(isoStr) {
    if (!isoStr) return "";

    return new Date(isoStr).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function isSameCalendarDay(a, b) {
    if (!a || !b) return false;

    const first = new Date(a);
    const second = new Date(b);

    return (
        first.getFullYear() === second.getFullYear() &&
        first.getMonth() === second.getMonth() &&
        first.getDate() === second.getDate()
    );
}

function getMessageDayLabel(isoStr) {
    if (!isoStr) return "";

    const date = new Date(isoStr);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (isSameCalendarDay(date, now)) return "Today";
    if (isSameCalendarDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric"
    });
}

function getPresenceText(user) {
    if (!user) return "";

    if (user.is_active_now) return "Active now";
    if (user.last_active_label) return `Active ${user.last_active_label}`;

    return "Offline";
}

function normalizeThreadUser(user = {}) {
    return {
        user_id: user.user_id ?? user.id ?? null,
        user_name: user.user_name ?? user.name ?? "User",
        user_role: user.user_role ?? user.role ?? "",
        user_role_label: user.user_role_label ?? user.role_label ?? user.role ?? "",
        user_initials:
            user.user_initials ??
            user.initials ??
            getInitials(user.user_name ?? user.name ?? "User"),
        profile_image: user.profile_image ?? null,
        profile_image_url: user.profile_image_url ?? "",
        last_message: user.last_message ?? "",
        last_time: user.last_time ?? null,
        unread_count: Number(user.unread_count || 0),
        has_conversation: Boolean(user.has_conversation),
        is_active_now: Boolean(user.is_active_now),
        last_active_at: user.last_active_at ?? null,
        last_active_label: user.last_active_label ?? ""
    };
}

function mergeThreadUserPreservingAvatar(prevUser, nextUser) {
    const prev = normalizeThreadUser(prevUser || {});
    const next = normalizeThreadUser(nextUser || {});

    return {
        ...prev,
        ...next,
        profile_image: next.profile_image || prev.profile_image || null,
        profile_image_url: next.profile_image_url || prev.profile_image_url || ""
    };
}

function readPinnedConversationIds() {
    try {
        const raw = localStorage.getItem(MSG_PINNED_KEY);
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
    } catch (error) {
        console.error("Unable to read pinned message ids:", error);
        return [];
    }
}

function mergeInboxEntries(conversations = [], allUsers = []) {
    const map = new Map();

    allUsers.forEach((user) => {
        const normalized = normalizeThreadUser({
            ...user,
            user_id: user.id,
            user_name: user.name,
            user_role: user.role,
            user_role_label: user.role_label,
            profile_image: user.profile_image,
            profile_image_url: user.profile_image_url,
            has_conversation: false,
            unread_count: 0,
            last_message: "",
            last_time: null
        });

        map.set(String(normalized.user_id), normalized);
    });

    conversations.forEach((conversation) => {
        const normalized = normalizeThreadUser({
            ...conversation,
            has_conversation: true
        });

        const existing = map.get(String(normalized.user_id));
        map.set(String(normalized.user_id), {
            ...existing,
            ...normalized,
            has_conversation: true,
            unread_count: Number(conversation.unread_count || 0),
            profile_image: normalized.profile_image || existing?.profile_image || null,
            profile_image_url: normalized.profile_image_url || existing?.profile_image_url || ""
        });
    });

    return Array.from(map.values()).sort((a, b) => {
        const aPinnedScore = a.has_conversation ? 0 : 1;
        const bPinnedScore = b.has_conversation ? 0 : 1;
        if (aPinnedScore !== bPinnedScore) return aPinnedScore - bPinnedScore;

        const aTime = a.last_time ? new Date(a.last_time).getTime() : 0;
        const bTime = b.last_time ? new Date(b.last_time).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;

        return (a.user_name || "").localeCompare(b.user_name || "");
    });
}

function getConversationPreview(item) {
    const preview = String(item?.last_message || "").trim();
    if (preview) return preview;
    return item?.has_conversation ? "No messages yet" : "Start a conversation";
}

function matchesRole(item, selectedRole) {
    if (selectedRole === "All") return true;
    return getInboxRoleLabel(item).toLowerCase() === selectedRole.toLowerCase();
}

function matchesSearch(item, searchValue) {
    const term = String(searchValue || "").trim().toLowerCase();
    if (!term) return true;

    const haystack = [
        item.user_name,
        getInboxRoleLabel(item),
        item.last_message
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return haystack.includes(term);
}

function buildConversationSignature(items = []) {
    return items
        .map((item) =>
            [
                item.user_id ?? "",
                item.last_time ?? "",
                item.unread_count ?? 0,
                item.last_message ?? "",
                item.profile_image_url ?? "",
                item.is_active_now ? "1" : "0",
                item.last_active_label ?? ""
            ].join(":")
        )
        .join("|");
}

function buildUserSignature(items = []) {
    return items
        .map((item) =>
            [
                item.id ?? item.user_id ?? "",
                item.name ?? item.user_name ?? "",
                item.role ?? item.user_role ?? "",
                item.profile_image_url ?? "",
                item.is_active_now ? "1" : "0",
                item.last_active_label ?? ""
            ].join(":")
        )
        .join("|");
}

function buildMessageSignature(items = []) {
    return items
        .map((message) => {
            const attachmentCount = Array.isArray(message.attachments)
                ? message.attachments.length
                : 0;

            return [
                message.id ?? "",
                message.time_sent ?? "",
                message.is_read ? "1" : "0",
                attachmentCount,
                message.message ?? "",
                message.sender_profile_image_url ?? ""
            ].join(":");
        })
        .join("|");
}

function hasThreadMetaChanged(prevUser, nextUser) {
    if (!prevUser) return true;
    if (!nextUser) return false;

    return (
        String(prevUser.user_id ?? prevUser.id ?? "") !==
            String(nextUser.user_id ?? nextUser.id ?? "") ||
        (prevUser.user_name ?? prevUser.name ?? "") !==
            (nextUser.user_name ?? nextUser.name ?? "") ||
        (prevUser.user_role_label ?? prevUser.role_label ?? prevUser.user_role ?? prevUser.role ?? "") !==
            (nextUser.user_role_label ?? nextUser.role_label ?? nextUser.user_role ?? nextUser.role ?? "") ||
        (prevUser.profile_image_url ?? "") !== (nextUser.profile_image_url ?? "") ||
        Boolean(prevUser.is_active_now) !== Boolean(nextUser.is_active_now) ||
        (prevUser.last_active_label ?? "") !== (nextUser.last_active_label ?? "")
    );
}

function MessageRow({
    item,
    compact = false,
    selected = false,
    pinned = false,
    showPin = true,
    onOpen,
    onTogglePin
}) {
    const preview = getConversationPreview(item);
    const unreadCount = Number(item.unread_count || 0);
    const dateLabel = compact ? formatPanelTime(item.last_time) : formatListDate(item.last_time);

    return (
        <div className={`msg-row ${compact ? "is-compact" : ""} ${selected ? "is-selected" : ""}`}>
            {showPin && (
                <button
                    type="button"
                    className={`msg-row-pin ${pinned ? "is-pinned" : ""}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onTogglePin(item.user_id);
                    }}
                    aria-label={pinned ? "Unpin conversation" : "Pin conversation"}
                    title={pinned ? "Unpin" : "Pin"}
                >
                    <i className={`bi ${pinned ? "bi-pin-angle-fill" : "bi-pin-angle"}`}></i>
                </button>
            )}

            <button type="button" className="msg-row-main" onClick={() => onOpen(item)}>
                <UserAvatar
                    name={item.user_name}
                    imageUrl={item.profile_image_url}
                    size={compact ? 46 : 44}
                />

                <div className="msg-row-copy">
                    <div className="msg-row-line1">
                        <span className="msg-row-name">{item.user_name}</span>
                        <span className="msg-row-date">{dateLabel}</span>
                    </div>

                    <div className="msg-row-role">
                        <span className={`msg-presence-text ${item.is_active_now ? "is-active" : ""}`}>
                            {getPresenceText(item)}
                        </span>
                        <span className="msg-presence-separator"> · </span>
                        <span>{getInboxRoleLabel(item)}</span>
                    </div>

                    <div className="msg-row-preview">{preview}</div>
                </div>

                <div className="msg-row-side">
                    {unreadCount > 0 ? (
                        <span className="msg-row-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                    ) : (
                        <span className={`msg-row-dot ${item.is_active_now ? "is-active" : ""}`}></span>
                    )}
                </div>
            </button>
        </div>
    );
}

function MessagingModal({
    openMode,
    onClose,
    onExpand,
    onCollapse,
    currentUserId,
    triggerRef,
    onUnreadCountChange
}) {
    const [search, setSearch] = React.useState("");
    const [selectedRole, setSelectedRole] = React.useState("All");
    const [hidePinned, setHidePinned] = React.useState(false);
    const [conversations, setConversations] = React.useState([]);
    const [allUsers, setAllUsers] = React.useState([]);
    const [totalUnread, setTotalUnread] = React.useState(0);
    const [loadingList, setLoadingList] = React.useState(false);
    const [activeUser, setActiveUser] = React.useState(null);
    const [messages, setMessages] = React.useState([]);
    const [loadingMsgs, setLoadingMsgs] = React.useState(false);
    const [msgText, setMsgText] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [showJumpToLatest, setShowJumpToLatest] = React.useState(false);
    const [pinnedConversationIds, setPinnedConversationIds] = React.useState(() => readPinnedConversationIds());
    const [panelSelectedUserId, setPanelSelectedUserId] = React.useState(null);

    const panelRef = React.useRef(null);
    const messagesEndRef = React.useRef(null);
    const threadScrollRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const panelRoleScrollerRef = React.useRef(null);
    const fullRoleScrollerRef = React.useRef(null);
    const lastMessageSignatureRef = React.useRef("");
    const lastConversationSignatureRef = React.useRef("");
    const lastUserSignatureRef = React.useRef("");
    const lastFocusedThreadKeyRef = React.useRef("");
    const forceScrollToLatestRef = React.useRef(false);
    const hasLoadedInboxRef = React.useRef(false);

    const roleDragRef = React.useRef({
        isDown: false,
        startX: 0,
        scrollLeft: 0,
        hasMoved: false,
        suppressClick: false,
        activeEl: null
    });

    React.useEffect(() => {
        try {
            localStorage.setItem(MSG_PINNED_KEY, JSON.stringify(pinnedConversationIds));
        } catch (error) {
            console.error("Unable to persist pinned message ids:", error);
        }
    }, [pinnedConversationIds]);

    const mergedInbox = React.useMemo(
        () => mergeInboxEntries(conversations, allUsers),
        [conversations, allUsers]
    );

    const panelBaseInbox = React.useMemo(
        () =>
            mergedInbox.filter((item) => {
                const isPinned = pinnedConversationIds.includes(String(item.user_id));
                const isUnread = Number(item.unread_count || 0) > 0;
                const isSelectedInPanel =
                    panelSelectedUserId && sameUserId(panelSelectedUserId, item.user_id);

                return isPinned || isUnread || Boolean(isSelectedInPanel);
            }),
        [mergedInbox, pinnedConversationIds, panelSelectedUserId]
    );

    const roleTabs = React.useMemo(() => {
        const source = openMode === "panel" ? panelBaseInbox : mergedInbox;

        return ROLE_FILTERS.map((label) => ({
            label,
            count:
                label === "All"
                    ? source.length
                    : source.filter((item) => matchesRole(item, label)).length
        }));
    }, [mergedInbox, openMode, panelBaseInbox]);

    const fullVisibleInbox = React.useMemo(
        () =>
            mergedInbox.filter(
                (item) => matchesRole(item, selectedRole) && matchesSearch(item, search)
            ),
        [mergedInbox, search, selectedRole]
    );

    const panelVisibleInbox = React.useMemo(
        () =>
            panelBaseInbox.filter(
                (item) => matchesRole(item, selectedRole) && matchesSearch(item, search)
            ),
        [panelBaseInbox, search, selectedRole]
    );

    const panelPinnedEntries = React.useMemo(
        () => panelVisibleInbox.filter((item) => pinnedConversationIds.includes(String(item.user_id))),
        [panelVisibleInbox, pinnedConversationIds]
    );

    const panelRegularEntries = React.useMemo(
        () => panelVisibleInbox.filter((item) => !pinnedConversationIds.includes(String(item.user_id))),
        [panelVisibleInbox, pinnedConversationIds]
    );

    const fullPinnedEntries = React.useMemo(
        () => fullVisibleInbox.filter((item) => pinnedConversationIds.includes(String(item.user_id))),
        [fullVisibleInbox, pinnedConversationIds]
    );

    const fullRegularEntries = React.useMemo(
        () => fullVisibleInbox.filter((item) => !pinnedConversationIds.includes(String(item.user_id))),
        [fullVisibleInbox, pinnedConversationIds]
    );

    const isPanelThreadOpen =
        openMode === "panel" && Boolean(panelSelectedUserId) && Boolean(activeUser);

    React.useEffect(() => {
        if (!openMode) return undefined;

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, openMode]);

    React.useEffect(() => {
        if (openMode === "panel") return;
        setPanelSelectedUserId(null);
    }, [openMode]);

    React.useEffect(() => {
        return () => {
            window.removeEventListener("mousemove", handleRoleDragMove);
            window.removeEventListener("mouseup", stopRoleDrag);
        };
    }, []);

    React.useEffect(() => {
        if (openMode !== "panel") return undefined;

        function handlePointerDown(event) {
            const target = event.target;
            if (panelRef.current?.contains(target) || triggerRef?.current?.contains(target)) {
                return;
            }
            onClose();
        }

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [onClose, openMode, triggerRef]);

    React.useEffect(() => {
        if (!openMode) return undefined;

        let alive = true;

        async function loadInboxData() {
            const showLoading = !hasLoadedInboxRef.current;
            if (showLoading) {
                setLoadingList(true);
            }

            try {
                const response = await fetch(MSG_CONVERSATIONS_API, {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" }
                });

                const data = await parseJsonResponse(response);
                if (!response.ok) {
                    throw new Error(data?.error || "Failed to load messages.");
                }

                if (!alive) return;

                const nextConversations = Array.isArray(data.conversations) ? data.conversations : [];
                const nextUsers = Array.isArray(data.all_users) ? data.all_users : [];
                const unread = Number(data.total_unread || 0);

                const nextConversationSignature = buildConversationSignature(nextConversations);
                const nextUserSignature = buildUserSignature(nextUsers);

                if (nextConversationSignature !== lastConversationSignatureRef.current) {
                    lastConversationSignatureRef.current = nextConversationSignature;
                    setConversations(nextConversations);
                }

                if (nextUserSignature !== lastUserSignatureRef.current) {
                    lastUserSignatureRef.current = nextUserSignature;
                    setAllUsers(nextUsers);
                }

                setTotalUnread((prev) => (prev === unread ? prev : unread));
                onUnreadCountChange?.(unread);
                hasLoadedInboxRef.current = true;
            } catch (error) {
                console.error("[MSG] conversations fetch error:", error);
                if (!alive) return;

                if (!hasLoadedInboxRef.current) {
                    setConversations([]);
                    setAllUsers([]);
                    setTotalUnread(0);
                    onUnreadCountChange?.(0);
                }
            } finally {
                if (alive && showLoading) {
                    setLoadingList(false);
                }
            }
        }

        loadInboxData();
        const intervalId = window.setInterval(loadInboxData, 8000);

        return () => {
            alive = false;
            window.clearInterval(intervalId);
        };
    }, [openMode, onUnreadCountChange]);

    function isNearThreadBottom(el, threshold = 120) {
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    }

    function scrollThreadToLatest(behavior = "auto") {
        window.requestAnimationFrame(() => {
            const el = threadScrollRef.current;
            if (!el) return;

            el.scrollTo({
                top: el.scrollHeight,
                behavior
            });

            setShowJumpToLatest(false);
        });
    }

    React.useEffect(() => {
        const el = threadScrollRef.current;
        if (!el || !activeUser?.user_id) return undefined;

        function handleThreadScroll() {
            setShowJumpToLatest(!isNearThreadBottom(el, 120));
        }

        handleThreadScroll();
        el.addEventListener("scroll", handleThreadScroll, { passive: true });

        return () => {
            el.removeEventListener("scroll", handleThreadScroll);
        };
    }, [activeUser?.user_id, openMode, messages.length]);

    React.useEffect(() => {
        if (!openMode) return undefined;
        if (!activeUser?.user_id) return undefined;

        let alive = true;

        async function refreshThreadSilently() {
            try {
                const response = await fetch(
                    `php/get_user_messages.php?other_user_id=${encodeURIComponent(activeUser.user_id)}`,
                    {
                        credentials: "same-origin",
                        headers: { Accept: "application/json" }
                    }
                );

                const data = await parseJsonResponse(response);
                if (!response.ok || !alive) return;

                const nextMessages = Array.isArray(data.messages) ? data.messages : [];
                const nextSignature = buildMessageSignature(nextMessages);

                if (nextSignature !== lastMessageSignatureRef.current) {
                    const scroller = threadScrollRef.current;
                    const nearBottom = isNearThreadBottom(scroller, 120);

                    lastMessageSignatureRef.current = nextSignature;
                    setMessages(nextMessages);

                    if (nearBottom || forceScrollToLatestRef.current) {
                        window.requestAnimationFrame(() => {
                            messagesEndRef.current?.scrollIntoView({
                                behavior: "auto",
                                block: "end"
                            });
                            setShowJumpToLatest(false);
                        });
                    }
                }

                if (data.other_user) {
                    const nextUser = normalizeThreadUser({
                        user_id: data.other_user.id,
                        user_name: data.other_user.name,
                        user_role: data.other_user.role,
                        user_role_label: data.other_user.role_label,
                        user_initials: data.other_user.initials,
                        profile_image: data.other_user.profile_image,
                        profile_image_url: data.other_user.profile_image_url,
                        is_active_now: data.other_user.is_active_now,
                        last_active_at: data.other_user.last_active_at,
                        last_active_label: data.other_user.last_active_label,
                        has_conversation: true
                    });

                    setActiveUser((prev) => {
                        const merged = mergeThreadUserPreservingAvatar(prev, nextUser);
                        return hasThreadMetaChanged(prev, merged) ? merged : prev;
                    });
                }
            } catch (error) {
                console.error("[MSG] live thread refresh error:", error);
            }
        }

        const intervalId = window.setInterval(refreshThreadSilently, 3000);

        return () => {
            alive = false;
            window.clearInterval(intervalId);
        };
    }, [openMode, activeUser?.user_id]);

    React.useEffect(() => {
        if (openMode !== "full") return;
        if (activeUser) return;
        if (fullVisibleInbox.length === 0) return;

        const firstItem = fullVisibleInbox[0];
        setActiveUser(normalizeThreadUser(firstItem));
        forceScrollToLatestRef.current = true;
        loadThreadMessages(firstItem.user_id ?? firstItem.id);
    }, [activeUser, openMode, fullVisibleInbox]);

    React.useEffect(() => {
        const el = threadScrollRef.current;
        if (!el || !messagesEndRef.current) return;

        if (forceScrollToLatestRef.current || isNearThreadBottom(el, 120)) {
            window.requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({
                    behavior: "auto",
                    block: "end"
                });
                setShowJumpToLatest(false);
            });
        }
    }, [messages.length]);

    React.useEffect(() => {
        if (!activeUser?.user_id || !openMode) return undefined;

        const threadKey = `${openMode}:${activeUser.user_id}`;
        if (lastFocusedThreadKeyRef.current === threadKey) {
            return undefined;
        }

        lastFocusedThreadKeyRef.current = threadKey;

        const timeoutId = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 120);

        return () => window.clearTimeout(timeoutId);
    }, [activeUser?.user_id, openMode]);

    React.useEffect(() => {
        if (!inputRef.current) return;

        const isPanel = openMode === "panel";
        const baseHeight = isPanel ? 38 : 50;
        const maxHeight = isPanel ? 88 : 128;

        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${Math.max(
            baseHeight,
            Math.min(inputRef.current.scrollHeight, maxHeight)
        )}px`;
    }, [msgText, openMode]);

    React.useEffect(() => {
        if (openMode) return;

        setActiveUser(null);
        setMessages([]);
        setMsgText("");
        setPanelSelectedUserId(null);
        setShowJumpToLatest(false);

        lastMessageSignatureRef.current = "";
        lastConversationSignatureRef.current = "";
        lastUserSignatureRef.current = "";
        lastFocusedThreadKeyRef.current = "";
        forceScrollToLatestRef.current = false;
        hasLoadedInboxRef.current = false;
    }, [openMode]);

    async function loadThreadMessages(otherUserId) {
        if (!otherUserId) return;

        setLoadingMsgs(true);

        try {
            const response = await fetch(
                `php/get_user_messages.php?other_user_id=${encodeURIComponent(otherUserId)}`,
                {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" }
                }
            );

            const data = await parseJsonResponse(response);
            if (!response.ok) {
                throw new Error(data?.error || "Failed to load thread messages.");
            }

            const nextMessages = Array.isArray(data.messages) ? data.messages : [];
            lastMessageSignatureRef.current = buildMessageSignature(nextMessages);
            setMessages(nextMessages);

            const shouldForceScroll = forceScrollToLatestRef.current;
            forceScrollToLatestRef.current = false;

            if (shouldForceScroll) {
                window.requestAnimationFrame(() => {
                    scrollThreadToLatest("auto");
                });
            }

            if (data.other_user) {
                const nextUser = normalizeThreadUser({
                    user_id: data.other_user.id,
                    user_name: data.other_user.name,
                    user_role: data.other_user.role,
                    user_role_label: data.other_user.role_label,
                    user_initials: data.other_user.initials,
                    profile_image: data.other_user.profile_image,
                    profile_image_url: data.other_user.profile_image_url,
                    is_active_now: data.other_user.is_active_now,
                    last_active_at: data.other_user.last_active_at,
                    last_active_label: data.other_user.last_active_label,
                    has_conversation: true
                });

                setActiveUser((prev) => mergeThreadUserPreservingAvatar(prev, nextUser));
            }

            setConversations((prev) =>
                prev.map((conversation) =>
                    sameUserId(conversation.user_id, otherUserId)
                        ? { ...conversation, unread_count: 0 }
                        : conversation
                )
            );

            const unreadInThread = nextMessages.filter(
                (message) => sameUserId(message.sender_id, otherUserId) && !message.is_read
            ).length;

            setTotalUnread((prev) => {
                const next = Math.max(0, prev - unreadInThread);
                onUnreadCountChange?.(next);
                return next;
            });
        } catch (error) {
            console.error("[MSG] thread fetch error:", error);
            setMessages([]);
        } finally {
            setLoadingMsgs(false);
        }
    }

    function togglePinned(userId) {
        const target = String(userId ?? "");
        if (!target) return;

        setPinnedConversationIds((prev) =>
            prev.includes(target)
                ? prev.filter((value) => value !== target)
                : [target, ...prev]
        );
    }

    function openThread(item, expandIfNeeded = false) {
        const normalized = normalizeThreadUser(item);

        if (
            activeUser?.user_id &&
            sameUserId(activeUser.user_id, normalized.user_id)
        ) {
            if (expandIfNeeded && openMode !== "full") {
                onExpand();
            }
            scrollThreadToLatest("smooth");
            return;
        }

        forceScrollToLatestRef.current = true;
        setActiveUser(normalized);
        setMsgText("");
        setShowJumpToLatest(false);

        if (expandIfNeeded && openMode !== "full") {
            onExpand();
        }

        loadThreadMessages(normalized.user_id);
    }

    function openPanelThread(item) {
        const normalized = normalizeThreadUser(item);

        if (
            activeUser?.user_id &&
            sameUserId(activeUser.user_id, normalized.user_id) &&
            panelSelectedUserId &&
            sameUserId(panelSelectedUserId, normalized.user_id)
        ) {
            scrollThreadToLatest("smooth");
            return;
        }

        forceScrollToLatestRef.current = true;
        setPanelSelectedUserId(String(normalized.user_id ?? ""));
        setActiveUser(normalized);
        setMsgText("");
        setShowJumpToLatest(false);
        loadThreadMessages(normalized.user_id);
    }

    function closePanelThread() {
        setPanelSelectedUserId(null);
        setActiveUser(null);
        setMessages([]);
        setMsgText("");
        setShowJumpToLatest(false);
        lastMessageSignatureRef.current = "";
        lastFocusedThreadKeyRef.current = "";
        forceScrollToLatestRef.current = false;
    }

    function handleViewAll() {
        if (!activeUser && fullVisibleInbox.length > 0) {
            const firstItem = fullVisibleInbox[0];
            setActiveUser(normalizeThreadUser(firstItem));
            forceScrollToLatestRef.current = true;
            loadThreadMessages(firstItem.user_id ?? firstItem.id);
        }

        onExpand();
    }

    function handleRoleWheel(event) {
        const el = event.currentTarget;
        if (!el) return;

        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            el.scrollLeft += event.deltaY;
            event.preventDefault();
        }
    }

    function handleRoleDragMove(event) {
        const drag = roleDragRef.current;
        const el = drag.activeEl;

        if (!drag.isDown || !el) return;

        const deltaX = event.clientX - drag.startX;

        if (Math.abs(deltaX) > 4) {
            drag.hasMoved = true;
        }

        el.scrollLeft = drag.scrollLeft - deltaX;

        if (drag.hasMoved) {
            event.preventDefault();
        }
    }

    function stopRoleDrag() {
        const drag = roleDragRef.current;
        const el = drag.activeEl;

        if (!drag.isDown) return;

        drag.isDown = false;

        if (el) {
            el.classList.remove("is-dragging");
        }

        window.removeEventListener("mousemove", handleRoleDragMove);
        window.removeEventListener("mouseup", stopRoleDrag);

        if (drag.hasMoved) {
            drag.suppressClick = true;

            window.setTimeout(() => {
                roleDragRef.current.suppressClick = false;
            }, 0);
        }

        drag.activeEl = null;
    }

    function startRoleDragForElement(el, event) {
        if (event.button !== 0 || !el) return;

        event.preventDefault();

        const drag = roleDragRef.current;
        drag.isDown = true;
        drag.startX = event.clientX;
        drag.scrollLeft = el.scrollLeft;
        drag.hasMoved = false;
        drag.activeEl = el;

        el.classList.add("is-dragging");

        window.addEventListener("mousemove", handleRoleDragMove);
        window.addEventListener("mouseup", stopRoleDrag);
    }

    function startRoleDrag(event) {
        startRoleDragForElement(panelRoleScrollerRef.current, event);
    }

    function startFullRoleDrag(event) {
        startRoleDragForElement(fullRoleScrollerRef.current, event);
    }

    function handleRoleScrollerClickCapture(event) {
        if (roleDragRef.current.suppressClick) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    async function sendMessage() {
        const trimmed = msgText.trim();
        if (!trimmed || !activeUser) return;

        setSending(true);

        try {
            const recipientId = activeUser.user_id || activeUser.id;

            const response = await fetch(MSG_SEND_API, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    recipient_id: recipientId,
                    message: trimmed
                })
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || !data.success || !data.message) {
                throw new Error(data?.error || "Failed to send message.");
            }

            setMessages((prev) => {
                const next = [...prev, data.message];
                lastMessageSignatureRef.current = buildMessageSignature(next);
                return next;
            });

            setMsgText("");

            const scroller = threadScrollRef.current;
            if (!showJumpToLatest || isNearThreadBottom(scroller, 180)) {
                window.requestAnimationFrame(() => {
                    scrollThreadToLatest("smooth");
                });
            }

            setConversations((prev) => {
                const exists = prev.some((conversation) =>
                    sameUserId(conversation.user_id, recipientId)
                );

                const nextItem = {
                    user_id: recipientId,
                    user_name: activeUser.user_name || activeUser.name,
                    user_role: activeUser.user_role || "",
                    user_role_label: activeUser.user_role_label || "",
                    user_initials:
                        activeUser.user_initials ||
                        getInitials(activeUser.user_name || activeUser.name || "User"),
                    profile_image: activeUser.profile_image || null,
                    profile_image_url: activeUser.profile_image_url || "",
                    last_message: trimmed,
                    last_time: data.message.time_sent || new Date().toISOString(),
                    unread_count: 0,
                    has_conversation: true,
                    is_active_now: Boolean(activeUser.is_active_now),
                    last_active_at: activeUser.last_active_at ?? null,
                    last_active_label: activeUser.last_active_label ?? ""
                };

                if (exists) {
                    return prev.map((conversation) =>
                        sameUserId(conversation.user_id, recipientId)
                            ? { ...conversation, ...nextItem }
                            : conversation
                    );
                }

                return [nextItem, ...prev];
            });
        } catch (error) {
            console.error("Send failed:", error);
        } finally {
            setSending(false);
        }
    }

    function handleComposerKeyDown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function renderAttachmentLinks(attachments = []) {
        if (!Array.isArray(attachments) || attachments.length === 0) return null;

        return (
            <div className="msg-attachment-list">
                {attachments.map((attachment) => (
                    <a
                        key={attachment.id}
                        href={attachment.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="msg-attachment-pill"
                    >
                        <i className="bi bi-paperclip"></i>
                        <span>{attachment.file_name}</span>
                    </a>
                ))}
            </div>
        );
    }

    function renderNoConversationState() {
        return (
            <div className="msg-empty-state thread msg-empty-state-premium">
                <div className="msg-empty-card msg-empty-card-clean">
                    <div className="msg-empty-wave">👋</div>
                    <div className="msg-empty-title">
                        No messages yet with {activeUser?.user_name || "this user"}
                    </div>
                    <div className="msg-empty-copy">
                        This conversation is ready whenever you are. Send your first message to get started.
                    </div>
                </div>
            </div>
        );
    }

    function renderThreadMessages() {
        if (loadingMsgs) {
            return <div className="msg-loading-state">Loading messages…</div>;
        }

        if (messages.length === 0) {
            return renderNoConversationState();
        }

        return messages.map((message, index) => {
            const isMine = sameUserId(message.sender_id, currentUserId);
            const showDivider =
                index === 0 ||
                !isSameCalendarDay(message.time_sent, messages[index - 1]?.time_sent);

            return (
                <React.Fragment key={message.id}>
                    {showDivider && (
                        <div className="msg-thread-day">
                            <span>{getMessageDayLabel(message.time_sent)}</span>
                        </div>
                    )}

                    <div className={`msg-thread-row ${isMine ? "mine" : "theirs"}`}>
                        {!isMine && (
                            <UserAvatar
                                name={message.sender_name}
                                imageUrl={message.sender_profile_image_url || activeUser?.profile_image_url || ""}
                                size={openMode === "panel" ? 30 : 34}
                            />
                        )}

                        <div className="msg-thread-stack">
                            <div className={`msg-thread-meta ${isMine ? "mine" : ""}`}>
                                <span>{isMine ? "You" : message.sender_name}</span>
                                <span>{formatBubbleTime(message.time_sent)}</span>
                            </div>

                            <div className={`msg-thread-bubble ${isMine ? "mine" : "theirs"}`}>
                                {message.message ? <div>{message.message}</div> : null}
                                {renderAttachmentLinks(message.attachments)}
                            </div>
                        </div>
                    </div>
                </React.Fragment>
            );
        });
    }

    function renderComposer(variant = "full") {
        const isPanel = variant === "panel";

        return (
            <div
                className={
                    isPanel
                        ? "msg-composer-bar msg-composer-bar-panel msg-composer-bar-premium"
                        : "msg-composer-bar msg-composer-bar-premium"
                }
            >
                <div className="msg-composer-main">
                    <div className="msg-composer-row">
                        {isPanel ? (
                            <div className="msg-composer-shell">
                                <textarea
                                    ref={inputRef}
                                    className="msg-composer-input msg-composer-input-panel msg-composer-input-premium"
                                    placeholder={`Message ${activeUser?.user_name || "user"}…`}
                                    value={msgText}
                                    onChange={(event) => setMsgText(event.target.value)}
                                    onKeyDown={handleComposerKeyDown}
                                    rows={1}
                                    disabled={sending}
                                ></textarea>
                            </div>
                        ) : (
                            <textarea
                                ref={inputRef}
                                className="msg-composer-input msg-composer-input-premium"
                                placeholder={`Message ${activeUser?.user_name || "user"}…`}
                                value={msgText}
                                onChange={(event) => setMsgText(event.target.value)}
                                onKeyDown={handleComposerKeyDown}
                                rows={1}
                                disabled={sending}
                            ></textarea>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    className={
                        isPanel
                            ? "msg-composer-send msg-composer-send-panel msg-composer-send-premium"
                            : "msg-composer-send msg-composer-send-premium"
                    }
                    onClick={sendMessage}
                    disabled={!msgText.trim() || sending}
                    aria-label="Send message"
                >
                    {sending ? (
                        <i className="bi bi-arrow-repeat spin"></i>
                    ) : (
                        <i className="bi bi-send-fill"></i>
                    )}
                </button>
            </div>
        );
    }

    const jumpToLatestButton = showJumpToLatest ? (
        <button
            type="button"
            className="msg-jump-latest"
            onClick={() => scrollThreadToLatest("smooth")}
            aria-label="Jump to latest message"
            title="Jump to latest message"
        >
            <i className="bi bi-arrow-down"></i>
        </button>
    ) : null;

    const dropdownMarkup = openMode === "panel" ? (
        <div className="msg-panel" ref={panelRef} role="dialog" aria-label="Messages inbox">
            <div className="msg-panel-sticky">
                <div className="msg-panel-head">
                    <div>
                        <div className="msg-panel-title">Inbox · All</div>
                        <div className="msg-panel-subtitle">
                            {totalUnread > 0
                                ? `${totalUnread} unread message${totalUnread > 1 ? "s" : ""}`
                                : "All conversations"}
                        </div>
                    </div>

                    <div className="msg-panel-actions">
                        <button
                            type="button"
                            className="msg-icon-ghost msg-panel-icon"
                            onClick={onClose}
                            aria-label="Close messages"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <label className="msg-searchbox msg-panel-search">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search chat"
                    />
                </label>

                <div
                    ref={panelRoleScrollerRef}
                    className="msg-role-scroller is-draggable msg-role-scroller-premium"
                    onMouseDown={startRoleDrag}
                    onClickCapture={handleRoleScrollerClickCapture}
                    onWheel={handleRoleWheel}
                >
                    {roleTabs.map((option) => (
                        <button
                            key={option.label}
                            type="button"
                            className={`msg-role-chip ${selectedRole === option.label ? "is-active" : ""}`}
                            onClick={() => setSelectedRole(option.label)}
                        >
                            <span>{option.label}</span>
                            <small>{option.count}</small>
                        </button>
                    ))}
                </div>
            </div>

            {isPanelThreadOpen ? (
                <section className="msg-thread-pane msg-thread-pane-panel">
                    <div className="msg-thread-head msg-thread-head-panel">
                        <button
                            type="button"
                            className="msg-thread-back"
                            onClick={closePanelThread}
                            aria-label="Back to conversations"
                        >
                            <i className="bi bi-arrow-left"></i>
                        </button>

                        <UserAvatar
                            name={activeUser.user_name}
                            imageUrl={activeUser.profile_image_url}
                            size={40}
                        />

                        <div className="msg-thread-user-copy">
                            <div className="msg-thread-user-name">{activeUser.user_name}</div>
                            <div className="msg-thread-user-meta">
                                <span className={`msg-presence-text ${activeUser?.is_active_now ? "is-active" : ""}`}>
                                    {getPresenceText(activeUser)}
                                </span>
                                <span className="msg-presence-separator"> · </span>
                                <span>{getInboxRoleLabel(activeUser)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="msg-thread-scroll msg-thread-scroll-panel" ref={threadScrollRef}>
                        {renderThreadMessages()}
                        <div ref={messagesEndRef}></div>
                    </div>

                    {jumpToLatestButton}
                    {renderComposer("panel")}
                </section>
            ) : (
                <div className="msg-panel-scroll">
                    {loadingList ? (
                        <div className="msg-loading-state compact">Loading messages…</div>
                    ) : panelVisibleInbox.length === 0 ? (
                        <div className="msg-empty-state compact dark">
                            <i className="bi bi-chat-left-dots"></i>
                            <span>No conversations available for this role yet.</span>
                        </div>
                    ) : (
                        <>
                            {panelPinnedEntries.length > 0 && (
                                <section className="msg-block">
                                    <div className="msg-block-head">
                                        <div className="msg-block-title">
                                            <i className="bi bi-pin-angle"></i>
                                            <span>Pinned</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="msg-block-action"
                                            onClick={() => setHidePinned((prev) => !prev)}
                                        >
                                            {hidePinned ? "Show" : "Hide"}
                                        </button>
                                    </div>

                                    {!hidePinned && (
                                        <div className="msg-block-list">
                                            {panelPinnedEntries.map((item) => (
                                                <MessageRow
                                                    key={`panel-pinned-${item.user_id}`}
                                                    item={item}
                                                    compact={true}
                                                    selected={panelSelectedUserId && sameUserId(panelSelectedUserId, item.user_id)}
                                                    showPin={true}
                                                    pinned={pinnedConversationIds.includes(String(item.user_id))}
                                                    onOpen={openPanelThread}
                                                    onTogglePin={togglePinned}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            <section className="msg-block">
                                <div className="msg-block-head muted">
                                    <div className="msg-block-title">
                                        <span>{selectedRole === "All" ? "Unread messages" : `${selectedRole} messages`}</span>
                                    </div>
                                </div>

                                <div className="msg-block-list">
                                    {panelRegularEntries.map((item) => (
                                        <MessageRow
                                            key={`panel-${item.user_id}`}
                                            item={item}
                                            compact={true}
                                            selected={panelSelectedUserId && sameUserId(panelSelectedUserId, item.user_id)}
                                            showPin={true}
                                            pinned={pinnedConversationIds.includes(String(item.user_id))}
                                            onOpen={openPanelThread}
                                            onTogglePin={togglePinned}
                                        />
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}

            {!isPanelThreadOpen && (
                <div className="msg-panel-footer">
                    <button type="button" className="msg-view-all-btn" onClick={handleViewAll}>
                        View all messages
                    </button>
                </div>
            )}
        </div>
    ) : null;

    const fullMarkup = openMode === "full" ? (
        <div className="msg-workspace-overlay">
            <div className="msg-workspace-backdrop" onClick={onClose}></div>

            <div className="msg-workspace" role="dialog" aria-modal="true" aria-label="Inbox message">
                <div className="msg-workspace-header">
                    <div>
                        <div className="msg-workspace-kicker">Message</div>
                        <div className="msg-workspace-title">Inbox Message</div>
                    </div>

                    <div className="msg-workspace-actions">
                        <button
                            type="button"
                            className="msg-icon-ghost msg-window-btn msg-window-btn-minimize"
                            onClick={onCollapse}
                            aria-label="Minimize messages"
                            title="Minimize"
                        >
                            <i className="bi bi-arrows-angle-contract"></i>
                        </button>

                        <button
                            type="button"
                            className="msg-icon-ghost msg-window-btn msg-window-btn-close"
                            onClick={onClose}
                            aria-label="Close messages"
                            title="Close"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <div className="msg-workspace-body">
                    <aside className="msg-sidebar">
                        <div className="msg-sidebar-sticky">
                            <div
                                ref={fullRoleScrollerRef}
                                className="msg-role-scroller sidebar msg-role-scroller-premium is-draggable"
                                onMouseDown={startFullRoleDrag}
                                onClickCapture={handleRoleScrollerClickCapture}
                                onWheel={handleRoleWheel}
                            >
                                {roleTabs.map((option) => (
                                    <button
                                        key={`sidebar-${option.label}`}
                                        type="button"
                                        className={`msg-role-chip ${selectedRole === option.label ? "is-active" : ""}`}
                                        onClick={() => setSelectedRole(option.label)}
                                    >
                                        <span>{option.label}</span>
                                        <small>{option.count}</small>
                                    </button>
                                ))}
                            </div>

                            <label className="msg-searchbox">
                                <i className="bi bi-search"></i>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search chat"
                                />
                            </label>
                        </div>

                        <div className="msg-sidebar-scroll">
                            {loadingList ? (
                                <div className="msg-loading-state compact">Loading conversations…</div>
                            ) : fullVisibleInbox.length === 0 ? (
                                <div className="msg-empty-state compact">
                                    <i className="bi bi-chat-left-text"></i>
                                    <span>No users found for this role.</span>
                                </div>
                            ) : (
                                <>
                                    {fullPinnedEntries.length > 0 && (
                                        <section className="msg-block sidebar-block">
                                            <div className="msg-block-head">
                                                <div className="msg-block-title">
                                                    <span>Pinned</span>
                                                </div>
                                            </div>

                                            <div className="msg-block-list compact-list">
                                                {fullPinnedEntries.map((item) => (
                                                    <MessageRow
                                                        key={`sidebar-pinned-${item.user_id}`}
                                                        item={item}
                                                        compact={true}
                                                        selected={activeUser && sameUserId(activeUser.user_id, item.user_id)}
                                                        showPin={true}
                                                        pinned={pinnedConversationIds.includes(String(item.user_id))}
                                                        onOpen={(entry) => openThread(entry, false)}
                                                        onTogglePin={togglePinned}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    <section className="msg-block sidebar-block">
                                        <div className="msg-block-head muted">
                                            <div className="msg-block-title">
                                                <span>All Messages</span>
                                            </div>
                                        </div>

                                        <div className="msg-block-list compact-list">
                                            {fullRegularEntries.map((item) => (
                                                <MessageRow
                                                    key={`sidebar-${item.user_id}`}
                                                    item={item}
                                                    compact={true}
                                                    selected={activeUser && sameUserId(activeUser.user_id, item.user_id)}
                                                    showPin={true}
                                                    pinned={pinnedConversationIds.includes(String(item.user_id))}
                                                    onOpen={(entry) => openThread(entry, false)}
                                                    onTogglePin={togglePinned}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </aside>

                    <section className="msg-thread-pane">
                        {activeUser ? (
                            <>
                                <div className="msg-thread-head">
                                    <div className="msg-thread-user">
                                        <UserAvatar
                                            name={activeUser.user_name}
                                            imageUrl={activeUser.profile_image_url}
                                            size={36}
                                        />
                                        <div>
                                            <div className="msg-thread-user-name">{activeUser.user_name}</div>
                                            <div className="msg-thread-user-meta">
                                                <span className={`msg-presence-text ${activeUser?.is_active_now ? "is-active" : ""}`}>
                                                    {getPresenceText(activeUser)}
                                                </span>
                                                <span className="msg-presence-separator"> · </span>
                                                <span>{getInboxRoleLabel(activeUser)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="msg-thread-scroll" ref={threadScrollRef}>
                                    {renderThreadMessages()}
                                    <div ref={messagesEndRef}></div>
                                </div>

                                {jumpToLatestButton}
                                {renderComposer("full")}
                            </>
                        ) : (
                            <div className="msg-empty-state thread">
                                <i className="bi bi-chat-left-dots"></i>
                                <span>Select a user to open the conversation.</span>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            {dropdownMarkup}
            {openMode === "full" ? ReactDOM.createPortal(fullMarkup, document.body) : null}
        </>
    );
}

function ChatButton() {
    const [openMode, setOpenMode] = React.useState(null);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [currentUserId, setCurrentUserId] = React.useState(null);
    const triggerRef = React.useRef(null);

    React.useEffect(() => {
        let active = true;

        async function fetchUnread() {
            try {
                const response = await fetch(MSG_CONVERSATIONS_API, {
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const data = await parseJsonResponse(response);
                if (!response.ok || !active) return;

                setUnreadCount(Number(data.total_unread || 0));
                setCurrentUserId(data.current_user_id || null);
            } catch (error) {
                console.error("[MSG] unread fetch error:", error);
            }
        }

        fetchUnread();
        const intervalId = window.setInterval(fetchUnread, 8000);

        return () => {
            active = false;
            window.clearInterval(intervalId);
        };
    }, []);

    return (
        <div className="message-hub">
            <button
                ref={triggerRef}
                type="button"
                className={`topbar-icon-btn ${openMode ? "active" : ""}`}
                aria-label="Messages"
                title="Messages"
                onClick={() => setOpenMode((current) => (current === "panel" ? null : "panel"))}
                style={{ position: "relative" }}
            >
                <i className="bi bi-chat-dots"></i>
                {unreadCount > 0 && (
                    <span className="notif-badge">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            <MessagingModal
                openMode={openMode}
                onClose={() => setOpenMode(null)}
                onExpand={() => setOpenMode("full")}
                onCollapse={() => setOpenMode("panel")}
                currentUserId={currentUserId}
                triggerRef={triggerRef}
                onUnreadCountChange={setUnreadCount}
            />
        </div>
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

function usePresenceHeartbeat() {
    React.useEffect(() => {
        let stopped = false;

        async function beat() {
            if (stopped) return;

            try {
                await fetch(HEARTBEAT_API, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                });
            } catch (error) {
                console.error("[presence] heartbeat failed:", error);
            }
        }

        beat();

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                beat();
            }
        }, 60000);

        function handleFocus() {
            beat();
        }

        function handleVisibility() {
            if (document.visibilityState === "visible") {
                beat();
            }
        }

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            stopped = true;
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);
}

function TopBar() {
    const [dark, setDark] = React.useState(() => getCurrentTheme() === "dark");
    const [now, setNow] = React.useState(() => new Date());
    const [user, setUser] = React.useState(FALLBACK_USER);
    const [userLoaded, setUserLoaded] = React.useState(false);
    const didInitThemeRef = React.useRef(false);

    usePresenceHeartbeat(); 
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

function mountTopbar() {
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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountTopbar);
} else {
    mountTopbar();
}