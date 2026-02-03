import '../../styles/pages/Devices.css';

function Device({type, name}) {
  return (
    <div className="device">
      <p className="device-name">
        {name}
      </p>
      <p className="device-type">
        {type}
      </p>
    </div>
  );
}

export default Device;