import {useState} from 'react';
import '../../styles/pages/Devices.css';
import Device from './Device.jsx';
import DeviceForm from './DeviceForm.jsx';
//import ActionForm from './ActionForm';
import ApiService from "../../services/apiService.js";



function DevicesPage({devices, setDevices}) {
    //const [actions, setActions] = useState([]);
    const [deviceErrors, setDeviceErrors] = useState({});
    /*useEffect(() => {
        ApiService.fetchDevices()
            .then(data => setDevices(data))
            .catch(err => console.error("Fehler beim Laden der Geräte:", err));
    }, []);*/

    const INITIAL_DEVICE_FORM = {
      name: "",
      typ: "Erzeuger",
      nennleistung: "",
      neigungswinkel: "",
      ausrichtung: "Süd",
      standort: "",
      lat: null,
      lng: null,
      leistung: "",
      dauer: "",
      prognose: "",
      flexibilität: "durchlauf",
      kapazität: "",
      maxEntladung: ""
    };
/*
    const INITIAL_ACTION_FORM = {
      typ: "Konstant",
      startZeit: "",
      endZeit: "",
      dauer: "",
      verbrauchProZeit: "",
      gesamtVerbrauch: "",
      maxVerbrauchProZeit: ""
    };
    */

    const DEVICE_REQUIRED_FIELDS = {
      PVAnlage: ["nennleistung", "neigungswinkel", "ausrichtung", "standort"],
      Erzeuger: ["prognose"],
      Verbraucher: ["leistung", "dauer", "flexibilität"],
      Speicher: ["kapazität", "maxEntladung"],
    };

    const RULES = {
      required: value => value ? null : "Pflichtfeld",
      number: value => isNaN(Number(value)) ? "Gib eine Zahl an" : null,
      positive: value => Number(value) > 0 ? null : "Muss > 0 sein",
    };

    const DEVICE_VALIDATION_SCHEME = {
    Erzeuger: {
      prognose: [RULES.required],
    },

    PVAnlage: {
      nennleistung: [RULES.required, RULES.number, RULES.positive],
      neigungswinkel: [RULES.required, RULES.number, RULES.positive],
      ausrichtung: [RULES.required],
      standort: [RULES.required],
    },

    Verbraucher: {
      leistung: [RULES.required, RULES.number, RULES.positive],
      dauer: [RULES.required, RULES.number, RULES.positive],
      flexibilität: [RULES.required],
    },

    Speicher: {
      kapazität: [RULES.required, RULES.number, RULES.positive],
      maxEntladung: [RULES.required, RULES.number, RULES.positive],
    },
  };


    const [deviceForm, setDeviceForm] = useState(INITIAL_DEVICE_FORM);
    //const [actionForm, setActionForm] = useState(INITIAL_ACTION_FORM);

    const[errorMessage, setErrorMessage] = useState("");
    const [editIndex, setEditIndex] = useState(null);

    const [openCreateDevice, setOpenCreateDevice] = useState(false);
    const [openEditDevice, setOpenEditDevice] = useState(false);
    //const [openCreateAction, setOpenCreateAction] = useState(false);




  function handleDeviceFormChange(e) {
    const {name, value} = e.target;

    setDeviceForm(prev => ({...prev, [name]: value}));
    setDeviceErrors(prev => ({ ...prev, [name]: undefined}));
  }

  /*
  function handleActionFormChange(e) {
    const { name, value } = e.target;
    setActionForm(prev => ({...prev, [name]: value}));
  }
    */

  /*
  function isValidDevice(form) {
    if (!form.name) return false;
    
    return REQUIRED_FIELDS[form.typ].every(
      field => form[field]
    );
  }
  */

  /*
  function validateDevice(form) {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = "Dieses Feld darf nicht leer sein";
    }

    DEVICE_REQUIRED_FIELDS[form.typ].forEach(field => {
      if (!form[field]) {
        errors[field] = "Dieses Feld darf nicht leer sein";
      }
    });



    return errors;
  }
  */

  function validateDevice(form) {
    return validateDeviceWithScheme(form, {
      name: [RULES.required],
      ...DEVICE_VALIDATION_SCHEME[form.typ],
    });
  }

  function validateDeviceWithScheme(form, scheme) {
    const errors = {};

    Object.entries(scheme).forEach(([field, validators]) => {
      for (const validateFn of validators) {
        const error = validateFn(form[field]);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    });

    return errors;
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

      const errors = validateDevice(deviceForm);

      if (Object.keys(errors).length > 0) {
        setDeviceErrors(errors);
        setErrorMessage("Bitte fülle alle Felder aus!");
        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
        return;
      }

      if (deviceForm.typ === "Erzeuger") {
          newDevice.prognose = deviceForm.prognose;
      } else if (deviceForm.typ === "PVAnlage") {
          newDevice.nennleistung = deviceForm.nennleistung;
          newDevice.neigungswinkel = deviceForm.neigungswinkel;
          newDevice.ausrichtung = deviceForm.ausrichtung;
          newDevice.standort = deviceForm.standort;
          newDevice.lat = deviceForm.lat;
          newDevice.lng = deviceForm.lng;

      } else if (deviceForm.typ === "Verbraucher") {
          newDevice.leistung = deviceForm.leistung;
          newDevice.dauer = deviceForm.dauer;
          newDevice.flexibilität = deviceForm.flexibilität;
          setOpenCreateDevice(false);
          //setOpenCreateAction(true);
          //return;

      } else if (deviceForm.typ === "Speicher") {
          newDevice.kapazität = deviceForm.kapazität;
          newDevice.maxEntladung = deviceForm.maxEntladung;
      }

      setDevices([...devices, newDevice]);
      setDeviceErrors({});

      resetDeviceForm();
      setOpenCreateDevice(false);
  }

  /*
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
    */

  function resetDeviceForm() {
    setDeviceForm(INITIAL_DEVICE_FORM);
    setOpenCreateDevice(false);
  }

  function resetAll() {
    resetDeviceForm();
    //setOpenCreateAction(false);
    setDeviceErrors({});
    
    //setActionForm(INITIAL_ACTION_FORM);
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

      prognose: device.prognose || "",

      leistung: device.leistung || "",
      dauer: device.dauer || "",
      flexibilität: device.flexibilität || "durchlauf",

      kapazität: device.kapazität || "",
      maxEntladung: device.maxEntladung || "",
    });
  }





  function editDevice() {
    if (editIndex === null) return;

    const errors = validateDevice(deviceForm);

    if (Object.keys(errors).length > 0) {
      setDeviceErrors(errors);
      setErrorMessage("Bitte fülle alle Felder aus!");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      return;
    }

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
                <DeviceForm deviceForm={deviceForm} onChange={handleDeviceFormChange} errors={deviceErrors} />
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
                <DeviceForm deviceForm={deviceForm} onChange={handleDeviceFormChange} errors={deviceErrors}/>
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
                Erstellen
              </button>
            </div>
          </div>
        </div>
      }

      {/* 
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
      */}

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

export default DevicesPage;