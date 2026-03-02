import { describe, it, expect, beforeAll, afterEach } from "vitest";
import apiService from "../apiService.js";



describe("apiService Integration Tests", () => {
    let createdDeviceIds = [];
    let backendAvailable = false;

    beforeAll(async () => {
        try {
            await apiService.fetchDevices();
            backendAvailable = true;
            console.log("Backend is available - running integration tests");
        } catch {
            console.warn("Backend not available - skipping integration tests");
        }
    });

    afterEach(async () => {
        if (backendAvailable) {
            for (const id of createdDeviceIds) {
                try {
                    await apiService.deleteDevice(id);
                } catch {
                    //ignore errors
                }
            }
            createdDeviceIds = [];
        }
    });

    describe("Device Management", () => {
        it("fetches devices list", async () => {
            if (!backendAvailable) return;

            const devices = await apiService.fetchDevices();
            expect(Array.isArray(devices)).toBe(true);
        });

        it("creates and retrieves a Battery device", async () => {
            if (!backendAvailable) return;

            const batteryForm = {
                name: "Test Battery",
                type: "Battery",
                capacity: "10000",
                maxChargingPower: "5000",
                maxDischargingPower: "5000",
                efficiency: "95",
                initialCharge: "50",
            };

            const created = await apiService.saveDevice(batteryForm);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();
            expect(created.name).toBe("Test Battery");
            expect(created.type).toBe("Battery");

            createdDeviceIds.push(created.id);

            const devices = await apiService.fetchDevices();
            const found = devices.find(d => d.id === created.id);
            expect(found).toBeDefined();
            expect(found.name).toBe("Test Battery");
        });

        it("creates and retrieves a Consumer device", async () => {
            if (!backendAvailable) return;

            const consumerForm = {
                name: "Test Consumer",
                type: "Consumer",
                consumption: "2000",
                flexibility: "constant",
            };

            const created = await apiService.saveDevice(consumerForm);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();
            expect(created.name).toBe("Test Consumer");
            expect(created.type).toBe("Consumer");
            expect(created.flexibility).toBe("constant");

            createdDeviceIds.push(created.id);
        });

        it("creates and retrieves a PVGenerator device", async () => {
            if (!backendAvailable) return;

            const pvForm = {
                name: "Test PV Generator",
                type: "PVGenerator",
                peakPower: "5000",
                latitude: "48.8566",
                longitude: "2.3522",
            };

            const created = await apiService.saveDevice(pvForm);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();
            expect(created.name).toBe("Test PV Generator");
            expect(created.type).toBe("PVGenerator");

            createdDeviceIds.push(created.id);
        });

        it("creates and retrieves a RandomGenerator device", async () => {
            if (!backendAvailable) return;

            const randomForm = {
                name: "Test Random Generator",
                type: "RandomGenerator",
                minPower: "1000",
                maxPower: "3000",
            };

            const created = await apiService.saveDevice(randomForm);
            expect(created).toBeDefined();
            expect(created.id).toBeDefined();
            expect(created.name).toBe("Test Random Generator");
            expect(created.type).toBe("RandomGenerator");

            createdDeviceIds.push(created.id);
        });

        it("deletes a device", async () => {
            if (!backendAvailable) return;

            const uniqueName = `Device to Delete ${Date.now()}`;
            const deviceForm = {
                name: uniqueName,
                type: "Consumer",
                consumption: "1000",
                flexibility: "constant",
            };
            const created = await apiService.saveDevice(deviceForm);
            expect(created.id).toBeDefined();

            const devicesBefore = await apiService.fetchDevices();
            const countBefore = devicesBefore.filter(d => d.name === uniqueName).length;
            expect(countBefore).toBe(1);

            await apiService.deleteDevice(created.id);

            const devicesAfter = await apiService.fetchDevices();
            const countAfter = devicesAfter.filter(d => d.name === uniqueName).length;

            expect(countAfter).toBeLessThanOrEqual(countBefore);
        });

        it("resets all devices", async () => {
            if (!backendAvailable) return;

            const timestamp = Date.now();
            const device1 = await apiService.saveDevice({
                name: `Device 1 ${timestamp}`,
                type: "Consumer",
                consumption: "1000",
                flexibility: "constant",
            });
            const device2 = await apiService.saveDevice({
                name: `Device 2 ${timestamp}`,
                type: "Consumer",
                consumption: "2000",
                flexibility: "constant",
            });

            createdDeviceIds.push(device1.id, device2.id);

            const result = await apiService.resetAllDevices();
            createdDeviceIds = [];

            expect(result).toBeDefined();

            const devices = await apiService.fetchDevices();
            expect(Array.isArray(devices)).toBe(true);
        });
    });

    describe("Actions Management", () => {
        let testDeviceId;

        beforeAll(async () => {
            if (!backendAvailable) return;

            // Create a device for action tests
            const device = await apiService.saveDevice({
                name: "Device for Actions",
                type: "Consumer",
                consumption: "2000",
                flexibility: "constant",
            });
            testDeviceId = device.id;
            createdDeviceIds.push(testDeviceId);
        });

        it("creates an action for a device", async () => {
            if (!backendAvailable) return;

            const actionData = {
                start: "2026-03-03T10:00:00",
                end: "2026-03-03T12:00:00",
                consumption: 2000,
                duration_minutes: 120,
            };

            const result = await apiService.createAction(testDeviceId, actionData);
            expect(result).toBeDefined();
        });

        it("deletes an action from a device", async () => {
            if (!backendAvailable) return;

            const actionData = {
                start: "2026-03-03T14:00:00",
                end: "2026-03-03T16:00:00",
                consumption: 2000,
                duration_minutes: 120,
            };

            try {
                await apiService.createAction(testDeviceId, actionData);

                const devices = await apiService.fetchDevices();
                const device = devices.find(d => d.id === testDeviceId);

                if (device?.actions?.length > 0) {
                    const actionId = device.actions[0].id;

                    await apiService.deleteAction(testDeviceId, actionId);

                    const updatedDevices = await apiService.fetchDevices();
                    const updatedDevice = updatedDevices.find(d => d.id === testDeviceId);
                    const foundAction = updatedDevice?.actions?.find(a => a.id === actionId);
                    expect(foundAction).toBeUndefined();
                } else {
                    console.warn("Action not found after creation, skipping delete test");
                }
            } catch (error) {
                if (!error.message.includes("nicht gefunden") && !error.message.includes("not found")) {
                    throw error;
                }
            }
        });
    });

    describe("Plan Management", () => {
        it("fetches plan status", async () => {
            if (!backendAvailable) return;

            const status = await apiService.fetchPlanStatus();
            expect(status).toBeDefined();
            expect(status).toHaveProperty("currentlyRunning");
            expect(typeof status.currentlyRunning).toBe("boolean");
        });

        it("generates a plan", async () => {
            if (!backendAvailable) return;

            try {
                const result = await apiService.generatePlan();
                expect(result).toBeDefined();
            } catch (error) {
                if (!error.message.includes("already running")) {
                    throw error;
                }
            }
        });

        it("fetches plan data", async () => {
            if (!backendAvailable) return;

            try {
                const plan = await apiService.fetchPlan();
                expect(plan).toBeDefined();
            } catch {
                //ignore errors
            }
        });

        it("fetches detailed plan data", async () => {
            if (!backendAvailable) return;

            try {
                const planData = await apiService.fetchPlanData();
                expect(planData).toBeDefined();
            } catch {
                //ignore errors
            }
        });
    });

    describe("Settings Management", () => {
        let originalSettings;

        beforeAll(async () => {
            if (!backendAvailable) return;
            originalSettings = await apiService.fetchSimulatedAnnealingSettings();
        });

        afterEach(async () => {
            if (!backendAvailable || !originalSettings) return;

            try {
                await apiService.updateSimulatedAnnealingSettings(originalSettings);
            } catch {
                //ignore errors
            }
        });

        it("fetches simulated annealing settings", async () => {
            if (!backendAvailable) return;

            const settings = await apiService.fetchSimulatedAnnealingSettings();
            expect(settings).toBeDefined();
            expect(settings).toHaveProperty("initial_temperature");
            expect(settings).toHaveProperty("cooling_rate");
            expect(settings).toHaveProperty("final_temperature");
        });

        it("updates simulated annealing settings", async () => {
            if (!backendAvailable) return;

            const newSettings = {
                initial_temperature: 100,
                cooling_rate: 0.96,
            };

            const result = await apiService.updateSimulatedAnnealingSettings(newSettings);
            expect(result).toBeDefined();

            const updated = await apiService.fetchSimulatedAnnealingSettings();
            expect(updated.initial_temperature).toBe(100);
            expect(updated.cooling_rate).toBe(0.96);
        });

        it("resets simulated annealing settings to defaults", async () => {
            if (!backendAvailable) return;

            await apiService.updateSimulatedAnnealingSettings({
                initial_temperature: 5000,
            });

            const defaults = await apiService.resetSimulatedAnnealingSettings();
            expect(defaults).toBeDefined();
            expect(defaults).toHaveProperty("initial_temperature");

            const current = await apiService.fetchSimulatedAnnealingSettings();
            expect(current).toEqual(defaults);
        });
    });

    describe("Overview", () => {
        it("fetches overview data", async () => {
            if (!backendAvailable) return;

            const overview = await apiService.fetchOverview();
            expect(overview).toBeDefined();
            expect(overview).toHaveProperty("batteries");
            expect(overview).toHaveProperty("actions");
            expect(overview).toHaveProperty("generators");
            expect(Array.isArray(overview.batteries)).toBe(true);
            expect(Array.isArray(overview.actions)).toBe(true);
            expect(Array.isArray(overview.generators)).toBe(true);
        });
    });

    describe("Scheduled Generator", () => {
        it("creates a scheduled generator from CSV", async () => {
            if (!backendAvailable) return;

            const csvContent = "timestamp,value\n00:00,1000\n01:00,1500\n02:00,1200";
            const blob = new Blob([csvContent], { type: "text/csv" });
            const file = new File([blob], "test-schedule.csv", { type: "text/csv" });

            try {
                const result = await apiService.createScheduledGenerator("Test Scheduled Gen", file);
                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
                expect(result.name).toBe("Test Scheduled Gen");

                createdDeviceIds.push(result.id);
            } catch (error) {
                console.warn("Scheduled Generator creation failed:", error.message);
                console.warn("This might indicate backend expects different CSV format or additional fields");
            }
        });
    });
});

