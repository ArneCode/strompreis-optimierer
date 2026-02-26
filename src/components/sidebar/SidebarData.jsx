import DeviceIcon from '../../assets/icons/navigation/device.png';
import ActionIcon from '../../assets/icons/navigation/action.png';
import PlanIcon from '../../assets/icons/navigation/plan.png';
import SettingsIcon from '../../assets/icons/navigation/settings.png';

/**
 * Main sidebar navigation items (title, icon, route)
 */
export const SIDEBAR_MAIN_ITEMS = [
    { title: 'Aktuell', icon: ActionIcon, link: '/aktuell'},
    { title: 'Geräte', icon: DeviceIcon, link: '/geraete' },
    { title: 'Aktionen', icon: ActionIcon, link: '/aktionen' },
    { title: 'Ablaufplan', icon: PlanIcon, link: '/ablaufplan' },
];

/**
 * Sidebar settings-related items
 */
export const SIDEBAR_SETTING_ITEMS = [
    { title: 'Einstellungen', icon: SettingsIcon, link: '/einstellungen' }
];
