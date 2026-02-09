
class ApiService {
    constructor() {
        this.baseURL = "http://127.0.0.1:5000/api"; // Wichtig: /api Prefix
    }

    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (data) options.body = JSON.stringify(data);

        const res = await fetch(`${this.baseURL}/${endpoint}`, options);
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        return res.json();
    }

    fetchDevices() {
        return this.request('devices');
    }

    saveDevice(data) {
        return this.request('devices', 'POST', data);
    }

    resetAllDevices() {
        return this.request('devices', 'DELETE');
    }

    deleteDevice(id) {
        return this.request(`devices/${id}`, 'DELETE');
    }

    saveAction(deviceId, actionData) {
        return this.request(`devices/${deviceId}/actions`, 'POST', actionData);
    }

    deleteAction(deviceId, actionId) {
        return this.request(`devices/${deviceId}/actions/${actionId}`, 'DELETE');
    }

}

export default new ApiService();