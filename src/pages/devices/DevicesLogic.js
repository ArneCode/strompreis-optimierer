export const INITIAL_DEVICE_FORM = {
    name: "", type: "Generator", ratedPower: "", angleOfInclination: "",
    alignment: "Süd", location: "", lat: null, lng: null, forecast: "",
    flexibility: "constant", capacity: "", maxDischarge: "",
    maxChargeRate: "", currentCharge: "", efficiency: "",
};

const deviceTranslations = {
    "Battery": "Speicher",
    "Consumer": "Verbraucher",
    "Generator": "Erzeuger",
    "PVGenerator": "PV-Anlage",
};

export const translateDevice = (key) => {
    const normalizedKey = key ? key.toString() : "";
    return deviceTranslations[normalizedKey] || deviceTranslations[normalizedKey.toUpperCase()] || key;
};

export const RULES = {
    required: value => value ? null : "Pflichtfeld",
    number: value => isNaN(Number(value)) ? "Gib eine Zahl an" : null,
    positive: value => Number(value) > 0 ? null : "Muss > 0 sein",
    efficiencyRange: value => (Number(value) <= 0 || Number(value) > 100) ? "0-100%!" : null,
    angleRange: value => (Number(value) < 0 || Number(value) > 90) ? "0°-90°!" : null
};

export const DEVICE_VALIDATION_SCHEME = {
    Generator: { forecast: [RULES.required] },
    PVGenerator: {
        ratedPower: [RULES.required, RULES.number, RULES.positive],
        angleOfInclination: [RULES.required, RULES.number, RULES.angleRange],
        alignment: [RULES.required],
        location: [RULES.required],
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

export function validateDevice(form) {
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

