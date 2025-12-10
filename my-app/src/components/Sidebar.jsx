import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
    const [open, setOpen] = useState(true);

    return (
        <div className={open ? 'sidebar open' : 'sidebar closed'}>
            <button className="toggle-btn" onClick={() => setOpen(!open)}>
                {open ? '«' : '»'}
            </button>
            <ul className="menu">
                <li>
                    <Link to="/">Startseite</Link>
                </li>
                <li>
                    <Link to="/devices">Meine Geräte</Link>
                </li>
                <li>
                    <Link to="/household">Mein Haushalt</Link>
                </li>
                <li>
                    <Link to="/settings">Einstellungen</Link>
                </li>
            </ul>
        </div>
    );
}

