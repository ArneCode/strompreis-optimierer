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
            }

            return res.json();
        } catch (err) {
            console.error(`[ApiService] Request failed:`, err);
            throw err;
        }
    }

    /** Fetch list of devices */
    fetchDevices() {
        return this.request('devices');
    }

    /** Save a device (maps form data first) */
    saveDevice(rawForm) {
        const cleanData = mapDeviceData(rawForm);
        return this.request('devices', 'POST', cleanData);
    }

    /** Remove all devices */
    resetAllDevices() {
        return this.request('devices', 'DELETE');
    }

    /** Delete a device by id */
    deleteDevice(id) {
        return this.request(`devices/${id}`, 'DELETE');
    }

    /** Create an action for a device */
    createAction(deviceId, actionData) {
        return this.request(`devices/${deviceId}/actions`, 'POST', actionData);
    }

    /** Delete an action */
    deleteAction(deviceId, actionId) {
        return this.request(`devices/${deviceId}/actions/${actionId}`, 'DELETE');
    }

    /** Fetch plan overview */
    fetchPlan() {
        return this.request('plan', 'GET');
    }

    /** Fetch plan data */
    fetchPlanData() {
        return this.request('plan/data', 'GET');
    }

    /** Fetch plan status */
    fetchPlanStatus() {
        return this.request('plan/status', 'GET');
    }

    /** Trigger plan generation on backend */
    generatePlan() {
        return this.request('plan/generate', 'POST');
    }

}

export default new ApiService();