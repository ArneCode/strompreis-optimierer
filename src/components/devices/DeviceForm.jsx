function DeviceForm({ deviceForm, onChange }) {
  return (
    <>
      <select name="typ" value={deviceForm.typ} onChange={onChange}>
        <option value="Erzeuger">Erzeuger</option>
        <option value="Verbraucher">Verbraucher</option>
        <option value="Speicher">Speicher</option>
      </select>

      <input name="name" placeholder="Name" value={deviceForm.name} onChange={onChange} />

      {deviceForm.typ === "Erzeuger" && (
        <>
          <input name="nennleistung" placeholder="Nennleistung" value={deviceForm.nennleistung} onChange={onChange} />
          <input name="neigungswinkel" placeholder="Neigungswinkel" value={deviceForm.neigungswinkel} onChange={onChange} />
          <input name="ausrichtung" placeholder="Ausrichtung" value={deviceForm.ausrichtung} onChange={onChange} />
          <input name="standort" placeholder="Standort" value={deviceForm.standort} onChange={onChange} />
        </>
      )}

      {deviceForm.typ === "Verbraucher" && (
        <>
          <input name="leistung" placeholder="Leistung" value={deviceForm.leistung} onChange={onChange} />
          <input name="dauer" placeholder="Dauer (min)" value={deviceForm.dauer} onChange={onChange} />
          <select name="flexibilität" value={deviceForm.flexibilität} onChange={onChange}>
            <option value="durchlauf">durchlaufen</option>
            <option value="flexibel">flexibel</option>
          </select>
        </>
      )}

      {deviceForm.typ === "Speicher" && (
        <input name="kapazität" placeholder="Kapazität" value={deviceForm.kapazität} onChange={onChange} />
      )}
    </>
  );
}

export default DeviceForm;
