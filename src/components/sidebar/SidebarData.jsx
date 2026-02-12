import DeviceIcon from '../../assets/icons/navigation/device.png';
import ActionIcon from '../../assets/icons/navigation/action.png';
import PlanIcon from '../../assets/icons/navigation/plan.png';
import SettingsIcon from '../../assets/icons/navigation/settings.png';

export const SIDEBAR_MAIN_ITEMS = [
    { title: 'Geräte', icon: DeviceIcon, link: '/geraete' },
    { title: 'Aktionen', icon: ActionIcon, link: '/aktionen' },
    { title: 'Ablaufplan', icon: PlanIcon, link: '/ablaufplan' }
];

export const SIDEBAR_SETTING_ITEMS = [
    { title: 'Einstellungen', icon: SettingsIcon, link: '/einstellungen' }
];
