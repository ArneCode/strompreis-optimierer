/**
 * Ccreated AI supported.
 * Modal dialog to pick geographic location on Leaflet map
 * Supports both search (via OpenStreetMap Nominatim) and direct map click interactions.
 * Returns selected location via callback with {lat, lng, label} structure.
 * @param {object} props
 * @param {Function} props.onSelect - Callback(location) when location confirmed
 * @param {number} props.onSelect.location.lat - Selected latitude (-90 to 90)
 * @param {number} props.onSelect.location.lng - Selected longitude (-180 to 180)
 * @param {string} props.onSelect.location.label - Address label from Nominatim or user-set
 * @param {Function} props.onCancel - Callback() when modal cancelled
 * @returns {JSX.Element} Modal overlay with map and controls
 */
import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

import { useLocationLogic } from  './hooks/useLocationLogic';
import { SearchControl, MapEvents } from  './Map/MapPlugins';

import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import '../../styles/components/LocationPicker.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DEFAULT_ICON = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const INITIAL_VIEW = [52.52, 13.40];

export default function LocationPickerModal({ onSelect, onCancel }) {
    const { tempLocation, updateLocation, isLoading } = useLocationLogic();

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-header">Standort wählen</h3>

                <div className="map-wrapper">
                    <MapContainer
                        className="map-container-inner"
                        center={INITIAL_VIEW}
                        zoom={11}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        <SearchControl onLocationSelected={updateLocation} />
                        <MapEvents onLocationSelected={updateLocation} />

                        {tempLocation && (
                            <Marker
                                position={[tempLocation.lat, tempLocation.lng]}
                                icon={DEFAULT_ICON}
                            />
                        )}
                    </MapContainer>
                </div>

                <div className="info-section">
                    <p className={`location-text ${isLoading ? 'is-loading' : ''}`}>
                        {isLoading ? "Suche Adresse..." : (tempLocation ? `📍 ${tempLocation.label}` : "Bitte Standort auf der Karte auswählen")}
                    </p>

                    <div className="button-group">
                        <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
                        <button
                            onClick={() => onSelect(tempLocation)}
                            disabled={!tempLocation || isLoading}
                            className={`btn-primary ${(!tempLocation || isLoading) ? 'btn-disabled' : ''}`}
                        >
                            Übernehmen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}