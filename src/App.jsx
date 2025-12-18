import Sidebar from './components/Sidebar.jsx';
import Devices from './components/devices/Devices.jsx';
import Plan from './components/plan/Plan.jsx';
import Settings from './components/settings/Settings.jsx';
import Actions from './components/actions/Actions.jsx';
import './App.css'

function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main-section">
          {window.location.pathname === '/geraete' ? <Devices /> : <></>}
          {window.location.pathname === '/aktionen' ? <Actions /> : <></>}
          {window.location.pathname === '/ablaufplan' ? <Plan /> : <></>}
          {window.location.pathname === '/einstellungen' ? <Settings /> : <></>}
      </div>
    </div>
  )
}

export default App
