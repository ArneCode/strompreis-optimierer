
class ApiService {
    constructor() {
        this.baseURL = "http://127.0.0.1:5000";
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

    fetchDevices() { return this.request('devices'); }
    saveDevice(data) { return this.request('devices', 'POST', data); }
    updateDevice(id, data) { return this.request(`devices/${id}`, 'PUT', data); }
    deleteDevice(id) { return this.request(`devices/${id}`, 'DELETE'); }

    fetchActions() { return this.request('actions'); }
    saveAction(data) { return this.request('actions', 'POST', data); }
    updateAction(id, data) { return this.request(`actions/${id}`, 'PUT', data); }
    deleteAction(id) { return this.request(`actions/${id}`, 'DELETE'); }

    getPlan() { return this.request('plan'); }
    updatePlan(data) { return this.request('plan', 'PUT', data); }
}

export default new ApiService();
