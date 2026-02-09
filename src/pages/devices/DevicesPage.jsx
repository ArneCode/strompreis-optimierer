import {useState} from 'react';
import '../../styles/pages/Devices.css';
import Device from './Device.jsx';
import DeviceForm from './DeviceForm.jsx';
import {INITIAL_DEVICE_FORM, validateDevice} from './DevicesLogic.js'



function DevicesPage({devices, setDevices}) {
    const [deviceErrors, setDeviceErrors] = useState({});
    const [deviceForm, setDeviceForm] = useState(INITIAL_DEVICE_FORM);
    const[errorMessage, setErrorMessage] = useState("");
    const [editIndex, setEditIndex] = useState(null);
    const [openCreateDevice, setOpenCreateDevice] = useState(false);
    const [openEditDevice, setOpenEditDevice] = useState(false);


  function handleDeviceFormChange(e) {
    const {name, value} = e.target;

    setDeviceForm(prev => ({...prev, [name]: value}));
    setDeviceErrors(prev => ({ ...prev, [name]: undefined}));
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
        type: deviceForm.type,
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

      if (deviceForm.type === "Erzeuger") {
          newDevice.forecast = deviceForm.forecast;
      } else if (deviceForm.type === "PVAnlage") {
          newDevice.ratedPower = deviceForm.ratedPower;
          newDevice.angleOfInclination = deviceForm.angleOfInclination;
          newDevice.alignment = deviceForm.alignment;
          newDevice.location = deviceForm.location;
          newDevice.lat = deviceForm.lat;
          newDevice.lng = deviceForm.lng;

      } else if (deviceForm.type === "Verbraucher") {
          newDevice.power = deviceForm.power;
          newDevice.duration = deviceForm.duration;
          newDevice.flexibility = deviceForm.flexibility;
          setOpenCreateDevice(false);

      } else if (deviceForm.type === "Speicher") {
          newDevice.capacity = deviceForm.capacity;
          newDevice.maxDischarge = deviceForm.maxDischarge;
          newDevice.maxChargeRate = deviceForm.maxChargeRate;
          newDevice.currentCharge = deviceForm.currentCharge;
          newDevice.efficiency = deviceForm.efficiency;
      }

      setDevices([...devices, newDevice]);
      setDeviceErrors({});

      resetDeviceForm();
      setOpenCreateDevice(false);
  }


  function resetDeviceForm() {
    setDeviceForm(INITIAL_DEVICE_FORM);
    setOpenCreateDevice(false);
  }

  function resetAll() {
    resetDeviceForm();
    setDeviceErrors({});

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
      type: device.type || "Erzeuger",

      ratedPower: device.ratedPower || "",
      angleOfInclination: device.angleOfInclination || "",
      alignment: device.alignment || "",
      location: device.location || "",

      forecast: device.forecast || "",

      power: device.power || "",
      duration: device.duration || "",
      flexibility: device.flexibility || "durchlauf",

      capacity: device.capacity || "",
      maxDischarge: device.maxDischarge || "",
      maxChargeRate: device.maxChargeRate || "",
      efficiency: device.efficiency || "",
      currentCharge: device.currentCharge || "",
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
      type: deviceForm.type,
      ratedPower: deviceForm.ratedPower,
      angleOfInclination: deviceForm.angleOfInclination,
      alignment: deviceForm.alignment,
      location: deviceForm.location,
      power: deviceForm.power,
      duration: deviceForm.duration,
      capacity: deviceForm.capacity,
      lat: deviceForm.lat,
      lng: deviceForm.lng,
      forecast: deviceForm.forecast,
      flexibility: deviceForm.flexibility,
      maxChargeRate: deviceForm.maxChargeRate,
      currentCharge: deviceForm.currentCharge,
      efficiency: deviceForm.efficiency,
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
                type={val.type}
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