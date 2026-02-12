import React from 'react';
import DeviceForm from './components/DeviceForm.jsx';

function DeviceModal({ isOpen, isEdit, onClose, onSave, onDelete, errorMessage, isLoading, isDeleting, ...formProps }) {
    if (!isOpen) return null;

    return (
        <div className={isEdit ? "edit-device-popup" : "create-device-popup"}>
            <div className="device-popup-window">
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                <p className="device-popup-header">
                    {isEdit ? "Gerät bearbeiten" : "Gerät erstellen"}
                </p>
                <div className="device-popup-inputs">
                    <DeviceForm {...formProps} isEdit={isEdit} disabled={isLoading || isDeleting} />
                </div>
                <div className="device-popup-buttons">
                    {isEdit && (
                        <button
                            className="devices-edit-delete-button"
                            onClick={onDelete}
                            disabled={isDeleting || isLoading}
                        >
                            {isDeleting ? "Löscht..." : "Löschen"}
                        </button>
                    )}
                    <button onClick={onClose} disabled={isLoading || isDeleting}>
                        Abbrechen
                    </button>

                    {(!isEdit || formProps.deviceForm.type !== "Consumer") && (
                        <button
                            className="devices-save-button"
                            onClick={() => onSave(isEdit)}
                            disabled={isLoading || isDeleting}
                        >
                            {isLoading ? (isEdit ? "Speichert..." : "Erstellt...") : (isEdit ? "Speichern" : "Erstellen")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DeviceModal;