import {useState} from 'react';
import './Devices.css';
import Device from './Device';



function Devices() {
  const [devices, setDevices] = useState([{
    typ: 'Erzeuger',
    name: 'PV-1',
    nennleistung: 8.5,
    ausrichtung: "Süd",
    neigungswinkel: 30
  }]);

  const [openCreateDevice, setOpenCreateDevice] = useState(false);
  const [openEditDevice, setOpenEditDevice] = useState(false);

  function addDevice() {
    setDevices([
      ...devices, {
        typ: 'Erzeuger',
        name: 'PV-1',
        nennleistung: 8.5,
        ausrichtung: "Süd",
        neigungswinkel: 30
      }
    ]);
    setOpenCreateDevice(false);
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
            <p className="device-popup-header">
              Gerät erstellen
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