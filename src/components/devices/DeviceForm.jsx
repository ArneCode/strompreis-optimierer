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

      {errors.name && <div className="field-error">{errors.name}</div>}
      <input name="name" placeholder="Name" value={deviceForm.name} onChange={onChange} className={errors.name ? "input-error" : ""}/>


        {deviceForm.typ === "Erzeuger" && (
            <div className="upload-section">

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
                {errors.nennleistung && <div className="field-error">{errors.nennleistung}</div>}
                <input name="nennleistung" placeholder="Nennleistung (kWp)" value={deviceForm.nennleistung} onChange={onChange} className={errors.nennleistung ? "input-error" : ""}/>

                {errors.neigungswinkel && <div className="field-error">{errors.neigungswinkel}</div>}
                <input name="neigungswinkel" placeholder="Neigungswinkel °" value={deviceForm.neigungswinkel} onChange={onChange} className={errors.neigungswinkel ? "input-error" : ""}/>

                {errors.ausrichtung && <div className="field-error">{errors.ausrichtung}</div>}
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
          {errors.leistung && <div className="field-error">{errors.leistung}</div>}
          <input name="leistung" placeholder="Leistung" value={deviceForm.leistung} onChange={onChange} className={errors.leistung ? "input-error" : ""}/>

          {errors.dauer && <div className="field-error">{errors.dauer}</div>}
          <input name="dauer" placeholder="Dauer (min)" value={deviceForm.dauer} onChange={onChange} className={errors.dauer ? "input-error" : ""}/>

          {errors.flexibilität && <div className="field-error">{errors.flexibilität}</div>}
          <select name="flexibilität" value={deviceForm.flexibilität} onChange={onChange} className={errors.flexibilität ? "input-error" : ""}>
            <option value="durchlauf">durchlaufen</option>
            <option value="flexibel">flexibel</option>
          </select>
        </>
      )}

      {deviceForm.typ === "Speicher" && (
        <>
            {errors.kapazität && <div className="field-error">{errors.kapazität}</div>}
            <input name="kapazität" placeholder="Kapazität" value={deviceForm.kapazität} onChange={onChange} className={errors.kapazität ? "input-error" : ""}/>
        </>
      )}
    </>
  );
}

export default DeviceForm;
