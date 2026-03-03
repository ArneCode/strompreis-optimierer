/**
 * Modal dialog for creating or editing household devices.
 * Displays a form with type selector and type-specific fields (Battery, PV, Consumer, Generator).
 * @param {object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {boolean} props.isEdit - Edit mode (true) vs create mode (false)
 * @param {Function} props.onClose - Callback when modal closes (no params)
 * @param {Function} props.onSave - Callback(deviceData) when save button clicked
 * @param {Function} props.onDelete - Callback() when delete button clicked (edit mode only)
 * @param {string} [props.errorMessage] - Error text to display in modal
 * @param {boolean} [props.isLoading=false] - True during save operation (disables inputs)
 * @param {boolean} [props.isDeleting=false] - True during delete operation (disables buttons)
 * @param {object} props.deviceForm - Current form field values
 * @param {Function} props.onChange - Callback(fieldName, value) for form field changes
 * @param {Object} [props.errors={}] - Field-level validation errors {fieldName: errorMessage}
 * @returns {JSX.Element|null} Modal dialog or null if not open
 */
import React from 'react';
import DeviceForm from './components/DeviceForm.jsx';

function DeviceModal({ isOpen, isEdit, onClose, onSave, onDelete, errorMessage, isLoading, isDeleting, ...formProps }) {
    if (!isOpen) return null;

    return (
        <div className={isEdit ? "edit-device-popup" : "create-device-popup"} data-testid="device-modal">
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
                            data-testid="device-delete"
                        >
                            {isDeleting ? "Löscht..." : "Löschen"}
                        </button>
                    )}
                    <button onClick={onClose} disabled={isLoading || isDeleting} data-testid="device-cancel">
                        Abbrechen
                    </button>

                    {!isEdit || (formProps.deviceForm.type !== "Consumer" && formProps.deviceForm.type !== "Generator" && formProps.deviceForm.type !== "ScheduledGenerator") ? (
                        <button
                            className="devices-save-button"
                            onClick={() => onSave(isEdit)}
                            disabled={isLoading || isDeleting}
                            data-testid="device-save"
                        >
                            {isLoading
                                ? (isEdit ? "Speichert..." : "Erstellt...")
                                : (isEdit
                                    ? (formProps.deviceForm.type === "RandomGenerator" ? "Neu generieren" : "Speichern")
                                    : "Erstellen"
                                )
                            }
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default DeviceModal;