import './Sidebar.css';
import { SidebarData, SidebarSettings } from './SidebarData.jsx';
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-list">

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
              <div>{val.title}</div>
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
              <div>{val.title}</div>
            </NavLink>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Sidebar;
