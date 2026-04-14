const STORAGE_KEY = "sidebar-collapsed";
const MOBILE_BREAKPOINT = 768;
const SIDEBAR_USER_API = "php/sidebar.php";

function getCurrentPage() {
    const fileName = window.location.pathname.split("/").pop() || "";
    return fileName.split("?")[0].split("#")[0].toLowerCase();
}

function formatRoleLabel(role) {
    if (!role) return "";
    return role
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildInitials(name) {
    if (!name) return "U";

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";

    return parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function buildAvatarFallbackUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
    )}&background=f7c4d4&color=222&size=80`;
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

function LogoutModal({ open, onClose, onConfirm }) {
   const modalRoot = document.getElementById("react-modal-root") || document.body;

    React.useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    return ReactDOM.createPortal(
        <div className="logout-modal-overlay" onClick={onClose}>
            <div
                className="logout-modal-card"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="logoutModalTitle"
                aria-describedby="logoutModalDesc"
            >
                <div className="logout-modal-top">
                    <div className="logout-modal-icon-wrap">
                        <i className="bi bi-box-arrow-right"></i>
                    </div>

                    <button
                        type="button"
                        className="logout-modal-close"
                        onClick={onClose}
                        aria-label="Close logout modal"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="logout-modal-content">
                    <div className="logout-modal-kicker">Session</div>
                    <h3 id="logoutModalTitle" className="logout-modal-title">
                        Log out of your account?
                    </h3>
                    <p id="logoutModalDesc" className="logout-modal-text">
                        You’ll end your current session and return to the login page.
                    </p>
                </div>

                <div className="logout-modal-actions">
                    <button
                        type="button"
                        className="logout-btn logout-btn-secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="logout-btn logout-btn-danger"
                        onClick={onConfirm}
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>,
        modalRoot
    );
}

function SidebarAvatar({ user, displayName, displayInitials }) {
    const [imageFailed, setImageFailed] = React.useState(false);

    React.useEffect(() => {
        setImageFailed(false);
    }, [user.profile_image_url]);

    const uploadedAvatarUrl =
        user.profile_image_url && !imageFailed ? user.profile_image_url : "";

    if (uploadedAvatarUrl) {
        return (
            <img
                src={uploadedAvatarUrl}
                alt={`${displayName} Profile`}
                className="sidebar-avatar"
                onError={() => setImageFailed(true)}
            />
        );
    }

    if (displayName) {
        return (
            <img
                src={buildAvatarFallbackUrl(displayName)}
                alt={`${displayName} Profile`}
                className="sidebar-avatar"
            />
        );
    }

    return (
        <div className="sidebar-avatar sidebar-avatar-fallback">
            {displayInitials || "U"}
        </div>
    );
}

function Sidebar() {
    const [collapsed, setCollapsed] = React.useState(() => {
        return localStorage.getItem(STORAGE_KEY) === "true";
    });

    const [isMobile, setIsMobile] = React.useState(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );

    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);

    const [user, setUser] = React.useState({
        name: "",
        role: "",
        role_label: "",
        department_name: "",
        dashboard_title: "",
        initials: "",
        profile_image_url: ""
    });

    const [userLoaded, setUserLoaded] = React.useState(false);

    const currentPage = getCurrentPage();

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
        let active = true;

        async function loadSidebarUser() {
            try {
                const response = await fetch(SIDEBAR_USER_API, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const rawText = await response.text();
                let data = null;

                try {
                    data = JSON.parse(rawText);
                } catch (parseError) {
                    console.error("Invalid sidebar JSON response:", rawText);
                    if (active) setUserLoaded(true);
                    return;
                }

                if (!active) return;

                if (response.status === 401 || response.status === 403) {
                    window.location.href = "../auth/login.html";
                    return;
                }

                if (!response.ok || !data || data.error) {
                    console.error("Sidebar API error:", data?.error || response.status);
                    setUserLoaded(true);
                    return;
                }

                const name = data.name || "User";
                const role = data.role || "";
                const roleLabel = data.role_label || formatRoleLabel(role);
                const departmentName = data.department_name || "";
                const dashboardTitle =
                    data.dashboard_title ||
                    (departmentName && roleLabel
                        ? `${departmentName} - ${roleLabel} Dashboard`
                        : "Dashboard");

                setUser({
                    name,
                    role,
                    role_label: roleLabel,
                    department_name: departmentName,
                    dashboard_title: dashboardTitle,
                    initials: data.initials || buildInitials(name),
                    profile_image_url: data.profile_image_url || ""
                });

                setUserLoaded(true);
            } catch (error) {
                console.error("Failed to load sidebar user data:", error);
                if (active) setUserLoaded(true);
            }
        }

        function handleProfileUpdated(event) {
            const data = event.detail;
            if (!data) {
                loadSidebarUser();
                return;
            }

            const name = data.name || "User";
            const role = data.role || "";
            const roleLabel = data.role_label || formatRoleLabel(role);
            const departmentName = data.department_name || "";

            setUser({
                name,
                role,
                role_label: roleLabel,
                department_name: departmentName,
                dashboard_title:
                    data.dashboard_title ||
                    (departmentName && roleLabel
                        ? `${departmentName} - ${roleLabel} Dashboard`
                        : "Dashboard"),
                initials: data.initials || buildInitials(name),
                profile_image_url: data.profile_image_url || ""
            });

            setUserLoaded(true);
        }

        loadSidebarUser();
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

    const isActivePage = (fileName) => currentPage === fileName.toLowerCase();

    const openLogoutModal = (e) => {
        e.preventDefault();
        setShowLogoutModal(true);
    };

    const closeLogoutModal = () => {
        setShowLogoutModal(false);
    };

    const confirmLogout = () => {
        window.location.href = "../auth/login.html";
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

    const displayName = userLoaded ? user.name : "";
    const displayDepartment = userLoaded ? user.department_name : "";
    const displayRole = userLoaded ? (user.role_label || formatRoleLabel(user.role)) : "";
    const displayInitials = userLoaded ? (user.initials || buildInitials(user.name)) : "";

    const compactLabel =
        displayDepartment && displayRole
            ? `${displayDepartment} - ${displayRole}`
            : displayDepartment || displayRole || "";

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
                            {compactLabel || "Menu"}
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
                    <div className="sidebar-profile sidebar-profile-compact">
                        <SidebarAvatar
                            user={user}
                            displayName={displayName}
                            displayInitials={displayInitials}
                        />

                        <div className="sidebar-profile-info">
                            {compactLabel ? (
                                <div className="sidebar-role sidebar-role-compact">
                                    {compactLabel}
                                </div>
                            ) : null}

                            {displayName ? (
                                <div className="sidebar-name sidebar-name-compact">
                                    {displayName}
                                </div>
                            ) : null}
                        </div>
                    </div>

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
                        href="my-tasks.html"
                        icon="bi-list-check"
                        label="My Tasks"
                        isActive={isActivePage("my-tasks.html")}
                        onNavigate={handleNavigate}
                    />

                    <SidebarLink
                        href="calendar.html"
                        icon="bi-calendar3"
                        label="Calendar"
                        isActive={isActivePage("calendar.html")}
                        onNavigate={handleNavigate}
                    />

                    <div className="sidebar-divider mt-3"></div>
                    <div className="sidebar-section-label">SETTINGS</div>

                    <SidebarLink
                        href="profile.html"
                        icon="bi-gear"
                        label="Account Settings"
                        isActive={isActivePage("profile.html")}
                        onNavigate={handleNavigate}
                    />

                    <div className="sidebar-bottom">
                        <SidebarLink
                            href="../auth/login.html"
                            icon="bi-box-arrow-right"
                            label="Logout Account"
                            isActive={false}
                            extraClass="logout-link"
                            onClick={openLogoutModal}
                        />
                    </div>
                </div>
            </nav>

            <LogoutModal
                open={showLogoutModal}
                onClose={closeLogoutModal}
                onConfirm={confirmLogout}
            />
        </>
    );
}

const sidebarRoot = document.getElementById("sidebar-root");

if (sidebarRoot) {
    ReactDOM.createRoot(sidebarRoot).render(<Sidebar />);
}