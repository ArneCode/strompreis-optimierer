import React, { useState} from 'react'
import LocationPickerModal from "../geosearch/LocationPickerModal.jsx";

function DeviceForm({ deviceForm, onChange, errors = {}}) {
    const [isMapOpen, setIsMapOpen] = useState(false);

    const handleLocationConfirm = (location) => {
        if (!location) return;

        onChange({
            target: { name: 'standort', value: location.label }
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
            target: { name: "prognose", value: file }
        });
        setIsMapOpen(false);

    };

    return (
    <>
      <select name="typ" value={deviceForm.typ} onChange={onChange} className={errors.typ ? "input-error" : ""}>
        <option value="Erzeuger">Erzeuger</option>
        <option value="PVAnlage">PVAnlage</option>
        <option value="Verbraucher">Verbraucher</option>
        <option value="Speicher">Speicher</option>
      </select>

      <div className="input-label">
        Name
        {errors.name && <div className="field-error">{errors.name}</div>}
      </div>
      <input name="name" placeholder="Name" value={deviceForm.name} onChange={onChange} className={errors.name ? "input-error" : ""}/>


        {deviceForm.typ === "Erzeuger" && (
            <div className="upload-section">

                <div className="input-label">Prognose</div>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className={errors.prognose ? "input-error" : ""}

                />
                {deviceForm.prognose && (
                    <p>Ausgewählt: {deviceForm.prognose.name}</p>
                )}
            </div>
        )}

        {deviceForm.typ === "PVAnlage" && (
            <>
                <div className="input-label">
                  Nennleistung (kWp)
                  {errors.nennleistung && <div className="field-error">{errors.nennleistung}</div>}
                </div>
                <input name="nennleistung" placeholder="Nennleistung (kWp)" value={deviceForm.nennleistung} onChange={onChange} className={errors.nennleistung ? "input-error" : ""}/>

                <div className="input-label">
                  Neigungswinkel (°)
                  {errors.neigungswinkel && <div className="field-error">{errors.neigungswinkel}</div>}
                </div>
                <input name="neigungswinkel" placeholder="Neigungswinkel °" value={deviceForm.neigungswinkel} onChange={onChange} className={errors.neigungswinkel ? "input-error" : ""}/>

                <div className="input-label">Ausrichtung</div>
                <select name="ausrichtung" value={deviceForm.ausrichtung} onChange={onChange} className={errors.ausrichtung ? "input-error" : ""}>
                    <option value="Süd">Süd</option>
                    <option value="Südost">Südost</option>
                    <option value="Südwest">Südwest</option>
                    <option value="Ost">Ost</option>
                    <option value="West">West</option>
                    <option value="Nordost">Nordost</option>
                    <option value="Nordwest">Nordwest</option>
                    <option value="Nord">Nord</option>
                    <option value="Ost-West">Ost-West</option>
                </select>

                <div className="input-label">Standort</div>
                <button type="button" className="device-popup-inputs-button" onClick={() => setIsMapOpen(true)}>
                    📍 {deviceForm.standort || "Standort wählen"}
                </button>

                {isMapOpen && (
                    <LocationPickerModal
                        onSelect={handleLocationConfirm}
                        onCancel={() => setIsMapOpen(false)}
                    />
                )}
            </>
        )}

      {deviceForm.typ === "Verbraucher" && (
        <>
          <div className="input-label">
            Leistung
            {errors.leistung && <div className="field-error">{errors.leistung}</div>}
          </div>
          <input name="leistung" placeholder="Leistung" value={deviceForm.leistung} onChange={onChange} className={errors.leistung ? "input-error" : ""}/>

          <div className="input-label">
            Dauer
            {errors.dauer && <div className="field-error">{errors.dauer}</div>}
          </div>
          <input name="dauer" placeholder="Dauer (min)" value={deviceForm.dauer} onChange={onChange} className={errors.dauer ? "input-error" : ""}/>

          <div className="input-label">
            Flexibilität
          </div>
          <select name="flexibilität" value={deviceForm.flexibilität} onChange={onChange} className={errors.flexibilität ? "input-error" : ""}>
            <option value="durchlauf">durchlaufen</option>
            <option value="flexibel">flexibel</option>
          </select>
        </>
      )}

      {deviceForm.typ === "Speicher" && (
        <>
            <div className="input-label">
              Kapazität
              {errors.kapazität && <div className="field-error">{errors.kapazität}</div>}
            </div>
            <input name="kapazität" placeholder="Kapazität" value={deviceForm.kapazität} onChange={onChange} className={errors.kapazität ? "input-error" : ""}/>


            <div className="input-label">
                Max. Entladung (kW)
                {errors.maxEntladung && <div className="field-error">{errors.maxEntladung}</div>}
            </div>
            <input name="maxEntladung" placeholder="maxEntladung (kW)" value={deviceForm.maxEntladung} onChange={onChange} className={errors.maxEntladung ? "input-error" : ""}/>
        </>
      )}
    </>
  );
}

export default DeviceForm;
