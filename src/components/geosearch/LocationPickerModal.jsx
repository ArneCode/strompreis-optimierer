import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import L from 'leaflet';
import '../../styles/components/LocationPicker.css'

import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {geoService} from "../../services/geoService.jsx";
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
            try {
                const data = await geoService.getAddressFromCoords(lat, lng);
                onLocationSelected({
                    lat,
                    lng,
                    label: data.display_name || "Gewählter Punkt"
                });
            } catch (error) {
                onLocationSelected({ lat, lng, label: "Adresse nicht gefunden" });
            }
        },
    });
    return null;
}

export default function LocationPickerModal({ onSelect, onCancel }) {
    const [tempLocation, setTempLocation] = useState(null);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-header">Standort wählen</h3>

                <div className="map-wrapper">
                    <MapContainer
                        className="map-container-inner"
                        center={[52.52, 13.40]}
                        zoom={11}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <SearchControl onLocationSelected={setTempLocation} />
                        <MapEvents onLocationSelected={setTempLocation} />
                        {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} icon={DefaultIcon} />}
                    </MapContainer>
                </div>

                <div className="info-section">
                    <p className="location-text">
                        {tempLocation ? `📍 ${tempLocation.label}` : "Bitte Standort auf der Karte auswählen"}
                    </p>

                    <div className="button-group">
                        <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
                        <button
                            onClick={() => onSelect(tempLocation)}
                            disabled={!tempLocation}
                            className={`btn-primary ${!tempLocation ? 'btn-disabled' : ''}`}
                        >
                            Übernehmen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}