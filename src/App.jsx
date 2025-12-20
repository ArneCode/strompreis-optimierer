import Sidebar from './components/Sidebar.jsx';
import Devices from './components/devices/Devices.jsx';
import Plan from './components/plan/Plan.jsx';
import Settings from './components/settings/Settings.jsx';
import Actions from './components/actions/Actions.jsx';
import './App.css'
import {useState} from "react";
import { BrowserRouter, Routes, Route} from "react-router-dom";

function App() {
  const [devices, setDevices] = useState([
    {
      name: "Waschmaschine",
      typ: "Verbraucher",
      actions: [
          { startTime: "10:00", endTime: "10:00" },
          { startTime: "10:00", endTime: "12:00" },
      ],
    },
    {
      name: "E-auto",
      typ: "Verbraucher",
      actions: [
          { startTime: "10:00", endTime: "10:00" },
      ],
    },
  ]);


  return (
    <BrowserRouter>
        <div className="app">
          <Sidebar />
          <div className="main-section">
              <Routes>
                <Route 
                  path="/geraete"
                  element={<Devices devices={devices} setDevices={setDevices} />}
                />
                <Route 
                  path="/aktionen"
                  element={<Actions devices={devices} setDevices={setDevices} />}
                />
                <Route 
                  path="/ablaufplan"
                  element={<Plan />}
                />
                <Route 
                  path="/einstellungen"
                  element={<Settings devices={devices} setDevices={setDevices} />}
                />
              </Routes>

              {/* 
                {window.location.pathname === '/geraete' ? <Devices devices={devices} setDevices={setDevices} /> : <></>}
                {window.location.pathname === '/aktionen' ? <Actions devices={devices} setDevices={setDevices} /> : <></>}
                {window.location.pathname === '/ablaufplan' ? <Plan /> : <></>}
                {window.location.pathname === '/einstellungen' ? <Settings /> : <></>}
              */}
          </div>
        </div>
    </BrowserRouter>
  )
}

export default App
