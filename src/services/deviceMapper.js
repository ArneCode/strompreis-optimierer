/**
 * Map raw device form values to API-ready device objects.
 * Returns different shapes depending on device type.
 * @param {object} rawForm - Form values from the UI
 * @returns {object} Cleaned device payload
 */
export const mapDeviceData = (rawForm) => {
    const cleanData = {
        name: rawForm.name,
        type: rawForm.type,
    };

    switch (rawForm.type) {
        case "Battery":
            { const eff = parseFloat(rawForm.efficiency) || 0.95;
            return {
                ...cleanData,
                capacity: parseFloat(rawForm.capacity) || 0,
                currentCharge: parseFloat(rawForm.currentCharge) || 0,
                maxChargeRate: parseFloat(rawForm.maxChargeRate) || 0,
                maxDischarge: parseFloat(rawForm.maxDischarge) || 0,
                efficiency: eff > 1 ? eff / 100 : eff
            }; }

        case "Consumer":
            return {
                ...cleanData,
                flexibility: rawForm.flexibility || "constant"
            };

        case "PVGenerator":
            { const azimuthMapping = {
                "Nord": 0, "Nordost": 45, "Ost": 90, "Südost": 135,
                "Süd": 180, "Südwest": 225, "West": 270, "Nordwest": 315
            };
            return {
                ...cleanData,
                peakPower: parseFloat(rawForm.ratedPower) || 0,
                declination: parseFloat(rawForm.angleOfInclination) || 0,
                location: rawForm.location || "Unbekannt",
                azimuth: azimuthMapping[rawForm.alignment] || 180,
                latitude: parseFloat(rawForm.lat) || 0,
                longitude: parseFloat(rawForm.lng) || 0
            }; }

        default:
            return cleanData;
    }
};