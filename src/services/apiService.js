class ApiService {
    constructor() {
        this.baseURL = "http://127.0.0.1:5000/api";
    }

    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (data) options.body = JSON.stringify(data);

        const res = await fetch(`${this.baseURL}/${endpoint}`, options);

        if (!res.ok) {
            const errorDetail = await res.json().catch(() => ({}));
            console.error("Backend Fehler Details:", errorDetail);
            throw new Error(`Fehler: ${res.status}`);
        }
        return res.json();
    }

    fetchDevices() {
        return this.request('devices');
    }

    saveDevice(rawForm) {
        const cleanData = {
            name: rawForm.name,
            type: rawForm.type,
        };

        if (rawForm.type === "Battery") {
            cleanData.capacity = parseFloat(rawForm.capacity) || 0;
            cleanData.currentCharge = parseFloat(rawForm.currentCharge) || 0;
            cleanData.maxChargeRate = parseFloat(rawForm.maxChargeRate) || 0;
            cleanData.maxDischarge = parseFloat(rawForm.maxDischarge) || 0;

            let eff = parseFloat(rawForm.efficiency) || 0.95;
            cleanData.efficiency = eff > 1 ? eff / 100 : eff;
        }
        else if (rawForm.type === "Consumer") {
            cleanData.power = parseFloat(rawForm.power) || 0;
            cleanData.duration = parseInt(rawForm.duration) || 0;
            cleanData.flexibility = rawForm.flexibility || "constant";
        }
        else if (rawForm.type === "PVGenerator") {
            cleanData.ratedPower = parseFloat(rawForm.ratedPower) || 0;
            cleanData.angleOfInclination = parseFloat(rawForm.angleOfInclination) || 0;
            cleanData.alignment = rawForm.alignment;
            cleanData.location = rawForm.location;
            cleanData.lat = rawForm.lat ? parseFloat(rawForm.lat) : null;
            cleanData.lng = rawForm.lng ? parseFloat(rawForm.lng) : null;
        }

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
        return this.request('plan/data', 'GET')
    }
}

export default new ApiService();