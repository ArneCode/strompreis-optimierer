import { useState, useCallback } from 'react';
import { geoService } from '../../../services/geoService';

/**
 * Hook that manages temporary selected location and reverse geocoding state.
 * Returns { tempLocation, updateLocation, isLoading }.
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