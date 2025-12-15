import './Sidebar.css';
import {SidebarData, SidebarSettings} from './SidebarData';

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-list">
        <div className="sidebar-normal">
          {SidebarData.map((val, key) => {
            return (
              <>
                <div 
                  key={key} 
                  onClick={() => {window.location.pathname = val.link}}
                  className="sidebar-row"
                  id={window.location.pathname === val.link ? 'active' : ''}
                >
                  <div>
                    {val.icon}
                  </div>
                  <div>
                    {val.title}
                  </div>
                </div>
              </>
            );
          })}
        </div>
        <div className="sidebar-settings">
          {SidebarSettings.map((val, key) => {
            return (
              <>
                <div
                  key={key}
                  onClick={() => {window.location.pathname = val.link}}
                  className="sidebar-row"
                  id={window.location.pathname === val.link ? 'active' : ''}
                >
                  <div>
                    {val.icon}
                  </div>
                  <div>
                    {val.title}
                  </div>
                </div>
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;