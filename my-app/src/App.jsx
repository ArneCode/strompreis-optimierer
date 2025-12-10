import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Devices from './pages/Devices';
import Household from './pages/Household';
import Settings from './pages/Settings';
import './App.css';

export default function App() {
    return (
        <Router>
            <Sidebar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route path="/household" element={<Household />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </main>
        </Router>
    );
}
