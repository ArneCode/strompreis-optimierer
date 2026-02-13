/**
 * Helper utilities for actions page: time conversions, validation and formatting.
 */

/**
 * Round date to next 5-minute interval.
 * @param {Date} date - Input date
 * @returns {Date} New date rounded up to next 5-minute mark
 * @example
 * roundToNext5Min(new Date(2026, 0, 13, 14, 23, 0)) // Returns 14:25
 */
export const roundToNext5Min = (date) => {
    const rounded = new Date(date);
    const mins = rounded.getMinutes();
    const roundedMins = Math.ceil(mins / 5) * 5;
    rounded.setMinutes(roundedMins);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
};

/**
 * Convert slider minute value to HH:MM time string.
 * Accounts for time offset from midnight for day-spanning times.
 * @param {number} sliderMins - Slider value (0-1440 minutes)
 * @param {number} timeOffset - Time offset from midnight in minutes
 * @returns {string} Time in HH:MM format (e.g., "14:30")
 * @throws {TypeError} If parameters are not numbers
 * @example
 * sliderToTime(300, 600) // Returns "14:00"
 */
export const sliderToTime = (sliderMins, timeOffset) => {
    const totalMins = (sliderMins + timeOffset) % 1440;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Convert HH:MM time string to slider minute position.
 * Accounts for time offset to handle day-spanning times.
 * @param {string} timeStr - Time in HH:MM format (e.g., "14:30")
 * @param {number} timeOffset - Time offset from midnight in minutes
 * @returns {number} Slider position (0-1440)
 * @throws {TypeError} If timeOffset is not a number
 * @example
 * timeToSlider("14:00", 600) // Returns 300
 */
export const timeToSlider = (timeStr, timeOffset) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    let diff = (h * 60 + m) - timeOffset;
    if (diff < 0) diff += 1440;
    return diff;
};

/**
 * Validate an action form and return field-level errors.
 * Checks device selection, time range validity, and device-specific constraints.
 * @param {object} form - Form values to validate
 * @param {string} form.deviceId - Selected device ID
 * @param {string} form.startTime - Start time in HH:MM format
 * @param {string} form.endTime - End time in HH:MM format
 * @param {string} form.duration - Duration in minutes (constant devices)
 * @param {string} form.consumption - Power consumption in W
 * @param {string} form.totalConsumption - Total energy in Wh (variable devices)
 * @param {Array} devices - Available devices with flexibility property
 * @param {number} timeOffset - Time offset from midnight
 * @param {boolean} [isEdit=false] - Skip deviceId requirement if editing
 * @returns {Object} Validation errors {fieldName: errorMessage}
 * @example
 * const errors = validateActionForm(form, devices, 600, false);
 * if (errors.startTime) { // Error exists }
 */
export const validateActionForm = (form, devices, timeOffset, isEdit = false) => {
    const errors = {};
    const selectedDevice = devices.find(d => String(d.id) === String(form.deviceId));
    const isVariable = selectedDevice?.flexibility === "variable";

    if (!form.deviceId && !isEdit) errors.deviceId = "Pflichtfeld";

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

/**
 * Get current time string rounded to next 5-minute interval.
 * @returns {string} Current time in HH:MM format
 */
export const getCurrentTimeStr = () => roundToNext5Min(new Date()).toTimeString().slice(0, 5);

/**
 * Return date label (Today/Tomorrow) based on time and offset.
 * Determines if time is in current day or next day based on midnight offset.
 * @param {string} timeStr - Time in HH:MM format
 * @param {number} timeOffset - Time offset from midnight in minutes
 * @returns {string} "(Heute)" or "(Morgen)" label, or empty string if invalid
 */
export const getDateLabel = (timeStr, timeOffset) => {
    if (!timeStr) return "";
    const sliderPos = timeToSlider(timeStr, timeOffset);
    const minsUntilMidnight = 1440 - timeOffset;
    return sliderPos >= minsUntilMidnight ? "(Morgen)" : "(Heute)";
};

/**
 * Combine HH:MM time string with offset into ISO 8601 timestamp.
 * Automatically adjusts to next day if needed based on offset.
 * @param {string} timeStr - Time in HH:MM format
 * @param {number} timeOffset - Time offset from midnight in minutes
 * @returns {string|null} ISO 8601 timestamp string, or null if timeStr invalid
 * @example
 * combineToISO("14:30", 600) // Returns ISO timestamp for 14:30
 */
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

/**
 * Extract HH:MM time string from ISO 8601 timestamp.
 * @param {string} isoString - ISO 8601 timestamp (e.g., "2026-02-13T14:30:00Z")
 * @returns {string} Time in HH:MM format, or empty string if invalid
 * @example
 * extractTimeFromISO("2026-02-13T14:30:00Z") // Returns "14:30"
 */
export const extractTimeFromISO = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
};