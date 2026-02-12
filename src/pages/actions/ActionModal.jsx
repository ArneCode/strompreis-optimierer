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
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                <p className="action-popup-header">
                    {isEdit ? "Aktion bearbeiten" : "Aktion erstellen"}
                </p>

                <ActionForm {...formProps} isEdit={isEdit} disabled={isLoading || isDeleting} />

                <div className="action-popup-buttons">
                    {isEdit && (
                        <button
                            className="actions-edit-delete-button"
                            onClick={onDelete}
                            disabled={isDeleting || isLoading}
                        >
                            {isDeleting ? "Löscht..." : "Löschen"}
                        </button>
                    )}
                    <button onClick={onClose} disabled={isLoading || isDeleting}>
                        Abbrechen
                    </button>
                    <button
                        className="actions-save-button"
                        onClick={() => onSave(isEdit)}
                        disabled={isLoading || isDeleting}
                    >
                        {isLoading ? (isEdit ? "Speichert..." : "Erstellt...") : (isEdit ? "Speichern" : "Erstellen")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ActionModal;