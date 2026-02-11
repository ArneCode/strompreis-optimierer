
export const INITIAL_DEVICE_FORM = {
    name: "",
    type: "Generator",
    ratedPower: "", // nennleitsung
    angleOfInclination: "",
    alignment: "Süd",
    location: "",
    lat: null,
    lng: null,
    forecast: "",
    flexibility: "constant",
    capacity: "",
    maxDischarge: "",
    maxChargeRate: "",
    currentCharge: "",
    efficiency: "",
};


const deviceTranslations = {
    "Battery": "Speicher",
    "Consumer": "Verbraucher",
    "Generator": "Erzeuger",
    "PVGenerator": "PV-Anlage",
}



const translateDevice = (key) => {
    const normalizedKey = key ? key.toString() : "";
    return deviceTranslations[normalizedKey] || deviceTranslations[normalizedKey.toUpperCase()] || key;
};

export default translateDevice


export const RULES = {
    required: value => value ? null : "Pflichtfeld",
    number: value => isNaN(Number(value)) ? "Gib eine Zahl an" : null,
    positive: value => Number(value) > 0 ? null : "Muss > 0 sein",
};

export const DEVICE_VALIDATION_SCHEME = {
    Generator: {
        forecast: [RULES.required],
    },

    PVGenerator: {
        ratedPower: [RULES.required, RULES.number, RULES.positive],
        angleOfInclination: [RULES.required, RULES.number, RULES.positive],
        alignment: [RULES.required],
        location: [RULES.required],
    },

    Consumer: {
        flexibility: [RULES.required],
    },

    Battery: {
        capacity: [RULES.required, RULES.number, RULES.positive],
        maxDischarge: [RULES.required, RULES.number, RULES.positive],
        maxChargeRate: [RULES.required, RULES.number, RULES.positive],
        currentCharge: [RULES.required, RULES.number, RULES.positive],
        efficiency: [RULES.required, RULES.number, RULES.positive],
    },
};

export function validateDeviceWithScheme(form, scheme) {
    const errors = {};

    Object.entries(scheme).forEach(([field, validators]) => {
        for (const validateFn of validators) {
            const error = validateFn(form[field]);
            if (error) {
                errors[field] = error;
                break;
            }
        }
    });

    return errors;
}

export function validateDevice(form) {
    return validateDeviceWithScheme(form, {
        name: [RULES.required],
        ...DEVICE_VALIDATION_SCHEME[form.type],
    });
}