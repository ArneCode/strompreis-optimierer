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

/**
 * Convert azimuth degrees (number) to a localization alignment string used by the form.
 * Picks the nearest direction (N, NE, E, SE, S, SW, W, NW).
 * @param {number|null|undefined} deg
 * @returns {string} alignment string in German, fallback to 'Süd'
 */
export const azimuthToAlignment = (deg) => {
    if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return 'Süd';
    const d = Number(deg) % 360;
    const norm = (d + 360) % 360;
    const mapping = [
        ['Nord', 0], ['Nordost', 45], ['Ost', 90], ['Südost', 135],
        ['Süd', 180], ['Südwest', 225], ['West', 270], ['Nordwest', 315]
    ];

    let best = mapping[0][0];
    let bestDiff = 360;
    for (const [name, angle] of mapping) {
        let diff = Math.abs(norm - angle);
        if (diff > 180) diff = 360 - diff;
        if (diff < bestDiff) {
            bestDiff = diff;
            best = name;
        }
    }
    return best;
};

/**
 * Prepare a device object received from the backend for the form state.
 * - If backend provides numeric `azimuth` or numeric `alignment`, convert to alignment string.
 * - Preserve other fields.
 * @param {object} device - device object from API
 * @returns {object} device adapted for form consumption
 */
export const prepareDeviceForForm = (device = {}) => {
    const out = { ...device };
    if (device.azimuth !== undefined) {
        out.alignment = azimuthToAlignment(device.azimuth);
    } else if (device.alignment !== undefined && typeof device.alignment === 'number') {
        out.alignment = azimuthToAlignment(device.alignment);
    }
    return out;
};
