import Sidebar from './components/Sidebar.jsx';
import Devices from './components/devices/Devices.jsx';
import Plan from './components/plan/Plan.jsx';
import Settings from './components/settings/Settings.jsx';
import Actions from './components/actions/Actions.jsx';
import './App.css'
import {useState} from "react";

function App() {
    const [devices, setDevices] = useState([
        {
            name: "Waschmaschine",
            actions: [
                { startTime: "10:00", endTime: "10:00" },
                { startTime: "10:00", endTime: "12:00" },
            ],
        },
        {
            name: "E-auto",
            actions: [
                { startTime: "10:00", endTime: "10:00" },
            ],
        },
    ]);


  return (
    <div className="app">
      <Sidebar />
      <div className="main-section">
          {window.location.pathname === '/geraete' ? <Devices /> : <></>}
          {window.location.pathname === '/aktionen' ? <Actions devices={devices} setDevices={setDevices} /> : <></>}
          {window.location.pathname === '/ablaufplan' ? <Plan /> : <></>}
          {window.location.pathname === '/einstellungen' ? <Settings /> : <></>}
      </div>
    </div>
  )
}

export default App
