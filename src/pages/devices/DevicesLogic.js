export const INITIAL_DEVICE_FORM = {
    name: "",
    type: "generator",
    ratedPower: "", // nennleitsung
    angleOfInclination: "",
    alignment: "Süd",
    location: "",
    lat: null,
    lng: null,
    power: "",
    duration: "",
    forecast: "",
    flexibility: "constant",
    capacity: "",
    maxDischarge: ""
};

export const RULES = {
    required: value => value ? null : "Pflichtfeld",
    number: value => isNaN(Number(value)) ? "Gib eine Zahl an" : null,
    positive: value => Number(value) > 0 ? null : "Muss > 0 sein",
};

export const DEVICE_VALIDATION_SCHEME = {
    Erzeuger: {
        forecast: [RULES.required],
    },

    PVAnlage: {
        ratedPower: [RULES.required, RULES.number, RULES.positive],
        angleOfInclination: [RULES.required, RULES.number, RULES.positive],
        alignment: [RULES.required],
        location: [RULES.required],
    },

    Verbraucher: {
        power: [RULES.required, RULES.number, RULES.positive],
        duration: [RULES.required, RULES.number, RULES.positive],
        flexibility: [RULES.required],
    },

    Speicher: {
        capacity: [RULES.required, RULES.number, RULES.positive],
        maxDischarge: [RULES.required, RULES.number, RULES.positive],
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