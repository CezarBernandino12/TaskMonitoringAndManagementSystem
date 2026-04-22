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

function SidebarAvatar({ user, displayName, displayInitials }) {
    const [imageFailed, setImageFailed] = React.useState(false);

    React.useEffect(() => {
        setImageFailed(false);
    }, [user?.profile_image_url]);

    const uploadedAvatarUrl =
        user?.profile_image_url && !imageFailed ? user.profile_image_url : "";

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

function AdminSidebar() {
    const [collapsed, setCollapsed] = React.useState(() => {
        return localStorage.getItem(STORAGE_KEY) === "true";
    });

    const [isMobile, setIsMobile] = React.useState(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );
    const [mobileOpen, setMobileOpen] = React.useState(false);

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

                const name = data.name || "Administrator";
                const role = data.role || "admin";
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

            const name = data.name || "Administrator";
            const role = data.role || "admin";
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

    const displayName = userLoaded ? user.name : "";
    const displayDepartment = userLoaded ? user.department_name : "";
    const displayRole = userLoaded ? (user.role_label || formatRoleLabel(user.role)) : "";
    const displayInitials = userLoaded ? (user.initials || buildInitials(user.name)) : "";

    const compactLabel =
        displayDepartment && displayRole
            ? `${displayDepartment} - ${displayRole}`
            : displayDepartment || displayRole || "ADMINISTRATOR";

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
                            {compactLabel || "Admin Menu"}
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
                        <SidebarAvatar
                            user={user}
                            displayName={displayName}
                            displayInitials={displayInitials}
                        />

                        <div className="sidebar-profile-info">
                            {compactLabel ? (
                                <div className="sidebar-role">{compactLabel}</div>
                            ) : null}

                            {displayName ? (
                                <div className="sidebar-name">{displayName}</div>
                            ) : null}
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
                            icon="bi-calendar3"
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

                        <div className="sidebar-divider sidebar-section-split"></div>

                        <div className="sidebar-management-wrap sidebar-management-static">
                            <div className="sidebar-section-label sidebar-section-label-inline">
                                MANAGEMENT
                            </div>

                            <div className="sidebar-submenu sidebar-submenu-static open">
                                <SidebarLink
                                    href="users.html"
                                    icon="bi-people"
                                    label="Manage Users"
                                    isActive={isActivePage("users.html")}
                                    extraClass="sidebar-sublink sidebar-sublink-sm"
                                    onNavigate={handleNavigate}
                                />

                                <SidebarLink
                                    href="departments.html"
                                    icon="bi-diagram-3"
                                    label="Departments"
                                    isActive={isActivePage("departments.html")}
                                    extraClass="sidebar-sublink sidebar-sublink-sm"
                                    onNavigate={handleNavigate}
                                />

                                <SidebarLink
                                    href="activity-logs.html"
                                    icon="bi-journal-text"
                                    label="Activity Logs"
                                    isActive={isActivePage("activity-logs.html")}
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
    ReactDOM.createRoot(sidebarRoot).render(<AdminSidebar />);
}