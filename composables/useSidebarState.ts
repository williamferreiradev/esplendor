export const useSidebarState = () => {
    const isCollapsed = useState('sidebar-collapsed', () => false)
    const isMobileOpen = useState('sidebar-mobile-open', () => false)

    const toggleSidebar = () => {
        isCollapsed.value = !isCollapsed.value
    }

    const toggleMobileSidebar = () => {
        isMobileOpen.value = !isMobileOpen.value
    }

    const closeMobileSidebar = () => {
        isMobileOpen.value = false
    }

    const sidebarWidth = computed(() => isCollapsed.value ? 'w-20' : 'w-72')
    const mainMargin = computed(() => isCollapsed.value
        ? 'ml-0 pt-16 md:pt-0 md:ml-20'
        : 'ml-0 pt-16 md:pt-0 md:ml-72')

    return {
        isCollapsed,
        isMobileOpen,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
        sidebarWidth,
        mainMargin
    }
}
