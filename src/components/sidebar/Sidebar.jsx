/**
 * Sidebar navigation component with collapsible state.
 * Displays main navigation (Devices, Actions, Plan) and settings link.
 */
import React, { useState } from 'react';
import { NavLink } from "react-router-dom";
import { SIDEBAR_MAIN_ITEMS, SIDEBAR_SETTING_ITEMS } from './SidebarData.jsx';

import collapseIcon from '../../assets/icons/sidebar/sidebar-collapse.png';
import uncollapseIcon from '../../assets/icons/sidebar/sidebar-uncollapse.png';
import '../../styles/components/Sidebar.css';

/**
 * Navigation link component for sidebar entries.
 * Displays icon and title (if not collapsed) with active state highlighting.
 * @param {object} props
 * @param {object} props.item - Navigation item configuration
 * @param {string} props.item.title - Display title (e.g., "Geräte")
 * @param {string} props.item.icon - Image path for icon
 * @param {string} props.item.link - React Router path (e.g., "/geraete")
 * @param {boolean} props.isCollapsed - Hide text labels when true
 * @returns {JSX.Element} NavLink element
 */
const SidebarRow = ({ item, isCollapsed }) => (
    <NavLink
        to={item.link}
        data-testid={item.testId}
        className={({ isActive }) => `sidebar-row ${isActive ? "active" : ""}`}
    >
        <div className="sidebar-icon-wrapper">
            <img src={item.icon} alt="" className="sidebar-data-icon" />
        </div>
        {!isCollapsed && <span className="sidebar-title">{item.title}</span>}
    </NavLink>
);

/**
 * Collapsible navigation sidebar used across the app.
 */
function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <nav className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="sidebar-list">

                <header className={`sidebar-head ${collapsed ? "collapsed" : ""}`}>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        data-testid="sidebar-toggle"
                    >
                        <img src={collapsed ? uncollapseIcon : collapseIcon} alt="" />
                    </button>
                </header>

                <section className="sidebar-main-nav">
                    {SIDEBAR_MAIN_ITEMS.map((item) => (
                        <SidebarRow key={item.link} item={item} isCollapsed={collapsed} />
                    ))}
                </section>

                <hr className="sidebar-divider" />

                <section className="sidebar-footer-nav">
                    {SIDEBAR_SETTING_ITEMS.map((item) => (
                        <SidebarRow key={item.link} item={item} isCollapsed={collapsed} />
                    ))}
                </section>

            </div>
        </nav>
    );
}

export default Sidebar;