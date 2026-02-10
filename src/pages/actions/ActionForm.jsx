import React from 'react';
import TimeRangeSlider from "../../components/TimeRangeSlider.jsx";

function ActionForm({
                        actionForm,
                        onChange,
                        devices,
                        isEdit = false,
                        errors = {},
                        sliderToTime,
                        timeToSlider,
                        startLabel,
                        endLabel,
                        currentTimeStr
                    }) {

    const selectedDevice = devices.find(d => d.name === actionForm.deviceName);
    const isVariable = selectedDevice?.flexibility === "variable";

    const hasError = !!(errors.startTime || errors.endTime || errors.duration);

    return (
        <div className="action-popup-inputs">
            {!isEdit && (
                <div className="input-group">
                    <div className="input-label">
                        Gerät auswählen
                        {errors.deviceName && <span className="field-error">{errors.deviceName}</span>}
                    </div>
                    <select
                        name="deviceName"
                        value={actionForm.deviceName}
                        onChange={onChange}
                        className={`action-device-select ${errors.deviceName ? "input-error" : ""}`}
                    >
                        <option value="">Verbraucher wählen</option>
                        {devices
                            .filter(device => device.type === "Consumer")
                            .map((device, idx) => (
                                <option key={idx} value={device.name}>
                                    {device.name} ({device.flexibility === "variable" ? "Flexibel" : "Konstant"})
                                </option>
                            ))}
                    </select>
                </div>
            )}

            <div className="input-label">
                Frühester Start {startLabel}
                {errors.startTime && <span className="field-error">{errors.startTime}</span>}
            </div>
            <input
                type="time"
                name="startTime"
                value={actionForm.startTime}
                onChange={onChange}
                className={errors.startTime ? "input-error" : ""}
            />

            <div className="input-label">
                Spätestes Ende {endLabel}
                {errors.endTime && <span className="field-error">{errors.endTime}</span>}
            </div>
            <input
                type="time"
                name="endTime"
                value={actionForm.endTime}
                onChange={onChange}
                className={errors.endTime ? "input-error" : ""}
            />

            <div className="action-slider">
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
                />
            </div>

            {selectedDevice && (
                <>
                    {isVariable ? (
                        <div className="input-group-dynamic">
                            <div className="input-label">
                                Gesamtverbrauch (Wh)
                                {errors.totalConsumption && <span className="field-error">{errors.totalConsumption}</span>}
                            </div>
                            <input
                                type="number"
                                name="totalConsumption"
                                value={actionForm.totalConsumption || ""}
                                onChange={onChange}
                                className={errors.totalConsumption ? "input-error" : ""}
                            />
                        </div>
                    ) : (
                        <div className="input-group-dynamic">
                            <div className="input-label">
                                Dauer (min)
                                {errors.duration && <span className="field-error">{errors.duration}</span>}
                            </div>
                            <input
                                type="number"
                                name="duration"
                                value={actionForm.duration || ""}
                                onChange={onChange}
                                className={errors.duration ? "input-error" : ""}
                            />
                        </div>
                    )}
                    <div className="input-label">
                        {isVariable ? "Max. Leistung (W)" : "Leistung (W)"}
                        {errors.consumption && <span className="field-error">{errors.consumption}</span>}
                    </div>
                    <input
                        type="number"
                        name="consumption"
                        value={actionForm.consumption || ""}
                        onChange={onChange}
                        className={errors.consumption ? "input-error" : ""}
                    />
                </>
            )}
        </div>
    );
}

export default ActionForm;