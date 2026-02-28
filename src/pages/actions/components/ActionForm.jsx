import React from 'react';
import TimeRangeSlider from "../../../components/slider/TimeRangeSlider.jsx";

/**
 * Helper component for consistent form field rendering with label and error.
 * @param {object} props
 * @param {string} props.label - Field label text
 * @param {string} [props.error] - Validation error message
 * @param {ReactNode} props.children - Input element
 * @returns {JSX.Element}
 */
const FormField = ({ label, error, children }) => (
    <div className="input-group">
        <label className="input-label">
            {label}
            {error && <span className="field-error"> {error}</span>}
        </label>
        {children}
    </div>
);

/**
 * ActionForm - Form for creating/editing device actions with time range selector
 * Supports both constant and variable flexibility actions with dynamic field rendering.
 * @param {object} props - Component props
 * @param {object} props.actionForm - Current form values (deviceId, startTime, endTime, duration, consumption, totalConsumption)
 * @param {Function} props.onChange - Callback(fieldName, value) for field changes
 * @param {Function} props.onTimeBlur - Called when time input loses focus
 * @param {Array} [props.devices=[]] - Available devices to select from
 * @param {boolean} [props.isEdit=false] - Edit mode (cannot change device)
 * @param {Object} [props.errors={}] - Validation errors {fieldName: errorMessage}
 * @param {boolean} [props.disabled=false] - Disable all inputs
 * @param {Function} props.sliderToTime - Convert slider value to HH:MM string
 * @param {Function} props.timeToSlider - Convert HH:MM string to slider value
 * @param {string} [props.startLabel] - Label for start time field
 * @param {string} [props.endLabel] - Label for end time field
 * @param {string} [props.currentTimeStr] - Current time in HH:MM format
 * @returns {JSX.Element} Form container
 */
function ActionForm({
                         actionForm,
                         onChange,
                         onTimeBlur,
                         devices = [],
                         isEdit = false,
                         errors = {},
                         disabled = false,
                         sliderToTime,
                         timeToSlider,
                         startLabel,
                         endLabel,
                         currentTimeStr
                     }) {

    const selectedDevice = devices?.find(d => String(d.id) === String(actionForm.deviceId));
    const isVariable = selectedDevice?.flexibility === "variable";
    const hasError = !!(errors.startTime || errors.endTime || errors.duration);

    return (
        <div className="action-popup-inputs" data-testid="action-form">

            {!isEdit && (
                <FormField label="Gerät auswählen" error={errors.deviceId}>
                    <select
                        name="deviceId"
                        value={actionForm.deviceId || ""}
                        onChange={onChange}
                        disabled={disabled}
                        className={`action-device-select ${errors.deviceId ? "input-error" : ""}`}
                        data-testid="action-device"
                    >
                        <option value="">Verbraucher wählen</option>
                        {devices
                            ?.filter(device => device.type === "Consumer")
                            .map((device) => (
                                <option key={device.id} value={device.id}>
                                    {device.name} ({device.flexibility === "variable" ? "Flexibel" : "Konstant"})
                                </option>
                            ))}
                    </select>
                </FormField>
            )}

            <FormField label={`Frühester Start ${startLabel}`} error={errors.startTime}>
                <input
                    type="time"
                    name="startTime"
                    value={actionForm.startTime}
                    onChange={onChange}
                    onBlur={onTimeBlur}
                    disabled={disabled}
                    className={errors.startTime ? "input-error" : ""}
                    step={300}
                    data-testid="action-startTime"
                />
            </FormField>

            <FormField label={`Spätestes Ende ${endLabel}`} error={errors.endTime}>
                <input
                    type="time"
                    name="endTime"
                    value={actionForm.endTime}
                    onChange={onChange}
                    onBlur={onTimeBlur}
                    disabled={disabled}
                    className={errors.endTime ? "input-error" : ""}
                    step={300}
                    data-testid="action-endTime"
                />
            </FormField>

            {/* 3. Visual Slider */}
            <div className="action-slider" data-testid="action-time-slider">
                <TimeRangeSlider
                    startTime={actionForm.startTime}
                    endTime={actionForm.endTime}
                    onChange={(start, end) => {
                        onChange({ target: { name: 'startTime', value: start } });
                        onChange({ target: { name: 'endTime', value: end } });
                    }}
                    timeToSlider={timeToSlider}
                    sliderToTime={sliderToTime}
                    hasError={hasError}
                    currentTimeStr={currentTimeStr}
                    disabled={disabled}
                />
            </div>

            {/* 4. Dynamic Fields (Consumption / Duration) */}
            {selectedDevice && (
                <div className="dynamic-fields-container" data-testid="action-dynamic-fields">
                    {isVariable ? (
                        <FormField label="Gesamtverbrauch (Wh)" error={errors.totalConsumption}>
                            <input
                                type="number"
                                name="totalConsumption"
                                value={actionForm.totalConsumption || ""}
                                onChange={onChange}
                                disabled={disabled}
                                className={errors.totalConsumption ? "input-error" : ""}
                                placeholder="z.B. 2500"
                                data-testid="action-totalConsumption"
                            />
                        </FormField>
                    ) : (
                        <FormField label="Dauer (min)" error={errors.duration}>
                            <input
                                type="number"
                                name="duration"
                                value={actionForm.duration || ""}
                                onChange={onChange}
                                disabled={disabled}
                                className={errors.duration ? "input-error" : ""}
                                placeholder="z.B. 60"
                                step="5"
                                data-testid="action-duration"
                            />
                        </FormField>
                    )}

                    <FormField
                        label={isVariable ? "Max. Leistung (W)" : "Leistung (W)"}
                        error={errors.consumption}
                    >
                        <input
                            type="number"
                            name="consumption"
                            value={actionForm.consumption || ""}
                            onChange={onChange}
                            disabled={disabled}
                            className={errors.consumption ? "input-error" : ""}
                            placeholder="z.B. 1000"
                            data-testid="action-consumption"
                        />
                    </FormField>
                </div>
            )}
        </div>
    );
}

export default ActionForm;