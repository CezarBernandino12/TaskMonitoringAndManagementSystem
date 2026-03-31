const STORAGE_KEY = "sidebar-collapsed";
const MOBILE_BREAKPOINT = 768;

function getCurrentPage() {
    const fileName = window.location.pathname.split("/").pop() || "";
    return fileName.split("?")[0].split("#")[0].toLowerCase();
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
    const modalRoot = document.getElementById("react-modal-root");

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

    if (!open || !modalRoot) return null;

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

function SupervisorSidebar() {
    const [collapsed, setCollapsed] = React.useState(() => {
        return localStorage.getItem(STORAGE_KEY) === "true";
    });

    const [isMobile, setIsMobile] = React.useState(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);

    const currentPage = getCurrentPage();

    const managementPages = [
        "staff-performance.html",
        "manage-staffs.html",
        "reports.html"
    ];

    const isActivePage = (fileName) => currentPage === fileName.toLowerCase();
    const isManagementActive = managementPages.some(isActivePage);

    const [managementOpen, setManagementOpen] = React.useState(isManagementActive);

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
        if (isManagementActive) {
            setManagementOpen(true);
        }
    }, [isManagementActive]);

    React.useEffect(() => {
        document.body.classList.toggle("sidebar-mobile-open", isMobile && mobileOpen);

        return () => {
            document.body.classList.remove("sidebar-mobile-open");
        };
    }, [isMobile, mobileOpen]);

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

    const toggleManagement = () => {
        setManagementOpen((prev) => !prev);
    };

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
                        <div className="sidebar-mobile-title">Supervisor Menu</div>
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
                        <img
                            src="https://ui-avatars.com/api/?name=Supervisor&background=f7c4d4&color=222&size=80"
                            alt="Profile"
                            className="sidebar-avatar"
                        />
                        <div className="sidebar-profile-info">
                            <div className="sidebar-role">Supervisor</div>
                            <div className="sidebar-name">Supervisor</div>
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
                        href="task-monitoring.html"
                        icon="bi-list-check"
                        label="Task Monitoring"
                        isActive={isActivePage("task-monitoring.html")}
                        onNavigate={handleNavigate}
                    />

                    <SidebarLink
                        href="calendar.html"
                        icon="bi-calendar3"
                        label="Calendar"
                        isActive={isActivePage("calendar.html")}
                        onNavigate={handleNavigate}
                    />

                    <SidebarLink
                        href="gantt-chart.html"
                        icon="bi-bar-chart-line"
                        label="Gantt Chart"
                        isActive={isActivePage("gantt-chart.html")}
                        onNavigate={handleNavigate}
                    />

                    <div className="sidebar-divider mt-3"></div>

                    <div className="sidebar-management-wrap">
                        <button
                            type="button"
                            className={`sidebar-section-label-toggle management-toggle ${managementOpen ? "open" : ""} ${isManagementActive ? "active" : ""} ${!isMobile && collapsed ? "collapsed-trigger" : ""}`}
                            onClick={toggleManagement}
                            aria-expanded={managementOpen}
                            aria-controls="managementSubmenu"
                        >
                            {!isMobile && collapsed && (
                                <span className="management-toggle-icon">
                                    <i className="bi bi-folder2-open"></i>
                                </span>
                            )}

                            <span className="sidebar-section-label-text">MANAGEMENT</span>

                            <span className="sidebar-section-label-chevron">
                                <i className="bi bi-chevron-down"></i>
                            </span>
                        </button>

                        <div
                            id="managementSubmenu"
                            className={`sidebar-submenu ${managementOpen ? "open" : ""} ${!isMobile && collapsed ? "collapsed-popout" : ""}`}
                        >
                            <SidebarLink
                                href="staff-performance.html"
                                icon="bi-graph-up-arrow"
                                label="Staff Performance"
                                isActive={isActivePage("staff-performance.html")}
                                extraClass="sidebar-sublink"
                                onNavigate={handleNavigate}
                            />

                            <SidebarLink
                                href="manage-staffs.html"
                                icon="bi-people"
                                label="Manage Staffs"
                                isActive={isActivePage("manage-staffs.html")}
                                extraClass="sidebar-sublink"
                                onNavigate={handleNavigate}
                            />

                            <SidebarLink
                                href="reports.html"
                                icon="bi-file-earmark-text"
                                label="Reports"
                                isActive={isActivePage("reports.html")}
                                extraClass="sidebar-sublink"
                                onNavigate={handleNavigate}
                            />
                        </div>
                    </div>

                    <div className="sidebar-divider mt-3"></div>
                    <div className="sidebar-section-label">SETTINGS</div>

                    <SidebarLink
                        href="profile.html"
                        icon="bi-gear"
                        label="Profile"
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
    ReactDOM.createRoot(sidebarRoot).render(<SupervisorSidebar />);
}