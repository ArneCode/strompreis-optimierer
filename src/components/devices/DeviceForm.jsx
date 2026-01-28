import React, { useState} from 'react'
import LocationPickerModal from "./LocationPickerModal.jsx";

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

  return (
    <>
      <select name="typ" value={deviceForm.typ} onChange={onChange} className={errors.typ ? "input-error" : ""}>
        <option value="Erzeuger">Erzeuger</option>
        <option value="Verbraucher">Verbraucher</option>
        <option value="Speicher">Speicher</option>
      </select>

      <input name="name" placeholder="Name" value={deviceForm.name} onChange={onChange} className={errors.name ? "input-error" : ""}/>

        {deviceForm.typ === "Erzeuger" && (
            <>
                <input name="nennleistung" placeholder="Nennleistung" value={deviceForm.nennleistung} onChange={onChange} className={errors.nennleistung ? "input-error" : ""}/>
                <input name="neigungswinkel" placeholder="Neigungswinkel" value={deviceForm.neigungswinkel} onChange={onChange} className={errors.neigungswinkel ? "input-error" : ""}/>
                <input name="ausrichtung" placeholder="Ausrichtung" value={deviceForm.ausrichtung} onChange={onChange} className={errors.ausrichtung ? "input-error" : ""}/>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input name="standort" placeholder="Standort wählen..." value={deviceForm.standort || ""} readOnly className={errors.standort ? "input-error" : ""} style={{ flex: 1 }}/>
                    <button type="button"  onClick={() => setIsMapOpen(true)}
                        style={{ cursor: 'pointer', padding: '0 15px' }}>📍 Karte
                    </button>
                </div>

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
          <input name="leistung" placeholder="Leistung" value={deviceForm.leistung} onChange={onChange} className={errors.leistung ? "input-error" : ""}/>
          <input name="dauer" placeholder="Dauer (min)" value={deviceForm.dauer} onChange={onChange} className={errors.dauer ? "input-error" : ""}/>
          <select name="flexibilität" value={deviceForm.flexibilität} onChange={onChange} className={errors.flexibilität ? "input-error" : ""}>
            <option value="durchlauf">durchlaufen</option>
            <option value="flexibel">flexibel</option>
          </select>
        </>
      )}

      {deviceForm.typ === "Speicher" && (
        <input name="kapazität" placeholder="Kapazität" value={deviceForm.kapazität} onChange={onChange} className={errors.kapazität ? "input-error" : ""}/>
      )}
    </>
  );
}

export default DeviceForm;
