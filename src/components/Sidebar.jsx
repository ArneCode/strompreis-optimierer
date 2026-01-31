import '../styles/components/Sidebar.css';
import { SidebarData, SidebarSettings } from './SidebarData.jsx';
import { NavLink } from "react-router-dom";
import { useState } from 'react';
import collapseIcon from '../assets/sidebar-collapse.png';
import uncollapseIcon from '../assets/sidebar-uncollapse.png';

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-list">

        <div className={`sidebar-head ${collapsed ? "collapsed" : ""}`}>
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            <img src={collapsed ? uncollapseIcon : collapseIcon} />
          </button>
        </div>


        <div className="sidebar-normal">
          {SidebarData.map((val, key) => (
            <NavLink
              key={key}
              to={val.link}
              className={({ isActive }) =>
                `sidebar-row ${isActive ? "active" : ""}`
              }
            >
              <div>{val.icon}</div>
              {!collapsed && <div>{val.title}</div>}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-settings">
          {SidebarSettings.map((val, key) => (
            <NavLink
              key={key}
              to={val.link}
              className={({ isActive }) =>
                `sidebar-row ${isActive ? "active" : ""}`
              }
            >
              <div>{val.icon}</div>
              {!collapsed && <div>{val.title}</div>}
            </NavLink>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Sidebar;
