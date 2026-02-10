export const geoService = {
    async getAddressFromCoords(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            if (!response.ok) throw new Error('Netzwerk-Fehler');

            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    }
};