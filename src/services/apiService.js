import { mapDeviceData } from './deviceMapper';

/**
 * Simple API client for the backend.
 * Base URL can be adjusted in the constructor.
 */
class ApiService {
    constructor() {
        this.baseURL = "http://127.0.0.1:5000/api";
    }

    /**
     * Perform a fetch request to the backend.
     * @param {string} endpoint - API endpoint (relative)
     * @param {string} [method='GET'] - HTTP method
     * @param {object|null} [data=null] - JSON payload for non-GET requests
     * @returns {Promise<object>} Parsed JSON response
     */
    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            ...(data && { body: JSON.stringify(data) })
        };

        try {
            const res = await fetch(`${this.baseURL}/${endpoint}`, options);

            if (!res.ok) {
                const errorDetail = await res.json().catch(() => ({}));
                console.error(`[ApiService] Backend Error (${res.status}):`, errorDetail);
                const errorMsg = errorDetail.detail || `HTTP ${res.status}`;
                throw new Error(errorMsg);
            }

            // Handle empty responses (e.g., DELETE endpoints)
            const text = await res.text();
            return text ? JSON.parse(text) : {};
        } catch (err) {
            console.error(`[ApiService] Request failed:`, err);
            throw err;
        }
    }

    /**
     * Fetch all devices from the backend.
     * @returns {Promise<Array>} Array of device objects with all properties
     * @throws {Error} If fetch fails or backend returns error
     */
    fetchDevices() {
        return this.request('devices');
    }

    /**
     * Create a new device on the backend.
     * Automatically converts form data to API-ready payload (e.g., % to decimal for efficiency).
     * @param {object} rawForm - Raw form values from DeviceForm UI
     * @param {string} rawForm.name - Device display name
     * @param {string} rawForm.type - Device type (Battery|Consumer|Generator|PVGenerator|RandomGenerator)
     * @returns {Promise<object>} Created device object with backend-assigned ID
     * @throws {Error} If validation fails or backend rejects
     */
    saveDevice(rawForm) {
        const cleanData = mapDeviceData(rawForm);
        return this.request('devices', 'POST', cleanData);
    }

    /**
     * Delete all devices and reset household to initial state.
     * @returns {Promise<void>}
     * @throws {Error} If deletion fails on backend
     */
    resetAllDevices() {
        return this.request('devices', 'DELETE');
    }

    /**
     * Delete a single device by ID.
     * @param {number|string} id - Device ID to delete
     * @returns {Promise<void>}
     * @throws {Error} If device not found or deletion fails
     */
    deleteDevice(id) {
        return this.request(`devices/${id}`, 'DELETE');
    }

    /**
     * Create a new action (scheduled task) for a device.
     * @param {number|string} deviceId - Target device ID
     * @param {object} actionData - Action details (startTime, endTime, consumption, etc.)
     * @returns {Promise<object>} Created action with backend-assigned ID
     * @throws {Error} If device not found or validation fails
     */
    createAction(deviceId, actionData) {
        return this.request(`devices/${deviceId}/actions`, 'POST', actionData);
    }

    /**
     * Delete an action from a device.
     * @param {number|string} deviceId - Parent device ID
     * @param {number|string} actionId - Action ID to delete
     * @returns {Promise<void>}
     * @throws {Error} If action or device not found
     */
    deleteAction(deviceId, actionId) {
        return this.request(`devices/${deviceId}/actions/${actionId}`, 'DELETE');
    }

    /**
     * Fetch the current optimization plan (Gantt chart tasks).
     * @returns {Promise<object>} Plan object with tasks, timeline, batteries, etc.
     * @throws {Error} If no plan exists or backend fails
     */
    fetchPlan() {
        return this.request('plan', 'GET');
    }

    /**
     * Fetch detailed plan data including price forecasts and generation data.
     * @returns {Promise<object>} Contains timeline, pricesCtPerKwh, generationKw, batteries, variableActions
     * @throws {Error} If no plan exists or backend fails
     */
    fetchPlanData() {
        return this.request('plan/data', 'GET');
    }

    /**
     * Fetch current plan generation status (running, hasSchedule, etc.).
     * @returns {Promise<object>} Status object with currentlyRunning, hasSchedule properties
     * @throws {Error} If backend fails
     */
    fetchPlanStatus() {
        return this.request('plan/status', 'GET');
    }

    /**
     * Trigger the optimization algorithm on the backend.
     * This is an async operation - use fetchPlanStatus to check progress.
     * @returns {Promise<void>}
     * @throws {Error} If optimization fails
     */
    generatePlan() {
        return this.request('plan/generate', 'POST');
    }

    /**
     * Fetch the current simulated annealing settings.
     * @returns {Promise<object>} Settings with initial_temperature, cooling_rate, final_temperature, constant_action_move_factor, num_moves_per_step
     * @throws {Error} If backend fails
     */
    fetchSimulatedAnnealingSettings() {
        return this.request('settings/simulated-annealing');
    }

    /**
     * Update simulated annealing settings on the backend.
     * @param {object} settings - Settings object with properties to update (all optional)
     * @returns {Promise<object>} Success message
     * @throws {Error} If backend fails
     */
    updateSimulatedAnnealingSettings(settings) {
        return this.request('settings/simulated-annealing', 'PUT', settings);
    }

    /**
     * Reset simulated annealing settings on the backend to default values.
     * Calls POST /settings/simulated-annealing/reset and returns the default settings object.
     * @returns {Promise<object>} Default simulated annealing settings
     */
    resetSimulatedAnnealingSettings() {
        return this.request('settings/simulated-annealing/reset', 'POST');
    }

    /**
     * Create a new scheduled generator device by uploading a CSV file.
     * The CSV must contain 'timestamp' and 'value' columns.
     * @param {string} name - Name of the generator device
     * @param {File} file - CSV file with schedule data
     * @returns {Promise<object>} Created scheduled generator device
     * @throws {Error} If validation fails or backend rejects
     */
    async createScheduledGenerator(name, file) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('file', file);

        try {
            const res = await fetch(`${this.baseURL}/devices/scheduled-generator`, {
                method: 'POST',
                body: formData
                // Note: Do NOT set Content-Type header - browser will set it with boundary
            });

            if (!res.ok) {
                const errorDetail = await res.json().catch(() => ({}));
                console.error(`[ApiService] Backend Error (${res.status}):`, errorDetail);

                // Handle both string and array error details
                let errorMsg = 'Fehler beim Erstellen des Generators';
                if (Array.isArray(errorDetail.detail)) {
                    errorMsg = errorDetail.detail.map(e => e.msg || e).join(', ');
                } else if (errorDetail.detail) {
                    errorMsg = errorDetail.detail;
                }
                throw new Error(errorMsg);
            }

            return res.json();
        } catch (err) {
            console.error(`[ApiService] Request failed:`, err);
            throw err;
        }
    }

    /**
     * Fetch overview data for the dashboard cards.
     * @returns {Promise<{batteries: Array, actions: Array, generators: Array}>}
     */
    fetchOverview() {
        return this.request("overview", "GET");
    }

}

export default new ApiService();