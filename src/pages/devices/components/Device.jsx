import React from 'react';
import '../../../styles/pages/Devices.css';
import { translateDevice } from "../DevicesLogic.js";

/**
 * Device card component - displays device name and translated device type.
 * @param {object} props
 * @param {string} props.name - Device display name
 * @param {string} props.type - Device type key (Battery|Consumer|Generator|PVGenerator)
 * @returns {JSX.Element} Device card element
 */
function Device({type, name}) {
    return (
        <div className="device">
            <p className="device-name">{name}</p>
            <p className="device-type">
                {translateDevice(type)}
            </p>
        </div>
    );
}

export default Device;