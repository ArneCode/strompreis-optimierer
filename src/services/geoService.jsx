export const geoService = {
    async getAddressFromCoords(lat, lng) {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );

        if (!response.ok) {
            throw new Error(`API_ERROR: ${response.status}`);
        }

        return await response.json();
    }
};