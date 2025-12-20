import { useState } from "react";
import '../../styles/components/Settings.css';

function Settings({devices, setDevices}) {
    const [openReset, setOpenReset] = useState(false);

    function toggleResetPopUp() {
        setOpenReset(!openReset);
    }

    function handleReset() {
        setDevices([]);
        setOpenReset(false);
    }

    return (
        <div className="settings-container">
            <button
                className="settings-reset-button"
                onClick={toggleResetPopUp}
            >
                Haushalt zurücksetzen
            </button>

            {openReset && (
                <div className="reset-popup-overlay">
                    <div className="reset-popup-window">


                        <p>Möchten Sie den Haushalt wirklich zurücksetzen?</p>

                        <div className="reset-popup-buttons">
                            <button
                                className="reset-cancel-button"
                                onClick={toggleResetPopUp}
                            >
                                Abbrechen
                            </button>
                            <button
                                className="reset-confirm-button"
                                onClick={handleReset}
                            >
                                Zurücksetzen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;
