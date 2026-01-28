import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });


function SearchControl({ onLocationSelected }) {
    const map = useMap();
    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new GeoSearchControl({
            provider,
            style: 'bar',
            showMarker: false,
            autoClose: true,
            searchLabel: 'Adresse suchen...'
        });
        map.addControl(searchControl);
        map.on('geosearch/showlocation', (result) => {
            onLocationSelected({ lat: result.location.y, lng: result.location.x, label: result.location.label });
        });
        return () => map.removeControl(searchControl);
    }, [map, onLocationSelected]);
    return null;
}

function MapEvents({ onLocationSelected }) {
    useMapEvents({
        click: async (e) => {
            const { lat, lng } = e.latlng;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            onLocationSelected({ lat, lng, label: data.display_name || "Gewählter Punkt" });
        },
    });
    return null;
}


export default function LocationPickerModal({ onSelect, onCancel }) {
    const [tempLocation, setTempLocation] = useState(null);

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h3 style={{ marginTop: 0 }}>Standort wählen</h3>

                <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                    <MapContainer center={[52.52, 13.40]} zoom={11} style={{ height: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <SearchControl onLocationSelected={setTempLocation} />
                        <MapEvents onLocationSelected={setTempLocation} />
                        {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} icon={DefaultIcon} />}
                    </MapContainer>
                </div>

                <div style={{ marginTop: '15px' }}>
                    <p style={{ fontSize: '14px', color: '#555', minHeight: '40px' }}>
                        {tempLocation ? `📍 ${tempLocation.label}` : "Bitte Ort suchen oder auf Karte klicken"}
                    </p>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={onCancel} style={buttonStyleSecondary}>Abbrechen</button>
                        <button
                            onClick={() => onSelect(tempLocation)}
                            disabled={!tempLocation}
                            style={tempLocation ? buttonStylePrimary : buttonStyleDisabled}
                        >
                            Übernehmen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Styles ---
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    position: 'relative'
};

const buttonStylePrimary = { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const buttonStyleSecondary = { padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const buttonStyleDisabled = { ...buttonStylePrimary, backgroundColor: '#a0a0a0', cursor: 'not-allowed' };