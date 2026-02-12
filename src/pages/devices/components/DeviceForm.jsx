import React, { useState } from 'react'
import LocationPickerModal from "../../../components/geosearch/LocationPickerModal.jsx";
import { translateDevice } from "../DevicesLogic.js";

/**
 * Interne Hilfskomponente für Labels und Fehlermeldungen
 */
const FormField = ({ label, error, children, className = "" }) => (
    <div className={`input-group ${className}`}>
        <div className="input-label">
            {label}
            {error && <div className="field-error">{error}</div>}
        </div>
        {children}
    </div>
);

function DeviceForm({ deviceForm, onChange, errors = {}, isEdit = false, disabled = false }) {
    const [isMapOpen, setIsMapOpen] = useState(false);

    const handleLocationConfirm = (location) => {
        if (!location) return;
        onChange({
            target: {
                name: 'location_data',
                values: { location: location.label, lat: location.lat, lng: location.lng }
            }
        });
        ['location', 'lat', 'lng'].forEach((key, i) => {
            const vals = [location.label, location.lat, location.lng];
            onChange({ target: { name: key, value: vals[i] } });
        });
        setIsMapOpen(false);
    };

    const handleFileUpload = (event) => {
        onChange({ target: { name: "forecast", value: event.target.files[0] } });
    };

    return (
        <>
            {!isEdit ? (
                <FormField label="Gerätetyp" error={errors.type}>
                    <select name="type" value={deviceForm.type} onChange={onChange} disabled={disabled}>
                        {["Generator", "PVGenerator", "Consumer", "Battery"].map(t => (
                            <option key={t} value={t}>{translateDevice(t)}</option>
                        ))}
                    </select>
                </FormField>
            ) : (
                <div className="device-type-readonly">
                    <strong>Typ:</strong> {translateDevice(deviceForm.type)}
                </div>
            )}

            <FormField label="Name" error={errors.name}>
                <input
                    name="name"
                    value={deviceForm.name}
                    onChange={onChange}
                    disabled={disabled || (isEdit && deviceForm.type === "Consumer")}
                    readOnly={isEdit && deviceForm.type === "Consumer"}
                    className={`${errors.name ? "input-error" : ""} ${isEdit && deviceForm.type === "Consumer" ? "device-type-readonly" : ""}`}
                />
            </FormField>

            {deviceForm.type === "Generator" && (
                <FormField label="Prognose" error={errors.forecast} className="upload-section">
                    <input type="file" accept=".csv" onChange={handleFileUpload} disabled={disabled} />
                    {deviceForm.forecast && <p className="file-info">📄 {deviceForm.forecast.name}</p>}
                </FormField>
            )}

            {deviceForm.type === "PVGenerator" && (
                <>
                    <FormField label="Nennleistung (kWp)" error={errors.ratedPower}>
                        <input name="ratedPower" type="number" value={deviceForm.ratedPower} onChange={onChange} disabled={disabled} />
                    </FormField>

                    <FormField label="Neigungswinkel (°)" error={errors.angleOfInclination}>
                        <input name="angleOfInclination" type="number" value={deviceForm.angleOfInclination} onChange={onChange} disabled={disabled} />
                    </FormField>

                    <FormField label="Ausrichtung">
                        <select name="alignment" value={deviceForm.alignment} onChange={onChange} disabled={disabled}>
                            {["Süd", "Südost", "Südwest", "Ost", "West", "Nordost", "Nordwest", "Nord"].map(dir => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Standort" error={errors.location}>
                        <button type="button" className="device-popup-inputs-button" onClick={() => setIsMapOpen(true)} disabled={disabled}>
                            📍 {deviceForm.location || "Standort wählen"}
                        </button>
                    </FormField>
                </>
            )}

            {deviceForm.type === "Consumer" && (
                <FormField label="Flexibilität" error={errors.flexibility}>
                    {!isEdit ? (
                        <select name="flexibility" value={deviceForm.flexibility} onChange={onChange} disabled={disabled}>
                            <option value="constant">durchlaufen</option>
                            <option value="variable">flexibel</option>
                        </select>
                    ) : (
                        <div className="device-type-readonly">
                            {deviceForm.flexibility === "variable" ? "flexibel" : "durchlaufen"}
                        </div>
                    )}
                </FormField>
            )}

            {deviceForm.type === "Battery" && (
                <div className="battery-grid">
                    <FormField label="Kapazität (kWh)" error={errors.capacity}>
                        <input name="capacity" type="number" value={deviceForm.capacity} onChange={onChange} disabled={disabled} />
                    </FormField>
                    <FormField label="Ladezustand (kWh)" error={errors.currentCharge}>
                        <input name="currentCharge" type="number" value={deviceForm.currentCharge} onChange={onChange} disabled={disabled} />
                    </FormField>
                    <FormField label="Max. Entladung (kW)" error={errors.maxDischarge}>
                        <input name="maxDischarge" type="number" value={deviceForm.maxDischarge} onChange={onChange} disabled={disabled} />
                    </FormField>
                    <FormField label="Max. Ladung (kW)" error={errors.maxChargeRate}>
                        <input name="maxChargeRate" type="number" value={deviceForm.maxChargeRate} onChange={onChange} disabled={disabled} />
                    </FormField>
                    <FormField label="Effizienz (%)" error={errors.efficiency}>
                        <input name="efficiency" type="number" value={deviceForm.efficiency} onChange={onChange} disabled={disabled} />
                    </FormField>
                </div>
            )}

            {isMapOpen && (
                <LocationPickerModal
                    onSelect={handleLocationConfirm}
                    onCancel={() => setIsMapOpen(false)}
                />
            )}
        </>
    );
}

export default DeviceForm;