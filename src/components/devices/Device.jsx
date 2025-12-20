import '../../styles/components/Devices.css';

function Device({typ, name}) {
  return (
    <div className="device">
      <p class="device-name">
        {name}
      </p>
      <p class="device-type">
        {typ}
      </p>
    </div>
  );
}

export default Device;