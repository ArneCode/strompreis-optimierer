/**
 * Settings page for admin actions like resetting all devices and configuring optimization parameters.
 */
import { useState, useEffect } from "react";
import '../../styles/pages/Settings.css';
import apiService from "../../services/apiService.js";

function SettingsPage() {
    const [openReset, setOpenReset] = useState(false);
    const [openSaReset, setOpenSaReset] = useState(false);
    const [settings, setSettings] = useState({
        initial_temperature: '',
        cooling_rate: '',
        final_temperature: '',
        constant_action_move_factor: '',
        num_moves_per_step: ''
    });
    const [editSettings, setEditSettings] = useState({ ...settings });
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fieldErrors, setFieldErrors] = useState({});
    const [constantActionsCount, setConstantActionsCount] = useState(0);

    /**
     * Load simulated annealing settings from backend on component mount.
     */
    useEffect(() => {
        loadSettings();
    }, []);

    /**
     * Fetch settings from backend and update state.
     */
    async function loadSettings() {
        setIsLoading(true);
        try {
            const data = await apiService.fetchSimulatedAnnealingSettings();
            console.log("Settings loaded:", data);
            setSettings(data);
            setEditSettings(data);
            setError(null);

            const devices = await apiService.fetchDevices();
            let constantCount = 0;
            devices.forEach(device => {

                if (device.flexibility === 'constant' && device.actions) {
                    constantCount += device.actions.length;
                }
            });
            setConstantActionsCount(constantCount);
        } catch (err) {
            console.error("Error loading settings:", err);
            setError("Fehler beim Laden der Einstellungen: " + err.message);
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Start editing settings mode.
     */
    function startEditSettings() {
        setEditSettings({ ...settings });
        setIsEditingSettings(true);
        setSuccessMessage(null);
    }

    /**
     * Cancel editing and discard changes.
     */
    function cancelEditSettings() {
        setIsEditingSettings(false);
        setEditSettings({ ...settings });
    }

    /**
     * Update a single setting field.
     * @param {string} field - Setting field name
     * @param {string|number} value - New value
     */
    function handleSettingChange(field, value) {
        setEditSettings(prev => ({
            ...prev,
            [field]: value === '' ? '' : parseFloat(value)
        }));

        if (fieldErrors[field]) {
            setFieldErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    }

    /**
     * Validate all settings fields.
     * @returns {boolean} True if all fields are valid
     */
    function validateSettings() {
        const newErrors = {};

        if (editSettings.initial_temperature === '' || editSettings.initial_temperature <= 0) {
            newErrors.initial_temperature = 'Starttemperatur erforderlich (> 0)';
        }
        if (editSettings.cooling_rate === '' || editSettings.cooling_rate < 0 || editSettings.cooling_rate > 1) {
            newErrors.cooling_rate = 'Abkühlrate erforderlich (0 - 1)';
        }
        if (editSettings.final_temperature === '' || editSettings.final_temperature <= 0) {
            newErrors.final_temperature = 'Endtemperatur erforderlich (> 0)';
        }
        if (editSettings.constant_action_move_factor === '' || editSettings.constant_action_move_factor <= 0) {
            newErrors.constant_action_move_factor = 'Aktions-Bewegungsfaktor erforderlich (> 0)';
        }

        if (editSettings.num_moves_per_step === '' || editSettings.num_moves_per_step <= 0) {
            newErrors.num_moves_per_step = 'Bewegungen pro Schritt erforderlich (> 0)';
        } else if (!Number.isInteger(editSettings.num_moves_per_step)) {
            newErrors.num_moves_per_step = 'Bewegungen pro Schritt muss eine ganze Zahl sein';
        } else if (editSettings.num_moves_per_step > constantActionsCount) {
            newErrors.num_moves_per_step = `Bewegungen pro Schritt darf nicht größer als ${constantActionsCount} konstante Aktionen sein`;
        }

        if (editSettings.initial_temperature > 0 && editSettings.final_temperature > 0 &&
            editSettings.final_temperature >= editSettings.initial_temperature) {
            newErrors.final_temperature = 'Endtemperatur muss kleiner als Starttemperatur sein';
        }

        setFieldErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    /**
     * Save updated settings to backend.
     */
    async function saveSettings() {
        if (!validateSettings()) {
            setError('Bitte füllen Sie alle Felder mit Werten größer als 0 aus');
            return;
        }

        try {
            await apiService.updateSimulatedAnnealingSettings(editSettings);
            setSettings({ ...editSettings });
            setIsEditingSettings(false);
            setSuccessMessage("Einstellungen erfolgreich gespeichert");
            setTimeout(() => setSuccessMessage(null), 3000);
            setError(null);
            setFieldErrors({});
        } catch (err) {
            setError("Fehler beim Speichern der Einstellungen");
            console.error("Error saving settings:", err);
        }
    }

    function toggleResetPopUp() {
        setOpenReset(!openReset);
    }

    function toggleSaResetPopUp() {
        setOpenSaReset(!openSaReset);
    }

    /**
     * Confirmed action: call backend to reset simulated annealing settings
     */
    async function handleSaReset() {
        setIsLoading(true);
        setError(null);
        try {
            const defaults = await apiService.resetSimulatedAnnealingSettings();
            // Aktualisiere UI mit den zurückgesetzten Werten
            setSettings(defaults);
            setEditSettings(defaults);
            setSuccessMessage('Simulated Annealing Einstellungen zurückgesetzt');
            setTimeout(() => setSuccessMessage(null), 3000);
            setOpenSaReset(false);
        } catch (err) {
            console.error('Fehler beim Zurücksetzen der SA-Einstellungen:', err);
            setError('Fehler beim Zurücksetzen der SA-Einstellungen');
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Call backend to delete all devices and close the popup.
     * Alerts on failure.
     */
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
                <b>Simulated Annealing Parameter</b>
              </p>

              {error && <div className="settings-error">{error}</div>}
              {successMessage && <div className="settings-success">{successMessage}</div>}
              {isLoading && <div className="settings-loading">Einstellungen werden geladen...</div>}

              {!isLoading && !isEditingSettings && (
                  <>
                      <div className="settings-item">
                          <label>Starttemperatur:</label>
                          <span className="settings-value">{settings?.initial_temperature || '-'}</span>
                      </div>
                      <div className="settings-item">
                          <label>Abkühlrate:</label>
                          <span className="settings-value">{settings?.cooling_rate || '-'}</span>
                      </div>
                      <div className="settings-item">
                          <label>Endtemperatur:</label>
                          <span className="settings-value">{settings?.final_temperature || '-'}</span>
                      </div>
                      <div className="settings-item">
                          <label>Konstanter Aktions-Bewegungsfaktor:</label>
                          <span className="settings-value">{settings?.constant_action_move_factor || '-'}</span>
                      </div>
                      <div className="settings-item">
                          <label>Bewegungen pro Schritt:</label>
                          <span className="settings-value">{settings?.num_moves_per_step || '-'}</span>
                      </div>
                      <button
                          className="settings-edit-button"
                          onClick={startEditSettings}
                      >
                          Parameter bearbeiten
                      </button>

                      <button
                          className="settings-reset-button"
                          onClick={toggleSaResetPopUp}
                      >
                          SA-Einstellungen zurücksetzen
                      </button>

                      {openSaReset && (
                          <div className="reset-popup-overlay">
                              <div className="reset-popup-window">
                                  <p>Möchten Sie die Simulated Annealing Einstellungen wirklich auf die Standardwerte zurücksetzen?</p>

                                  <div className="reset-popup-buttons">
                                      <button
                                          className="reset-cancel-button"
                                          onClick={toggleSaResetPopUp}
                                      >
                                          Abbrechen
                                      </button>
                                      <button
                                          className="reset-confirm-button"
                                          onClick={handleSaReset}
                                      >
                                          Zurücksetzen
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </>
              )}

              {isEditingSettings && (
                  <>
                      <div className="settings-form">
                          <div className="form-group">
                              <label>Starttemperatur:</label>
                              <input
                                  type="number"
                                  step="0.1"
                                  min="0.01"
                                  value={editSettings.initial_temperature}
                                  onChange={(e) => handleSettingChange('initial_temperature', e.target.value)}
                                  className={fieldErrors.initial_temperature ? 'input-error' : ''}
                              />
                              {fieldErrors.initial_temperature && <div className="field-error">{fieldErrors.initial_temperature}</div>}
                          </div>
                          <div className="form-group">
                              <label>Abkühlrate:</label>
                              <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="1"
                                  value={editSettings.cooling_rate}
                                  onChange={(e) => handleSettingChange('cooling_rate', e.target.value)}
                                  className={fieldErrors.cooling_rate ? 'input-error' : ''}
                              />
                              {fieldErrors.cooling_rate && <div className="field-error">{fieldErrors.cooling_rate}</div>}
                          </div>
                          <div className="form-group">
                              <label>Endtemperatur:</label>
                              <input
                                  type="number"
                                  step="0.1"
                                  min="0.01"
                                  value={editSettings.final_temperature}
                                  onChange={(e) => handleSettingChange('final_temperature', e.target.value)}
                                  className={fieldErrors.final_temperature ? 'input-error' : ''}
                              />
                              {fieldErrors.final_temperature && <div className="field-error">{fieldErrors.final_temperature}</div>}
                          </div>
                          <div className="form-group">
                              <label>Konstanter Aktions-Bewegungsfaktor:</label>
                              <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={editSettings.constant_action_move_factor}
                                  onChange={(e) => handleSettingChange('constant_action_move_factor', e.target.value)}
                                  className={fieldErrors.constant_action_move_factor ? 'input-error' : ''}
                              />
                              {fieldErrors.constant_action_move_factor && <div className="field-error">{fieldErrors.constant_action_move_factor}</div>}
                          </div>
                          <div className="form-group">
                              <label>Bewegungen pro Schritt:</label>
                              <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={editSettings.num_moves_per_step}
                                  onChange={(e) => handleSettingChange('num_moves_per_step', e.target.value)}
                                  className={fieldErrors.num_moves_per_step ? 'input-error' : ''}
                              />
                              {fieldErrors.num_moves_per_step && <div className="field-error">{fieldErrors.num_moves_per_step}</div>}
                              <div className="field-info">Konstante Aktionen verfügbar: {constantActionsCount}</div>
                          </div>
                      </div>
                      <div className="settings-form-buttons">
                          <button
                              className="settings-cancel-button"
                              onClick={cancelEditSettings}
                          >
                              Abbrechen
                          </button>
                          <button
                              className="settings-save-button"
                              onClick={saveSettings}
                          >
                              Speichern
                          </button>
                      </div>
                  </>
              )}
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
