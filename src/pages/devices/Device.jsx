import '../../styles/pages/Devices.css';
import translateDevice from "./DevicesLogic.js";

function Device({type, name}) {
  return (
    <div className="device">
      <p className="device-name">
        {name}
      </p>
      <p className="device-type">
        {translateDevice(type)}
      </p>
    </div>
  );
}

export default Device;