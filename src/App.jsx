/**
 * Main application component that sets up routing and global layout.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from './components/sidebar/Sidebar';
import DevicesPage from './pages/devices/DevicesPage';
import PlanPage from './pages/plan/PlanPage';
import SettingsPage from './pages/settings/SettingsPage';
import ActionsPage from './pages/actions/ActionsPage';

import './styles/App.css';


function App() {
    return (
        <BrowserRouter>
            <div className="app">
                <Sidebar />

                <main className="main-section">
                    <Routes>
                        <Route path="/" element={<Navigate to="/geraete" replace />} />

                        <Route path="/geraete" element={<DevicesPage />} />
                        <Route path="/aktionen" element={<ActionsPage />} />
                        <Route path="/ablaufplan" element={<PlanPage />} />
                        <Route path="/einstellungen" element={<SettingsPage />} />

                        <Route path="*" element={<Navigate to="/geraete" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;