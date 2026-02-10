export const roundToNext5Min = (date) => {
    const rounded = new Date(date);
    const mins = rounded.getMinutes();
    const roundedMins = Math.ceil(mins / 5) * 5;
    rounded.setMinutes(roundedMins);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
};

export const sliderToTime = (sliderMins, timeOffset) => {
    const totalMins = (sliderMins + timeOffset) % 1440;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const timeToSlider = (timeStr, timeOffset) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    let diff = (h * 60 + m) - timeOffset;
    if (diff < 0) diff += 1440;
    return diff;
};

export const validateActionForm = (form, devices, timeOffset, isEdit = false) => {
    const errors = {};
    const selectedDevice = devices.find(d => d.name === form.deviceName);
    const isVariable = selectedDevice?.flexibility === "variable";

    if (!form.deviceName && !isEdit) errors.deviceName = "Pflichtfeld";

    const startMins = timeToSlider(form.startTime, timeOffset);
    const endMins = timeToSlider(form.endTime, timeOffset);
    const windowSize = endMins - startMins;

    if (!form.startTime) errors.startTime = "Start fehlt";
    if (!form.endTime) errors.endTime = "Ende fehlt";

    if (endMins <= startMins) {
        errors.startTime = "Zeitfenster ungültig";
    }

    if (isVariable) {
        if (!form.totalConsumption || Number(form.totalConsumption) <= 0) errors.totalConsumption = "Ungültig";
        if (!form.consumption || Number(form.consumption) <= 0) errors.consumption = "Pflichtfeld";
    } else {
        const durationNum = Number(form.duration);
        if (!form.duration || durationNum <= 0) errors.duration = "Ungültig";
        else if (windowSize < durationNum) errors.duration = "Dauer passt nicht!";

        if (!form.consumption || Number(form.consumption) <= 0) errors.consumption = "Pflichtfeld";
    }
    return errors;
};

export const getCurrentTimeStr = () => roundToNext5Min(new Date()).toTimeString().slice(0, 5);

export const getDateLabel = (timeStr, timeOffset) => {
    if (!timeStr) return "";
    const sliderPos = timeToSlider(timeStr, timeOffset);
    const minsUntilMidnight = 1440 - timeOffset;
    return sliderPos >= minsUntilMidnight ? "(Morgen)" : "(Heute)";
};

export const combineToISO = (timeStr, timeOffset) => {
    if (!timeStr) return null;

    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const combined = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

    const sliderPos = timeToSlider(timeStr, timeOffset);
    const minsUntilMidnight = 1440 - timeOffset;

    if (sliderPos >= minsUntilMidnight) {
        combined.setDate(combined.getDate() + 1);
    }

    return combined.toISOString();
};

export const extractTimeFromISO = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
};