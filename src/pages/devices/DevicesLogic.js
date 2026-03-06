/**
 * Default device form values used by the device modal.
 */
export const INITIAL_DEVICE_FORM = {
    name: "", type: "Generator", ratedPower: "", angleOfInclination: "",
    alignment: "Süd", location: "", lat: null, lng: null, forecast: "",
    flexibility: "constant", capacity: "", maxDischarge: "",
    maxChargeRate: "", currentCharge: "", efficiency: "", peakPower: "",
};

const deviceTranslations = {
    "Battery": "Speicher",
    "Consumer": "Verbraucher",
    "ScheduledGenerator": "Erzeuger",
    "Generator": "Erzeuger",
    "PVGenerator": "PV-Anlage",
    "RandomGenerator": "Zufallsgenerator",
    "ScheduledConsumer": "Verbraucher (Zeitplan)",
};

/**
 * Translate device type keys to display strings (falls vorhanden).
 * @param {string} key
 * @returns {string}
 */
export const translateDevice = (key) => {
    const normalizedKey = key ? key.toString() : "";
    return deviceTranslations[normalizedKey] || deviceTranslations[normalizedKey.toUpperCase()] || key;
};

export const RULES = {
    required: value => value ? null : "Pflichtfeld",
    number: value => isNaN(Number(value)) ? "Gib eine Zahl an" : null,
    positive: value => Number(value) > 0 ? null : "Muss > 0 sein",
    efficiencyRange: value => (Number(value) < 1 || Number(value) > 100) ? "1-100%!" : null,
    angleRange: value => (Number(value) < 0 || Number(value) > 90) ? "0°-90°!" : null
};

export const DEVICE_VALIDATION_SCHEME = {
    Generator: { forecast: [RULES.required] },

    ScheduledConsumer: { forecast: [RULES.required] },

    PVGenerator: {
        ratedPower: [RULES.required, RULES.number, RULES.positive],
        angleOfInclination: [RULES.required, RULES.number, RULES.angleRange],
        alignment: [RULES.required],
        location: [RULES.required],
    },
    RandomGenerator: {
        peakPower: [RULES.required, RULES.number, RULES.positive],
    },
    Consumer: { flexibility: [RULES.required] },
    Battery: {
        capacity: [RULES.required, RULES.number, RULES.positive],
        maxDischarge: [RULES.required, RULES.number, RULES.positive],
        maxChargeRate: [RULES.required, RULES.number, RULES.positive],
        currentCharge: [RULES.required, RULES.number, RULES.positive],
        efficiency: [RULES.required, RULES.number, RULES.efficiencyRange],
    },
};

/**
 * Validate a device form according to the scheme for its type.
 * Returns an object with field errors.
 * @param {object} form
 * @returns {object} field->error
 */
export function validateDevice(form) {
    if (!form) return {};
    const errors = {};
    const scheme = { name: [RULES.required], ...DEVICE_VALIDATION_SCHEME[form.type] };

    Object.entries(scheme).forEach(([field, validators]) => {
        for (const validateFn of validators) {
            const error = validateFn(form[field]);
            if (error) { errors[field] = error; break; }
        }
    });
    return errors;
}
