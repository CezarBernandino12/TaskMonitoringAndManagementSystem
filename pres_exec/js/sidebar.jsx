const STORAGE_KEY = "sidebar-collapsed";
const MOBILE_BREAKPOINT = 768;
const SIDEBAR_USER_API = "php/sidebar.php";

const FALLBACK_USER = {
    name: "President",
    nickname: "",
    role: "president",
    role_label: "President",
    department_name: "",
    initials: "P",
    profile_image_url: ""
};

function getCurrentPage() {
    const fileName = window.location.pathname.split("/").pop() || "";
    return fileName.split("?")[0].split("#")[0].toLowerCase();
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

async function parseJsonResponse(response) {
    const rawText = await response.text();

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Invalid JSON response:", rawText);
        throw new Error("Server returned invalid JSON.");
    }
}

function normalizeUserPayload(data = {}) {
    const name = (data.name || "President").trim();

    return {
        name,
        nickname: "",
        role: (data.role || "").trim(),
        role_label: (data.role_label || "").trim(),
        department_name: (data.department_name || "").trim(),
        initials: (data.initials || getInitials(name)).trim(),
        profile_image_url: (data.profile_image_url || "").trim()
    };
}

function getSidebarRoleText(user) {
    const role = (user?.role_label || user?.role || "").trim();
    const dept = (user?.department_name || "").trim();
    const rawRole = (user?.role || "").trim().toLowerCase();

    if (rawRole === "president") {
        return "Executive Access";
    }

    if (dept && role) {
        return `${dept} - ${role}`.toUpperCase();
    }

    if (role) {
        return role.toUpperCase();
    }

    if (dept) {
        return dept.toUpperCase();
    }

    return "EXECUTIVE ACCESS";
}

function SidebarLink({
    href,
    icon,
    label,
    isActive,
    extraClass = "",
    onClick,
    onNavigate
}) {
    const handleClick = (e) => {
        if (onClick) onClick(e);
        if (!e.defaultPrevented && onNavigate) onNavigate();
    };

    return (
        <a
            href={href}
            className={`sidebar-link ${isActive ? "active" : ""} ${extraClass}`.trim()}
            onClick={handleClick}
        >
            <span className="sidebar-icon">
                <i className={`bi ${icon}`}></i>
            </span>
            <span className="sidebar-text">{label}</span>
        </a>
    );
}

