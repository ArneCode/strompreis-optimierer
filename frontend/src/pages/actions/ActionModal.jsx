/**
 * Modal dialog for creating or editing device actions (scheduled tasks).
 * Displays ActionForm with time range slider and validation.
 * @param {object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {boolean} props.isEdit - Edit mode (true) vs create mode (false)
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSave - Callback(actionData) when save button clicked
 * @param {Function} props.onDelete - Callback() when delete button clicked (edit mode only)
 * @param {string} [props.errorMessage] - Error text to display
 * @param {boolean} [props.isLoading=false] - True during save operation
 * @param {boolean} [props.isDeleting=false] - True during delete operation
 * @param {object} props.actionForm - Current form values (deviceId, startTime, endTime, etc.)
 * @param {Function} props.onChange - Callback(fieldName, value) for form changes
 * @param {Array} [props.devices=[]] - Available devices to select from
 * @param {Function} props.sliderToTime - Convert slider value to HH:MM format
 * @param {Function} props.timeToSlider - Convert HH:MM format to slider value
 * @param {Object} [props.errors={}] - Field validation errors
 * @returns {JSX.Element|null} Modal dialog or null if not open
 */
import React from 'react';
import ActionForm from "./components/ActionForm.jsx";

import "../../styles/pages/Actions.css";

function ActionModal({
                         isOpen,
                         isEdit,
                         onClose,
                         onSave,
                         onDelete,
                         errorMessage,
                         isLoading = false,
                         isDeleting = false,
                         ...formProps
                     }) {
    if (!isOpen) return null;

    return (
        <div className={isEdit ? "edit-action-popup" : "create-action-popup"}>
            <div className={isEdit ? "edit-action-popup-window" : "action-popup-window"}>
                {errorMessage && <div className="error-message" data-testid="action-error">{errorMessage}</div>}
                <p className="action-popup-header">
                    {isEdit ? "Aktion bearbeiten" : "Aktion erstellen"}
                </p>

                <ActionForm {...formProps} isEdit={isEdit} disabled={isLoading || isDeleting} />

                <div className="action-popup-buttons">
                    {isEdit && (
                        <div className="actions-delete-button-container">
                            <button
                                className="actions-edit-delete-button"
                                onClick={onDelete}
                                disabled={isDeleting || isLoading}
                                data-testid="action-delete"
                            >
                                {isDeleting ? "Löscht..." : "Löschen"}
                            </button>
                        </div>
                    )}
                    <button onClick={onClose} disabled={isLoading || isDeleting} data-testid="action-cancel">
                        Abbrechen
                    </button>
                    <button
                        className="actions-save-button"
                        onClick={() => onSave(isEdit)}
                        disabled={isLoading || isDeleting}
                        data-testid="action-save"
                    >
                        {isLoading ? (isEdit ? "Speichert..." : "Erstellt...") : (isEdit ? "Speichern" : "Erstellen")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ActionModal;