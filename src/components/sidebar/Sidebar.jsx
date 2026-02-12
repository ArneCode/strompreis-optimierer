import React, { useState } from 'react';
import { NavLink } from "react-router-dom";
import { SIDEBAR_MAIN_ITEMS, SIDEBAR_SETTING_ITEMS } from './SidebarData.jsx';

import collapseIcon from '../../assets/icons/sidebar/sidebar-collapse.png';
import uncollapseIcon from '../../assets/icons/sidebar/sidebar-uncollapse.png';
import '../../styles/components/Sidebar.css';


const SidebarRow = ({ item, isCollapsed }) => (
    <NavLink
        to={item.link}
        className={({ isActive }) => `sidebar-row ${isActive ? "active" : ""}`}
    >
        <div className="sidebar-icon-wrapper">
            <img src={item.icon} alt="" className="sidebar-data-icon" />
        </div>
        {!isCollapsed && <span className="sidebar-title">{item.title}</span>}
    </NavLink>
);

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