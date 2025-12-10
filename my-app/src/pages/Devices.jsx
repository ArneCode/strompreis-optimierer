import React from 'react';
import './Header.css';

export default function Devices() {
    return (
        <div className="devices-header">
            <h1 className="header-box">Meine Geräte</h1>
            <button className="add-device-btn">Gerät hinzufügen</button>
        </div>
    );
}