function PresidentSidebar() {
    const [collapsed, setCollapsed] = React.useState(() => {
        return localStorage.getItem(STORAGE_KEY) === "true";
    });

    const [isMobile, setIsMobile] = React.useState(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [user, setUser] = React.useState(FALLBACK_USER);
    const [imgFailed, setImgFailed] = React.useState(false);

    const currentPage = getCurrentPage();
    const isActivePage = (fileName) => currentPage === fileName.toLowerCase();

    React.useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < MOBILE_BREAKPOINT;
            setIsMobile(mobile);

            if (!mobile) {
                setMobileOpen(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    React.useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(collapsed));
    }, [collapsed]);

    React.useEffect(() => {
        document.documentElement.classList.remove("sidebar-collapsed-init");
    }, []);

    React.useEffect(() => {
        document.body.classList.toggle("sidebar-mobile-open", isMobile && mobileOpen);

        return () => {
            document.body.classList.remove("sidebar-mobile-open");
        };
    }, [isMobile, mobileOpen]);

    React.useEffect(() => {
        setImgFailed(false);
    }, [user.profile_image_url]);

    React.useEffect(() => {
        let active = true;

        async function loadUser() {
            try {
                const response = await fetch(SIDEBAR_USER_API, {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" }
                });

                const data = await parseJsonResponse(response);

                if (!response.ok || data.error) {
                    throw new Error(data.error || "Failed to load sidebar user.");
                }

                if (!active) return;
                setUser(normalizeUserPayload(data));
            } catch (error) {
                console.error("Unable to load sidebar user:", error);
                if (!active) return;
                setUser(FALLBACK_USER);
            }
        }

        function handleProfileUpdated(event) {
            const detail = event?.detail;

            if (!detail) {
                loadUser();
                return;
            }

            setUser(normalizeUserPayload(detail));
        }

        loadUser();
        window.addEventListener("profile-updated", handleProfileUpdated);

        return () => {
            active = false;
            window.removeEventListener("profile-updated", handleProfileUpdated);
        };
    }, []);

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileOpen((prev) => !prev);
            return;
        }

        setCollapsed((prev) => !prev);
    };

    const openMobileSidebar = () => {
        setMobileOpen(true);
    };

    const closeMobileSidebar = () => {
        setMobileOpen(false);
    };

    const handleNavigate = () => {
        if (isMobile) {
            closeMobileSidebar();
        }
    };

    const sidebarClassName = [
        "dashboard-sidebar",
        !isMobile && collapsed ? "collapsed" : "",
        isMobile ? "mobile" : "",
        isMobile && mobileOpen ? "mobile-open" : ""
    ]
        .filter(Boolean)
        .join(" ");

    const displayName = user.name || "President";
    const roleText = getSidebarRoleText(user);
    const initials = user.initials || getInitials(user.name || "President");
    const hasImage = Boolean(user.profile_image_url) && !imgFailed;

    return (
        <>
            {isMobile && (
                <button
                    type="button"
                    className="mobile-sidebar-trigger"
                    onClick={openMobileSidebar}
                    aria-label="Open navigation menu"
                >
                    <i className="bi bi-list"></i>
                </button>
            )}

            {isMobile && mobileOpen && (
                <button
                    type="button"
                    className="sidebar-mobile-backdrop"
                    onClick={closeMobileSidebar}
                    aria-label="Close navigation menu"
                />
            )}

            <nav id="dashboardSidebar" className={sidebarClassName}>
                {!isMobile && (
                    <button
                        className="sidebar-toggle"
                        id="sidebarToggle"
                        type="button"
                        onClick={toggleSidebar}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>
                )}

                {isMobile && (
                    <div className="sidebar-mobile-topbar">
                        <div className="sidebar-mobile-title">
                            President Panel
                        </div>
                        <button
                            type="button"
                            className="sidebar-mobile-close"
                            onClick={closeMobileSidebar}
                            aria-label="Close sidebar"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                )}

                <div className="sidebar-inner">
                    <div className="sidebar-profile">
                        <div className="sidebar-avatar">
                            {hasImage ? (
                                <img
                                    src={user.profile_image_url}
                                    alt={displayName}
                                    onError={() => setImgFailed(true)}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                        display: "block"
                                    }}
                                />
                            ) : (
                                <div className="sidebar-avatar sidebar-avatar-fallback">
                                    {initials}
                                </div>
                            )}
                        </div>

                        <div className="sidebar-profile-info">
                            <div className="sidebar-role">{roleText}</div>
                            <div className="sidebar-name">{displayName}</div>
                        </div>
                    </div>

                    <div className="sidebar-menu-scroll">
                        <div className="sidebar-divider"></div>
                        <div className="sidebar-section-label">MAIN</div>

                        <SidebarLink
                            href="dashboard.html"
                            icon="bi-house-door"
                            label="Dashboard"
                            isActive={isActivePage("dashboard.html")}
                            onNavigate={handleNavigate}
                        />

                        <SidebarLink
                            href="calendar.html"
                            icon="bi-calendar"
                            label="Calendar"
                            isActive={isActivePage("calendar.html")}
                            onNavigate={handleNavigate}
                        />

                        <div className="sidebar-divider sidebar-section-split"></div>

                        <div className="sidebar-management-wrap sidebar-management-static">
                            <div className="sidebar-section-label sidebar-section-label-inline">
                                REPORTS
                            </div>

                            <div className="sidebar-submenu sidebar-submenu-static open">
                                <SidebarLink
                                    href="daily-reports.html"
                                    icon="bi-calendar-day"
                                    label="Daily"
                                    isActive={isActivePage("daily-reports.html")}
                                    extraClass="sidebar-sublink sidebar-sublink-sm"
                                    onNavigate={handleNavigate}
                                />

                                <SidebarLink
                                    href="weekly-reports.html"
                                    icon="bi-calendar-week"
                                    label="Weekly"
                                    isActive={isActivePage("weekly-reports.html")}
                                    extraClass="sidebar-sublink sidebar-sublink-sm"
                                    onNavigate={handleNavigate}
                                />

                                <SidebarLink
                                    href="monthly-reports.html"
                                    icon="bi-calendar-month"
                                    label="Monthly"
                                    isActive={isActivePage("monthly-reports.html")}
                                    extraClass="sidebar-sublink sidebar-sublink-sm"
                                    onNavigate={handleNavigate}
                                />

                                <SidebarLink
                                    href="quarterly-reports.html"
                                    icon="bi-calendar2-range"
                                    label="Quarterly"
                                    isActive={isActivePage("quarterly-reports.html")}
                                    extraClass="sidebar-sublink sidebar-sublink-sm"
                                    onNavigate={handleNavigate}
                                />

                                <SidebarLink
                                    href="annual-reports.html"
                                    icon="bi-calendar2-check"
                                    label="Annually"
                                    isActive={isActivePage("annual-reports.html")}
                                    extraClass="sidebar-sublink sidebar-sublink-sm"
                                    onNavigate={handleNavigate}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}

const sidebarRoot = document.getElementById("sidebar-root");

if (sidebarRoot) {
    ReactDOM.createRoot(sidebarRoot).render(<PresidentSidebar />);
}