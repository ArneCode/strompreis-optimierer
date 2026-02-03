
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

export const validateActionForm = (form, timeOffset, isEdit = false) => {
    const errors = {};

    if (!form.deviceName && !isEdit) errors.deviceName = "Pflichtfeld";
    if (!form.duration || Number(form.duration) <= 0) errors.duration = "Ungültig";

    const startMins = timeToSlider(form.startTime, timeOffset);
    const endMins = timeToSlider(form.endTime, timeOffset);
    const windowSize = endMins - startMins;

    if (endMins <= startMins) {
        errors.startTime = "Zeitfenster ungültig";
    } else if (windowSize < Number(form.duration)) {
        errors.duration = "Dauer passt nicht ins Fenster!";
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


