import React from 'react';
import ActionForm from "./components/ActionForm.jsx";

import "../../styles/pages/Actions.css";

function ActionModal({
                         isOpen,
                         isEdit,
                         onClose,
                         onSave,
                         onDelete,
                         ...formProps
                     }) {
    if (!isOpen) return null;

    return (
        <div className={isEdit ? "edit-action-popup" : "create-action-popup"}>
            <div className={isEdit ? "edit-action-popup-window" : "action-popup-window"}>
                <p className="action-popup-header">
                    {isEdit ? "Aktion bearbeiten" : "Aktion erstellen"}
                </p>

                <ActionForm {...formProps} isEdit={isEdit} />

                <div className="action-popup-buttons">
                    {isEdit && (
                        <button className="actions-edit-delete-button" onClick={onDelete}>
                            Löschen
                        </button>
                    )}
                    <button onClick={onClose}>Abbrechen</button>
                    <button className="actions-save-button" onClick={() => onSave(isEdit)}>
                        {isEdit ? "Speichern" : "Erstellen"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ActionModal;