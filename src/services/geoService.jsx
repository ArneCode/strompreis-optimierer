/**
 * Lightweight geocoding service using OpenStreetMap's Nominatim API.
 */
export const geoService = {
    /**
     * Reverse geocode coordinates to an address using Nominatim.
     * @param {number} lat - Latitude (-90 to 90)
     * @param {number} lng - Longitude (-180 to 180)
     * @returns {Promise<object>} Nominatim response with display_name and address components
     * @throws {Error} If HTTP response is not ok (network error, API unavailable)
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