import {useState} from 'react';
import './Devices.css';
import Device from './Device.jsx';



function Devices() {
    const [devices, setDevices] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const[errorMessage, setErrorMessage] = useState("");



    const [openCreateDevice, setOpenCreateDevice] = useState(false);
    const [openEditDevice, setOpenEditDevice] = useState(false);

    const [name, setName] = useState("");
    const [nennleistung, setNennleistung] = useState("");
    const [neigungswinkel, setNeigungswinkel] = useState("");
    const [ausrichtung, setAusrichtung] = useState("");
    const [standort, setStandort] = useState("");
    const [kapazität, setKapazität] = useState("");

    const [typ, setTyp] = useState("Erzeuger");

    //Action States
    const [actions, setActions] = useState([]);
    const [actionType, setActionType] = useState("Konstant");

    const [startZeit, setStartZeit] = useState("");
    const [endZeit, setEndZeit] = useState("");
    const [actionDauer, setActionDauer] = useState("");
    const [verbrauchProZeit, setVerbrauchProZeit] = useState("");
    const [gesamtVerbrauch, setGesamtVerbrauch] = useState("");
    const [maxVerbrauchProZeit, setMaxVerbrauchProZeit] = useState("");

    const [openCreateAction, setOpenCreateAction] = useState(false);



  function deleteDevice() {
      if (editIndex === null) return;
      const newDevices = devices.filter((_, idx) => idx !== editIndex);
      setDevices(newDevices);
      toggleEditDevicePopUp();
      resetAll();
  }

  function addDevice() {

      let newDevice = { typ, name };
      let valid = true;
      if(!name) valid = false;
      if (typ === "Erzeuger") {
          if (!nennleistung || !neigungswinkel || !ausrichtung || !standort) valid = false;

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
          setOpenCreateDevice(false);
          setOpenCreateAction(true);
          return;

      } else if (typ === "Speicher") {
          newDevice.kapazität = kapazität;
      }

      setDevices([...devices, newDevice]);

      setOpenCreateDevice(false);
      setName(""); setNennleistung(""); setNeigungswinkel(""); setAusrichtung(""); setStandort("");
      setKapazität("");

  }

  function addAction() {
    let newAction = {type: actionType, startZeit, endZeit};

    if (actionType === "Konstant") {
      if (!actionDauer || !verbrauchProZeit) {
        setErrorMessage("Alle Felder ausfüllen");
        return;
      }
      newAction.dauer = actionDauer;
      newAction.verbrauchProZeit = verbrauchProZeit;
    }

    if (actionType === "Flexibel") {
      if (!gesamtVerbrauch || !maxVerbrauchProZeit) {
        setErrorMessage("Alle Felder ausfüllen");
        return;
        }
        newAction.gesamtVerbrauch = gesamtVerbrauch;
        newAction.maxVerbrauchProZeit = maxVerbrauchProZeit;
    }

    const consumerDevice = {
      typ: "Verbraucher",
      name,
      actions: [...actions, newAction]
    };

    setDevices([...devices, consumerDevice]);

    resetAll();
  }

  function resetDeviceForm() {
    setName("");
    setTyp("Erzeuger");
    setOpenCreateDevice(false);
  }

  function resetAll() {
    resetDeviceForm();
    setActions([]);
    setOpenCreateAction(false);
    setStartZeit("");
    setEndZeit("");
    setActionDauer("");
    setVerbrauchProZeit("");
    setGesamtVerbrauch("");
    setMaxVerbrauchProZeit("");

    setName(""); setNennleistung(""); setNeigungswinkel(""); setAusrichtung(""); setStandort("");
    setKapazität("");
  }

  function toggleCreateDevicePopUp() {
    setOpenCreateDevice(!openCreateDevice);
  }

  function toggleEditDevicePopUp() {
    setOpenEditDevice(!openEditDevice);
  }

  function loadEditDevice(key) {
    setEditIndex(key);

    const device = devices[key];

    setName(device.name);
    setTyp(device.typ);

    if (device.typ === "Erzeuger") {
      setNennleistung(device.nennleistung);
      setNeigungswinkel(device.neigungswinkel);
      setAusrichtung(device.ausrichtung);
      setStandort(device.standort);


    } else if (device.typ === "Speicher") {
      setKapazität(device.kapazität);

    }
  }

  function editDevice() {
    if (editIndex === null) return;

    const updatedDevices = [...devices];

    updatedDevices[editIndex] = {
      ...updatedDevices[editIndex],
      name: name,
      typ: typ,
      nennleistung: nennleistung,
      neigungswinkel: neigungswinkel,
      ausrichtung: ausrichtung,
      standort: standort,
      kapazität: kapazität
    }

    setDevices(updatedDevices);
    resetAll();
    setOpenEditDevice(false);
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



                {typ === "Speicher" && (
                    <input placeholder="Kapazität" value={kapazität} onChange={(e) => setKapazität(e.target.value)} />
                )}

          </div>
            <div className="device-popup-buttons">
              <button className="devices-edit-delete-button"
              onClick={() => {deleteDevice(editIndex)}}>
                Löschen
              </button>
              <button
                className="devices-edit-cancel-button"
                onClick={() => {
                  toggleEditDevicePopUp();
                  resetAll();
                }}
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


                {typ === "Speicher" && (
                    <input placeholder="Kapazität" value={kapazität} onChange={(e) => setKapazität(e.target.value)} />
                )}

          </div>
            <div className="device-popup-buttons">
              <button
                className="devices-create-cancel-button"
                onClick={() => {
                  toggleCreateDevicePopUp();
                  resetAll();
                }}
              >
                Abbrechen
              </button>
              <button
                className="devices-create-button"
                onClick={addDevice}
              >
                Weiter
              </button>
            </div>
          </div>
        </div>
      }

      {openCreateAction && (
        <div className="create-device-popup">
          <div className="device-popup-window">
          <h3 className="create-action-header">Gerät erstellen: Aktion</h3>

          <div className="create-action-inputs">
            <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
          <option value="Konstant">Konstant</option>
          <option value="Flexibel">Flexibel</option>
          </select>


          <input placeholder="Start-Zeitpunkt" value={startZeit} onChange={(e) => setStartZeit(e.target.value)} />
          <input placeholder="End-Zeitpunkt" value={endZeit} onChange={(e) => setEndZeit(e.target.value)} />


          {actionType === "Konstant" && (
          <>
          <input placeholder="Dauer" value={actionDauer} onChange={(e) => setActionDauer(e.target.value)} />
          <input placeholder="Verbrauch / Zeit" value={verbrauchProZeit} onChange={(e) => setVerbrauchProZeit(e.target.value)} />
          </>
          )}


          {actionType === "Flexibel" && (
          <>
          <input placeholder="Gesamtverbrauch" value={gesamtVerbrauch} onChange={(e) => setGesamtVerbrauch(e.target.value)} />
          <input placeholder="Max. Verbrauch / Zeit" value={maxVerbrauchProZeit} onChange={(e) => setMaxVerbrauchProZeit(e.target.value)} />
          </>
          )}
          </div>
          
          

          <div className="create-action-buttons">
            <button onClick={resetAll}>Abbrechen</button>
            <button onClick={addAction} className="devices-create-button">Gerät erstellen</button>
          </div>
          </div>
        </div>
      )}

      

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
            <div onClick={()=> {toggleEditDevicePopUp(); loadEditDevice(key)}}> 
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