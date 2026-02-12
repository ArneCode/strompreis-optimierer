/**
 * Lightweight geocoding service using OpenStreetMap's.
 */
export const geoService = {
    /**
     * Reverse geocode coordinates to an address object.
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<object>} Nominatim response as JSON
     */
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