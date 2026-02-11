import React, { useState} from 'react'
import LocationPickerModal from "../../components/geosearch/LocationPickerModal.jsx";
import translateDevice from "./DevicesLogic.js";

function DeviceForm({ deviceForm, onChange, errors = {}}) {
    const [isMapOpen, setIsMapOpen] = useState(false);

    const handleLocationConfirm = (location) => {
        if (!location) return;

        onChange({
            target: { name: 'location', value: location.label }
        });
        onChange({
            target: { name: 'lat', value: location.lat }
        });

        onChange({
            target: { name: 'lng', value: location.lng }
        });

        setIsMapOpen(false);
    };


    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        onChange({
            target: { name: "forecast", value: file }
        });
        setIsMapOpen(false);

    };

    return (
    <>
      <select name="type" value={deviceForm.type} onChange={onChange} className={errors.type ? "input-error" : ""}>
        <option value="Generator">{translateDevice("Generator")}</option>
        <option value="PVGenerator">{translateDevice("PVGenerator")}</option>
        <option value="Consumer">{translateDevice("Consumer")}</option>
        <option value="Battery">{translateDevice("Battery")}</option>
      </select>

      <div className="input-label">
        Name
        {errors.name && <div className="field-error">{errors.name}</div>}
      </div>
      <input name="name" value={deviceForm.name} onChange={onChange} className={errors.name ? "input-error" : ""}/>


        {deviceForm.type === "Generator" && (
            <div className="upload-section">

                <div className="input-label">Prognose</div>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className={errors.forecast ? "input-error" : ""}

                />
                {deviceForm.forecast && (
                    <p>Ausgewählt: {deviceForm.forecast.name}</p>
                )}
            </div>
        )}

        {deviceForm.type === "PVGenerator" && (
            <>
                <div className="input-label">
                  Nennleistung (kWp)
                  {errors.ratedPower && <div className="field-error">{errors.ratedPower}</div>}
                </div>
                <input name="ratedPower" value={deviceForm.ratedPower} onChange={onChange} className={errors.ratedPower ? "input-error" : ""}/>

                <div className="input-label">
                  Neigungswinkel (°)
                  {errors.angleOfInclination && <div className="field-error">{errors.angleOfInclination}</div>}
                </div>
                <input name="angleOfInclination" value={deviceForm.angleOfInclination} onChange={onChange} className={errors.angleOfInclination ? "input-error" : ""}/>

                <div className="input-label">Ausrichtung</div>
                <select name="alignment" value={deviceForm.alignment} onChange={onChange} className={errors.alignment ? "input-error" : ""}>
                    <option value="Süd">Süd</option>
                    <option value="Südost">Südost</option>
                    <option value="Südwest">Südwest</option>
                    <option value="Ost">Ost</option>
                    <option value="West">West</option>
                    <option value="Nordost">Nordost</option>
                    <option value="Nordwest">Nordwest</option>
                    <option value="Nord">Nord</option>
                </select>

                <div className="input-label">Standort</div>
                <button type="button" className="device-popup-inputs-button" onClick={() => setIsMapOpen(true)}>
                    📍 {deviceForm.location || "Standort wählen"}
                </button>

                {isMapOpen && (
                    <LocationPickerModal
                        onSelect={handleLocationConfirm}
                        onCancel={() => setIsMapOpen(false)}
                    />
                )}
            </>
        )}

      {deviceForm.type === "Consumer" && (
        <>
          <div className="input-label">
            Leistung (kW)
            {errors.power && <div className="field-error">{errors.power}</div>}
          </div>
          <select name="flexibility" value={deviceForm.flexibility} onChange={onChange} className={errors.flexibility ? "input-error" : ""}>
            <option value="constant">durchlaufen</option>
            <option value="variable">flexibel</option>
          </select>
        </>
      )}

        {deviceForm.type === "Battery" && (
            <>
                <div className="input-label">
                    Kapazität (kWh)
                    {errors.capacity && <div className="field-error">{errors.capacity}</div>}
                </div>
                <input name="capacity" value={deviceForm.capacity} onChange={onChange} className={errors.capacity ? "input-error" : ""}/>

                <div className="input-label">
                    Max. Entladung (kW)
                    {errors.maxDischarge && <div className="field-error">{errors.maxDischarge}</div>}
                </div>
                <input name="maxDischarge" value={deviceForm.maxDischarge} onChange={onChange} className={errors.maxDischarge ? "input-error" : ""}/>

                <div className="input-label">
                    Max Charge Rate (kW)
                    {errors.maxChargeRate && <div className="field-error">{errors.maxChargeRate}</div>}
                </div>
                <input name="maxChargeRate" value={deviceForm.maxChargeRate} onChange={onChange} className={errors.maxChargeRate ? "input-error" : ""}/>

                <div className="input-label">
                    Efficiency in %
                    {errors.efficiency && <div className="field-error">{errors.efficiency}</div>}
                </div>
                <input name="efficiency" value={deviceForm.efficiency} onChange={onChange} className={errors.efficiency ? "input-error" : ""}/>

                <div className="input-label">
                    Ladezustand (kWh)
                    {errors.currentCharge && <div className="field-error">{errors.currentCharge}</div>}
                </div>
                <input name="currentCharge" value={deviceForm.currentCharge} onChange={onChange} className={errors.currentCharge ? "input-error" : ""}/>
            </>
        )}

    </>
  );
}

export default DeviceForm;
