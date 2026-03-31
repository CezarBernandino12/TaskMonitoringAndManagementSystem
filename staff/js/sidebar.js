const STORAGE_KEY = "sidebar-collapsed";

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("dashboardSidebar");
    const toggleBtn = document.getElementById("sidebarToggle");

    if (!sidebar || !toggleBtn) return;

    const isCollapsed = localStorage.getItem(STORAGE_KEY) === "true";
    sidebar.classList.toggle("collapsed", isCollapsed);
    document.documentElement.classList.remove("sidebar-collapsed-init");

    toggleBtn.addEventListener("click", () => {
        const collapsedNow = sidebar.classList.toggle("collapsed");
        localStorage.setItem(STORAGE_KEY, String(collapsedNow));
    });
});