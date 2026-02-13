import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';

/**
 * Leaflet map search control using OpenStreetMap Nominatim API.
 * Adds a search bar to the map that triggers location selection on search results.
 * @param {object} props
 * @param {Function} props.onLocationSelected - Callback(lat, lng, label) when location found
 * @returns {null} Hook component, renders no DOM elements
 */
export function SearchControl({ onLocationSelected }) {
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

        const handleSearch = (result) => {
            onLocationSelected(
                result.location.y,
                result.location.x,
                result.location.label
            );
        };

        map.on('geosearch/showlocation', handleSearch);

        return () => {
            map.off('geosearch/showlocation', handleSearch);
            map.removeControl(searchControl);
        };
    }, [map, onLocationSelected]);

    return null;
}

/**
 * Attach click event handler to map for location selection.
 * Propagates clicked coordinates via callback with map click coordinates.
 * @param {object} props
 * @param {Function} props.onLocationSelected - Callback(lat, lng) for map clicks
 * @returns {null} Hook component, renders no DOM elements
 */
export function MapEvents({ onLocationSelected }) {
    useMapEvents({
        click: (e) => {
            onLocationSelected(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}