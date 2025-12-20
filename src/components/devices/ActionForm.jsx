function ActionForm({ actionForm, onChange }) {
  return (
    <>
      <select name="typ" value={actionForm.typ} onChange={onChange}>
              <option value="Konstant">Konstant</option>
              <option value="Flexibel">Flexibel</option>
            </select>

            <input name="startZeit" placeholder="Start-Zeitpunkt" value={actionForm.startZeit} onChange={onChange} />
            <input name="endZeit" placeholder="End-Zeitpunkt" value={actionForm.endZeit} onChange={onChange} />

            {actionForm.typ === "Konstant" && (
              <>
                <input name="dauer" placeholder="Dauer" value={actionForm.dauer} onChange={onChange} />
                <input name="verbrauchProZeit" placeholder="Verbrauch / Zeit" value={actionForm.verbrauchProZeit} onChange={onChange} />
              </>
            )}

            {actionForm.typ === "Flexibel" && (
              <>
                <input name="gesamtVerbrauch" placeholder="Gesamtverbrauch" value={actionForm.gesamtVerbrauch} onChange={onChange} />
                <input name="maxVerbrauchProZeit" placeholder="Max. Verbrauch / Zeit" value={actionForm.maxVerbrauchProZeit} onChange={onChange} />
              </>
            )}
    </>
  );
}

export default ActionForm;