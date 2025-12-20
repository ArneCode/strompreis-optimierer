import {useState} from 'react';
import './Devices.css';
import Device from './Device.jsx';
import DeviceForm from './DeviceForm';
import ActionForm from './ActionForm';



function Devices({devices, setDevices}) {
    const [actions, setActions] = useState([]);

    const INITIAL_DEVICE_FORM = {
      name: "",
      typ: "Erzeuger",
      nennleistung: "",
      neigungswinkel: "",
      ausrichtung: "",
      standort: "",
      leistung: "",
      dauer: "",
      flexibilität: "durchlauf",
      kapazität: ""
    };

    const INITIAL_ACTION_FORM = {
      typ: "Konstant",
      startZeit: "",
      endZeit: "",
      dauer: "",
      verbrauchProZeit: "",
      gesamtVerbrauch: "",
      maxVerbrauchProZeit: ""
    };

    const REQUIRED_FIELDS = {
      Erzeuger: ["nennleistung", "neigungswinkel", "ausrichtung", "standort"],
      Verbraucher: ["leistung", "dauer", "flexibilität"],
      Speicher: ["kapazität"]
    };

    const [deviceForm, setDeviceForm] = useState(INITIAL_DEVICE_FORM);
    const [actionForm, setActionForm] = useState(INITIAL_ACTION_FORM);

    const[errorMessage, setErrorMessage] = useState("");
    const [editIndex, setEditIndex] = useState(null);

    const [openCreateDevice, setOpenCreateDevice] = useState(false);
    const [openEditDevice, setOpenEditDevice] = useState(false);
    const [openCreateAction, setOpenCreateAction] = useState(false);

  function handleDeviceFormChange(e) {
    const {name, value} = e.target;
    setDeviceForm(prev => ({...prev, [name]: value}));
  }

  function handleActionFormChange(e) {
    const { name, value } = e.target;
    setActionForm(prev => ({...prev, [name]: value}));
  }

  function isValidDevice(form) {
    if (!form.name) return false;
    
    return REQUIRED_FIELDS[form.typ].every(
      field => form[field]
    );
  }
  

  function deleteDevice() {
    if (editIndex === null) return;
    const newDevices = devices.filter((_, idx) => idx !== editIndex);
    setDevices(newDevices);
    toggleEditDevicePopUp();
    resetAll();
  }

  function addDevice() {
      let newDevice = {
        typ: deviceForm.typ,
        name: deviceForm.name
      }

      if (!isValidDevice(deviceForm)) {
        setErrorMessage("Bitte fülle alle Felder aus!");
        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
        return;
      }

      if (deviceForm.typ === "Erzeuger") {
          newDevice.nennleistung = deviceForm.nennleistung;
          newDevice.neigungswinkel = deviceForm.neigungswinkel;
          newDevice.ausrichtung = deviceForm.ausrichtung;
          newDevice.standort = deviceForm.standort;

      } else if (deviceForm.typ === "Verbraucher") {
          newDevice.leistung = deviceForm.leistung;
          newDevice.dauer = deviceForm.dauer;
          newDevice.flexibilität = deviceForm.flexibilität;
          setOpenCreateDevice(false);
          setOpenCreateAction(true);
          return;

      } else if (deviceForm.typ === "Speicher") {
          newDevice.kapazität = deviceForm.kapazität;
      }

      setDevices([...devices, newDevice]);

      resetDeviceForm();
      setOpenCreateDevice(false);
  }

  function addAction() {
    //let newAction = {type: actionType, startZeit, endZeit};
    let newAction = {
      typ: actionForm.typ,
      startZeit: actionForm.startZeit,
      endZeit: actionForm.endZeit,
    }

    if (actionForm.typ === "Konstant") {
      if (!actionForm.dauer || !actionForm.verbrauchProZeit) {
        setErrorMessage("Alle Felder ausfüllen");
        return;
      }
      newAction.dauer = actionForm.dauer;
      newAction.verbrauchProZeit = actionForm.verbrauchProZeit;
    }

    if (actionForm.typ === "Flexibel") {
      if (!actionForm.gesamtVerbrauch || !actionForm.maxVerbrauchProZeit) {
        setErrorMessage("Alle Felder ausfüllen");
        return;
      }
      newAction.gesamtVerbrauch = actionForm.gesamtVerbrauch;
      newAction.maxVerbrauchProZeit = actionForm.maxVerbrauchProZeit;
    }

    const consumerDevice = {
      typ: "Verbraucher",
      name: deviceForm.name,
      leistung: deviceForm.leistung,
      dauer: deviceForm.dauer,
      actions: [newAction]
    };

    setDevices([...devices, consumerDevice]);
    setActions([...actions, newAction]);

    resetAll();
  }

  function resetDeviceForm() {
    setDeviceForm(INITIAL_DEVICE_FORM);
    setOpenCreateDevice(false);
  }

  function resetAll() {
    resetDeviceForm();
    setOpenCreateAction(false);
    
    setActionForm(INITIAL_ACTION_FORM);
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

    setDeviceForm({
      name: device.name || "",
      typ: device.typ || "Erzeuger",

      nennleistung: device.nennleistung || "",
      neigungswinkel: device.neigungswinkel || "",
      ausrichtung: device.ausrichtung || "",
      standort: device.standort || "",

      leistung: device.leistung || "",
      dauer: device.dauer || "",
      flexibilität: device.flexibilität || "durchlauf",

      kapazität: device.kapazität || "",
    });
  }


  function editDevice() {
    if (editIndex === null) return;

    const updatedDevices = [...devices];

    updatedDevices[editIndex] = {
      ...updatedDevices[editIndex],
      name: deviceForm.name,
      typ: deviceForm.typ,
      nennleistung: deviceForm.nennleistung,
      neigungswinkel: deviceForm.neigungswinkel,
      ausrichtung: deviceForm.ausrichtung,
      standort: deviceForm.standort,
      leistung: deviceForm.leistung,
      dauer: deviceForm.dauer,
      kapazität: deviceForm.kapazität
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
                <DeviceForm deviceForm={deviceForm} onChange={handleDeviceFormChange} />
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
                <DeviceForm deviceForm={deviceForm} onChange={handleDeviceFormChange} />
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
            <ActionForm actionForm={actionForm} onChange={handleActionFormChange} />
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
        {devices.map((val, key) => { //setEditIndex(key)
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