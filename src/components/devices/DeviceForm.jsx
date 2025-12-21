function DeviceForm({ deviceForm, onChange, errors = {}}) {
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
          <input name="standort" placeholder="Standort" value={deviceForm.standort} onChange={onChange} className={errors.standort ? "input-error" : ""}/>
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
