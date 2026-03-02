/**
 * DeviceForm - Form component for creating/editing household devices
 * Renders type-specific fields based on device type selection.
 * Supports Battery, Consumer, Generator, and PVGenerator types.
 * @param {object} props
 * @param {object} props.deviceForm - Current form field values
 * @param {string} props.deviceForm.name - Device name
 * @param {string} props.deviceForm.type - Device type (Battery|Consumer|Generator|PVGenerator)
 * @param {Function} props.onChange - Callback(fieldName, value) for field changes
 * @param {Function} props.onChange.fieldName - Name of field being changed
 * @param {Function} props.onChange.value - New value for the field
 * @param {Object} [props.errors={}] - Validation errors {fieldName: errorMessage}
 * @param {boolean} [props.isEdit=false] - Edit mode (cannot change device type)
 * @param {boolean} [props.disabled=false] - Disable all form inputs
 * @returns {JSX.Element} Form container with type-specific fields
 */

import React, { useState } from 'react'
import LocationPickerModal from "../../../components/geosearch/LocationPickerModal.jsx";
import { translateDevice } from "../DevicesLogic.js";

/**
 * Helper component for consistent form field rendering with label and error.
 * @param {object} props
 * @param {string} props.label - Field label text
 * @param {string} [props.error] - Validation error message (if any)
 * @param {ReactNode} props.children - Input element(s)
 * @param {string} [props.className=""] - Additional CSS class
 * @returns {JSX.Element}
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
    const isGeneratorType = deviceForm.type === "Generator" || deviceForm.type === "ScheduledGenerator";
    const isGeneratorEdit = isEdit && isGeneratorType;

    /**
     * Receive a selected location and push values into the form via onChange.
     * @param {object|null} location - {label, lat, lng}
     */
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
                        <input name="efficiency" type="number" value={deviceForm.efficiency * 100} onChange={onChange} disabled={disabled} data-testid="battery-efficiency" />
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