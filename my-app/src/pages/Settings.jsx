import React, { useState } from 'react';
import './Header.css';

export default function Settings() {
    const [darkMode, setDarkMode] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const toggleDarkMode = () => {
        setDarkMode(prev => !prev);
        document.body.classList.toggle("dark-mode");
    };

    const openResetModal = () => {
        setShowModal(true);
    };

    const confirmReset = () => {
        setShowModal(false);
        alert("Einstellungen wurden zurückgesetzt!");
        // hier später: localStorage.clear()
    };

    const cancelReset = () => {
        setShowModal(false);
    };

    return (
        <div className="settings-container">
            <h1 className="header-box">Einstellungen</h1>

            <div className="button-row">
                <button className="settings-btn reset" onClick={openResetModal}>
                    Zurücksetzen
                </button>

                <button className="settings-btn dark" onClick={toggleDarkMode}>
                    {darkMode ? "Light Mode" : "Dark Mode"}
                </button>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h2>Bist du sicher?</h2>
                        <p className="modal-text">Willst du wirklich alle Einstellungen zurücksetzen?</p>

                        <div className="modal-buttons">
                            <button className="modal-btn cancel" onClick={cancelReset}>
                                Abbrechen
                            </button>

                            <button className="modal-btn confirm" onClick={confirmReset}>
                                Zurücksetzen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
