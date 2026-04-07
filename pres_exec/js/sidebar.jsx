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

function PresidentSidebar() {
    const [collapsed, setCollapsed] = React.useState(() => {
        return localStorage.getItem(STORAGE_KEY) === "true";
    });

    const [isMobile, setIsMobile] = React.useState(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const currentPage = getCurrentPage();

    const reportsPages = [
        "daily-reports.html",
        "weekly-reports.html",
        "monthly-reports.html",
        "quarterly-reports.html",
        "annual-reports.html"
    ];

    const isActivePage = (fileName) => currentPage === fileName.toLowerCase();
    const isAnyReportActive = reportsPages.some(isActivePage);

    const [reportsOpen, setReportsOpen] = React.useState(isAnyReportActive);

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
        if (isAnyReportActive) {
            setReportsOpen(true);
        }
    }, [isAnyReportActive]);

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

    const toggleReports = () => {
        setReportsOpen((prev) => !prev);
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
                        <div className="sidebar-avatar sidebar-avatar-fallback">
                            P
                        </div>

                        <div className="sidebar-profile-info">
                            <div className="sidebar-role">Executive Access</div>
                            <div className="sidebar-name">President</div>
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
                        href="calendar.html"
                        icon="bi-calendar"
                        label="Calendar"
                        isActive={isActivePage("calendar.html")}
                        onNavigate={handleNavigate}
                    />


                    <div className="sidebar-divider mt-3"></div>

                    <div className="sidebar-management-wrap">
                        <button
                            type="button"
                            className={`sidebar-section-label-toggle reports-toggle ${reportsOpen ? "open" : ""} ${isAnyReportActive ? "active" : ""} ${!isMobile && collapsed ? "collapsed-trigger" : ""}`}
                            onClick={toggleReports}
                            aria-expanded={reportsOpen}
                            aria-controls="reportsSubmenu"
                        >
                            {!isMobile && collapsed && (
                                <span className="reports-toggle-icon">
                                    <i className="bi bi-file-earmark-bar-graph"></i>
                                </span>
                            )}

                            <span className="sidebar-section-label-text">REPORTS</span>

                            <span className="sidebar-section-label-chevron">
                                <i className="bi bi-chevron-down"></i>
                            </span>
                        </button>

                        <div
                            id="reportsSubmenu"
                            className={`sidebar-submenu ${reportsOpen ? "open" : ""} ${!isMobile && collapsed ? "collapsed-popout" : ""}`}
                        >
                            <SidebarLink
                                href="daily-reports.html"
                                icon="bi-calendar-day"
                                label="Daily"
                                isActive={isActivePage("daily-reports.html")}
                                extraClass="sidebar-sublink"
                                onNavigate={handleNavigate}
                            />

                            <SidebarLink
                                href="weekly-reports.html"
                                icon="bi-calendar-week"
                                label="Weekly"
                                isActive={isActivePage("weekly-reports.html")}
                                extraClass="sidebar-sublink"
                                onNavigate={handleNavigate}
                            />

                            <SidebarLink
                                href="monthly-reports.html"
                                icon="bi-calendar-month"
                                label="Monthly"
                                isActive={isActivePage("monthly-reports.html")}
                                extraClass="sidebar-sublink"
                                onNavigate={handleNavigate}
                            />

                            <SidebarLink
                                href="quarterly-reports.html"
                                icon="bi-calendar2-range"
                                label="Quarterly"
                                isActive={isActivePage("quarterly-reports.html")}
                                extraClass="sidebar-sublink"
                                onNavigate={handleNavigate}
                            />

                            <SidebarLink
                                href="annual-reports.html"
                                icon="bi-calendar2-check"
                                label="Annually"
                                isActive={isActivePage("annual-reports.html")}
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
                </div>
            </nav>
        </>
    );
}

const sidebarRoot = document.getElementById("sidebar-root");

if (sidebarRoot) {
    ReactDOM.createRoot(sidebarRoot).render(<PresidentSidebar />);
}