import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';

/**
 * Add a geosearch control to the map that calls onLocationSelected(lat, lng, label).
 * @param {{onLocationSelected:function}} props
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
 * Attach click handler to the map and propagate coordinates via onLocationSelected(lat, lng).
 */
export function MapEvents({ onLocationSelected }) {
    useMapEvents({
        click: (e) => {
            onLocationSelected(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}