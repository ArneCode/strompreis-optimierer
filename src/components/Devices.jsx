import {useState} from 'react';
import './Devices.css';
import Device from './Device.jsx';



function Devices() {
  /*const [devices, setDevices] = useState([{
    typ: 'Erzeuger',
    name: 'PV-1',
    nennleistung: 8.5,
    ausrichtung: "Süd",
    neigungswinkel: 30
  }]);*/
    const [devices, setDevices] = useState([]);

    const[errorMessage, setErrorMessage] = useState("");

    const [openCreateDevice, setOpenCreateDevice] = useState(false);
    const [openEditDevice, setOpenEditDevice] = useState(false);

    const [name, setName] = useState("");
    const [nennleistung, setNennleistung] = useState("");
    const [neigungswinkel, setNeigungswinkel] = useState("");
    const [ausrichtung, setAusrichtung] = useState("");
    const [standort, setStandort] = useState("");
    const [leistung, setLeistung] = useState("");
    const [dauer, setDauer] = useState("");
    const [flexibilität, setFlexibilität] = useState("durchlauf");
    const [kapazität, setKapazität] = useState("");

    const [typ, setTyp] = useState("Erzeuger");

  function addDevice() {
    /*setDevices([
      ...devices, {
        typ: 'Erzeuger',
        name: 'PV-1',
        nennleistung: 8.5,
        ausrichtung: "Süd",
        neigungswinkel: 30
      }
    ]);
    setOpenCreateDevice(false);*/

      let newDevice = { typ, name };
      let valid = true;
      if(!name) valid = false;
      if (typ === "Erzeuger") {
          if (!nennleistung || !neigungswinkel || !ausrichtung || !standort) valid = false;
      } else if (typ === "Verbraucher") {
          if (!leistung || !dauer || !flexibilität) valid = false;
      } else if (typ === "Speicher") {
          if (!kapazität) valid = false;
      }

      if (!valid) {
          setErrorMessage("Bitte fülle alle Felder aus!");
          setTimeout(() => {
              setErrorMessage("");
          }, 3000)
          return;
      }

      if (typ === "Erzeuger") {
          newDevice.nennleistung = nennleistung;
          newDevice.neigungswinkel = neigungswinkel;
          newDevice.ausrichtung = ausrichtung;
          newDevice.standort = standort;

      } else if (typ === "Verbraucher") {
          newDevice.leistung = leistung;
          newDevice.dauer = dauer;
          newDevice.flexibilität = flexibilität;

      } else if (typ === "Speicher") {
          newDevice.kapazität = kapazität;
      }

      setDevices([...devices, newDevice]);

      setOpenCreateDevice(false);
      setName(""); setNennleistung(""); setNeigungswinkel(""); setAusrichtung(""); setStandort("");
      setLeistung(""); setDauer(""); setFlexibilität("durchlauf"); setKapazität("");

  }

  function toggleCreateDevicePopUp() {
    setOpenCreateDevice(!openCreateDevice);
  }

  function toggleEditDevicePopUp() {
    setOpenEditDevice(!openEditDevice);
  }

  function editDevice() {
    toggleEditDevicePopUp();
  }

  return (
    <>
      {openEditDevice &&
        <div className="edit-device-popup">
          <div className="device-popup-window">
            <p className="device-popup-header">
              Gerät bearbeiten
            </p>
            <div
              className="device-popup-inputs"
            >
              <input placeholder="Typ" />
              <input placeholder="Name" />
              <input placeholder="Max-Leistung" />
              <input placeholder="Min-Leistung" />
            </div>
            <div className="device-popup-buttons">
              <button className="devices-edit-delete-button">
                Löschen
              </button>
              <button
                className="devices-edit-cancel-button"
                onClick={toggleEditDevicePopUp}
              >
                Abbrechen
              </button>
              <button
                className="devices-save-button"
                onClick={editDevice}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      }

      {openCreateDevice &&
        <div className="create-device-popup">
          <div className="device-popup-window">
              {errorMessage &&
              <div className="error-message">
                  {errorMessage}
              </div>}
            <p className="device-popup-header">
              Gerät erstellen
            </p>
            <div
              className="device-popup-inputs"
            >
                <select value={typ} onChange={(e) => setTyp(e.target.value)}>
                    <option value="Erzeuger">Erzeuger</option>
                    <option value="Verbraucher">Verbraucher</option>
                    <option value="Speicher">Speicher</option>
                </select>
                <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />


                {typ === "Erzeuger" && (
                    <>
                        <input placeholder="Nennleistung" value={nennleistung} onChange={(e) => setNennleistung(e.target.value)} />
                        <input placeholder="Neigungswinkel" value={neigungswinkel} onChange={(e) => setNeigungswinkel(e.target.value)} />
                        <input placeholder="Ausrichtung" value={ausrichtung} onChange={(e) => setAusrichtung(e.target.value)} />
                        <input placeholder="Standort" value={standort} onChange={(e) => setStandort(e.target.value)} />
                    </>
                )}

                {typ === "Verbraucher" && (
                    <>
                        <input placeholder="Leistung" value={leistung} onChange={(e) => setLeistung(e.target.value)} />
                        <input placeholder="Dauer (min)" value={dauer} onChange={(e) => setDauer(e.target.value)} />
                        <select value={flexibilität} onChange={(e) => setFlexibilität(e.target.value)}>
                            <option value="durchlauf">durchlaufen</option>
                            <option value="flexibel">flexibel</option>
                        </select>
                    </>
                )}

                {typ === "Speicher" && (
                    <input placeholder="Kapazität" value={kapazität} onChange={(e) => setKapazität(e.target.value)} />
                )}

          </div>
            <div className="device-popup-buttons">
              <button
                className="devices-create-cancel-button"
                onClick={toggleCreateDevicePopUp}
              >
                Abbrechen
              </button>
              <button
                className="devices-create-button"
                onClick={addDevice}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      }

      <div className="devices-head">
        <p>Geräte</p>
        <button
          className="new-device-button"
          onClick={toggleCreateDevicePopUp}
        >
          <img className="new-device-plus-image" src="./src/assets/plus.png" />
          Neues Gerät
        </button>
      </div>
      <div className="devices-grid">
        {devices.map((val, key) => {
          return (
            <div onClick={toggleEditDevicePopUp}>
              <Device
                typ={val.typ}
                name={val.name}
                id={key}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

export default Devices;