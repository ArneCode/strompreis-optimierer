import DeviceIcon from '../../assets/icons/navigation/device.png';
import ActionIcon from '../../assets/icons/navigation/action.png';
import PlanIcon from '../../assets/icons/navigation/plan.png';
import SettingsIcon from '../../assets/icons/navigation/settings.png';
import OverviewIcon from '../../assets/icons/navigation/overview.png';

/**
 * Main sidebar navigation items (title, icon, route)
 */
export const SIDEBAR_MAIN_ITEMS = [
    { title: 'Aktuell', icon: OverviewIcon, link: '/aktuell', testId: 'nav-overview'},
    { title: 'Geräte', icon: DeviceIcon, link: '/geraete', testId: 'nav-devices'},
    { title: 'Aktionen', icon: ActionIcon, link: '/aktionen', testId: 'nav-actions' },
    { title: 'Ablaufplan', icon: PlanIcon, link: '/ablaufplan', testId: 'nav-plan'},
];

/**
 * Sidebar settings-related items
 */
export const SIDEBAR_SETTING_ITEMS = [
    { title: 'Einstellungen', icon: SettingsIcon, link: '/einstellungen', testId: 'nav-settings' }
];
