import { useState, useCallback } from 'react';
import { geoService } from '../../../services/geoService';

/**
 * Custom hook for managing location selection and reverse geocoding.
 * Handles temporary location state and performs async address lookup via geoService.
 * @returns {object} Hook state and functions
 * @returns {object|null} .tempLocation - Current location {lat, lng, label}
 * @returns {Function} .updateLocation - Callback(lat, lng, label?) to set location
 * @returns {boolean} .isLoading - True during geocoding request
 * @example
 * const { tempLocation, updateLocation, isLoading } = useLocationLogic();
 * await updateLocation(52.52, 13.40); // Geocodes automatically
 */
export function useLocationLogic() {
    const [tempLocation, setTempLocation] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const updateLocation = useCallback(async (lat, lng, label = null) => {
        setIsLoading(true);
        try {
            const finalLabel = label || (await geoService.getAddressFromCoords(lat, lng)).display_name;

            setTempLocation({
                lat,
                lng,
                label: finalLabel || "Gewählter Punkt"
            });
        } catch (error) {
            console.error("Fehler beim Abrufen der Adresse:", error);
            setTempLocation({ lat, lng, label: "Adresse nicht gefunden" });
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { tempLocation, updateLocation, isLoading };
}