import { mapDeviceData } from './deviceMapper';

class ApiService {
    constructor() {
        this.baseURL = "http://127.0.0.1:5000/api";
    }

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

    fetchDevices() {
        return this.request('devices');
    }

    saveDevice(rawForm) {
        const cleanData = mapDeviceData(rawForm);
        return this.request('devices', 'POST', cleanData);
    }

    resetAllDevices() {
        return this.request('devices', 'DELETE');
    }

    deleteDevice(id) {
        return this.request(`devices/${id}`, 'DELETE');
    }

    createAction(deviceId, actionData) {
        return this.request(`devices/${deviceId}/actions`, 'POST', actionData);
    }

    deleteAction(deviceId, actionId) {
        return this.request(`devices/${deviceId}/actions/${actionId}`, 'DELETE');
    }

    fetchPlan() {
        return this.request('plan', 'GET');
    }

    fetchPlanData() {
        return this.request('plan/data', 'GET');
    }

    runOptimization() {
        return this.request("plan/optimize", 'POST');
    }
}

export default new ApiService();