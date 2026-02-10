import { useState } from "react";
import '../../styles/pages/Settings.css';
import apiService from "../../services/apiService.js";

function SettingsPage() {
    const [openReset, setOpenReset] = useState(false);

    function toggleResetPopUp() {
        setOpenReset(!openReset);
    }

    async function handleReset() {
        try {
            await apiService.resetAllDevices();

            setOpenReset(false);
            console.log("Haushalt erfolgreich zurückgesetzt");
        } catch (error) {
            console.error("Fehler beim Zurücksetzen des Haushalts:", error);
            alert("Fehler beim Löschen der Daten auf dem Server.");
        }
    }

    return (
        <>
          <div className="settings-head">
            <p>Einstellungen</p>
          </div>

          <div className="settings-container">
              <p className="title">
                <b>Haushalt zurücksetzen</b>
              </p>
              
              <p className="description">
                  Setzen Sie den gesamten Haushalt, samt Geräten, Aktionen und Ablaufplan zurück.
              </p>

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
        </>
        
    );
}

export default SettingsPage;
