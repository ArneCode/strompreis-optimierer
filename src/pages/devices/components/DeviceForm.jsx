import React, { useState } from 'react'
import LocationPickerModal from "../../../components/geosearch/LocationPickerModal.jsx";
import { translateDevice } from "../DevicesLogic.js";

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
    const isGeneratorType = deviceForm.type === "Generator" || deviceForm.type === "ScheduledGenerator";
    const isGeneratorEdit = isEdit && isGeneratorType;

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
                    <select
                        name="type"
                        value={deviceForm.type}
                        onChange={onChange}
                        disabled={disabled}
                        data-testid="device-type"
                    >
                        {["Generator", "RandomGenerator", "PVGenerator", "Consumer", "Battery"].map(t => (
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
                    disabled={disabled || isGeneratorEdit || (isEdit && deviceForm.type === "Consumer")}
                    readOnly={isGeneratorEdit || (isEdit && deviceForm.type === "Consumer")}
                    className={`${errors.name ? "input-error" : ""} ${(isGeneratorEdit || (isEdit && deviceForm.type === "Consumer")) ? "device-type-readonly" : ""}`}
                    data-testid="device-name"
                />
            </FormField>

            {isGeneratorType && (
                <FormField label="Prognose" error={errors.forecast} className="upload-section">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={disabled || isGeneratorEdit}
                        data-testid="device-forecast-upload"
                    />
                    {deviceForm.forecast && (
                        <p className="file-info" data-testid="device-forecast-file">
                            📄 {deviceForm.forecast.name}
                        </p>
                    )}
                    <a
                        href="/beispiel-generator.csv"
                        download="beispiel-generator.csv"
                        className="devices-save-button download-example-csv-button"
                        data-testid="device-forecast-example"
                    >
                        Beispiel-CSV herunterladen
                    </a>
                </FormField>
            )}

            {deviceForm.type === "RandomGenerator" && (
                <FormField label="Nennleistung (kW)" error={errors.peakPower}>
                    <input
                        name="peakPower"
                        type="number"
                        value={deviceForm.peakPower}
                        onChange={onChange}
                        disabled={disabled}
                        data-testid="device-peakPower"
                    />
                </FormField>
            )}

            {deviceForm.type === "PVGenerator" && (
                <>
                    <FormField label="Nennleistung (kWp)" error={errors.ratedPower}>
                        <input
                            name="ratedPower"
                            type="number"
                            value={deviceForm.ratedPower}
                            onChange={onChange}
                            disabled={disabled}
                            data-testid="device-ratedPower"
                        />
                    </FormField>

                    <FormField label="Neigungswinkel (°)" error={errors.angleOfInclination}>
                        <input
                            name="angleOfInclination"
                            type="number"
                            value={deviceForm.angleOfInclination}
                            onChange={onChange}
                            disabled={disabled}
                            data-testid="device-angle"
                        />
                    </FormField>

                    <FormField label="Ausrichtung">
                        <select
                            name="alignment"
                            value={deviceForm.alignment}
                            onChange={onChange}
                            disabled={disabled}
                            data-testid="device-alignment"
                        >
                            {["Süd", "Südost", "Südwest", "Ost", "West", "Nordost", "Nordwest", "Nord"].map(dir => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Standort" error={errors.location}>
                        <button
                            type="button"
                            className="device-popup-inputs-button"
                            onClick={() => setIsMapOpen(true)}
                            disabled={disabled}
                            data-testid="device-location-open"
                        >
                            📍 {deviceForm.location || "Standort wählen"}
                        </button>
                    </FormField>
                </>
            )}

            {deviceForm.type === "Consumer" && (
                <FormField label="Flexibilität" error={errors.flexibility}>
                    {!isEdit ? (
                        <select
                            name="flexibility"
                            value={deviceForm.flexibility}
                            onChange={onChange}
                            disabled={disabled}
                            data-testid="device-flexibility"
                        >
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
                        <input name="capacity" type="number" value={deviceForm.capacity} onChange={onChange} disabled={disabled} data-testid="battery-capacity" />
                    </FormField>
                    <FormField label="Ladezustand (kWh)" error={errors.currentCharge}>
                        <input name="currentCharge" type="number" value={deviceForm.currentCharge} onChange={onChange} disabled={disabled} data-testid="battery-currentCharge" />
                    </FormField>
                    <FormField label="Max. Entladung (kW)" error={errors.maxDischarge}>
                        <input name="maxDischarge" type="number" value={deviceForm.maxDischarge} onChange={onChange} disabled={disabled} data-testid="battery-maxDischarge" />
                    </FormField>
                    <FormField label="Max. Ladung (kW)" error={errors.maxChargeRate}>
                        <input name="maxChargeRate" type="number" value={deviceForm.maxChargeRate} onChange={onChange} disabled={disabled} data-testid="battery-maxChargeRate" />
                    </FormField>
                    <FormField label="Effizienz (%)" error={errors.efficiency}>
                        <input name="efficiency" type="number" value={deviceForm.efficiency} onChange={onChange} disabled={disabled} data-testid="battery-efficiency" />
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