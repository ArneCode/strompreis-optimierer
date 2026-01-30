import Sidebar from './components/Sidebar.jsx';
import DevicesPage from './pages/devices/./DevicesPage.jsx';
import PlanPage from './pages/plan/./PlanPage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import ActionsPage from './pages/actions/ActionsPage.jsx';
import './styles/App.css'
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
                  element={<DevicesPage devices={devices} setDevices={setDevices} />}
                />
                <Route 
                  path="/aktionen"
                  element={<ActionsPage devices={devices} setDevices={setDevices} />}
                />
                <Route 
                  path="/ablaufplan"
                  element={<PlanPage />}
                />
                <Route 
                  path="/einstellungen"
                  element={<SettingsPage devices={devices} setDevices={setDevices} />}
                />
              </Routes>

              {/* 
                {window.location.pathname === '/geraete' ? <DevicesPage devices={devices} setDevices={setDevices} /> : <></>}
                {window.location.pathname === '/aktionen' ? <ActionsPage devices={devices} setDevices={setDevices} /> : <></>}
                {window.location.pathname === '/ablaufplan' ? <PlanPage /> : <></>}
                {window.location.pathname === '/einstellungen' ? <SettingsPage /> : <></>}
              */}
          </div>
        </div>
    </BrowserRouter>
  )
}

export default App
