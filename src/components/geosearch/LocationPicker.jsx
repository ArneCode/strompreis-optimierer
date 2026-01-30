import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import L from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {geoService as GeoService} from "../../services/geoService.jsx";
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
        });

        map.addControl(searchControl);

        map.on('geosearch/showlocation', (result) => {
            onLocationSelected({
                lat: result.location.y,
                lng: result.location.x,
                label: result.location.label
            });
        });

        return () => map.removeControl(searchControl);
    }, [map, onLocationSelected]);
    return null;
}

function MapEvents({ onLocationSelected }) {
    useMapEvents({
        click: async (e) => {
            const { lat, lng } = e.latlng;
            const label = await GeoService.getAddressFromCoords(lat, lng);
            onLocationSelected({ lat, lng, label });
        },
    });
    return null;
}

export default function LocationPicker({ onSelect, onCancel }) {
    const [tempLocation, setTempLocation] = useState(null);

    return (
        <div style={{ border: '1px solid #ccc', marginTop: '10px', padding: '10px' }}>
            <div style={{ height: '300px', marginBottom: '10px' }}>
                <MapContainer center={[52.52, 13.40]} zoom={11} style={{ height: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <SearchControl onLocationSelected={setTempLocation} />
                    <MapEvents onLocationSelected={setTempLocation} />
                    {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} icon={DefaultIcon} />}
                </MapContainer>
            </div>

            {tempLocation && (
                <p style={{ fontSize: '12px' }}><strong>Ausgewählt:</strong> {tempLocation.label}</p>
            )}

            <button type="button" onClick={() => onSelect(tempLocation)} disabled={!tempLocation}>Übernehmen</button>
            <button type="button" onClick={onCancel}>Abbrechen</button>
        </div>
    );
}