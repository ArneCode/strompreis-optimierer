import { describe, it, expect, vi, beforeEach } from "vitest";
import apiService from "../apiService.js";


const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe("apiService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({}),
        });
    });

    describe("request", () => {
        it("makes GET request with correct URL and headers", async () => {
            await apiService.request("test-endpoint");

            expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/test-endpoint", {
                method: "GET",
                headers: {"Content-Type": "application/json"},
            });
        });

        it("makes POST request with data", async () => {
            const data = {key: "value"};
            await apiService.request("test-endpoint", "POST", data);

            expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/test-endpoint", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data),
            });
        });

        it("returns parsed JSON on success", async () => {
            const mockResponse = {success: true};
            fetchMock.mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockResponse),
            });

            const result = await apiService.request("test-endpoint");
            expect(result).toEqual(mockResponse);
        });

        it("throws error on network failure", async () => {
            const error = new Error("Network error");
            fetchMock.mockRejectedValue(error);

            await expect(apiService.request("test-endpoint")).rejects.toThrow("Network error");
        });


        describe("fetchDevices", () => {
            it("calls request with correct endpoint", async () => {
                await apiService.fetchDevices();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/devices", expect.any(Object));
            });
        });

        describe("saveDevice", () => {
            it("calls request with POST and mapped data", async () => {
                const rawForm = {name: "Test", type: "Battery", capacity: "100"};
                await apiService.saveDevice(rawForm);

                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/devices", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: expect.stringContaining('"name":"Test"'),
                });
            });
        });

        describe("resetAllDevices", () => {
            it("calls request with DELETE", async () => {
                await apiService.resetAllDevices();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/devices", {
                    method: "DELETE",
                    headers: {"Content-Type": "application/json"},
                });
            });
        });

        describe("deleteDevice", () => {
            it("calls request with DELETE and device ID", async () => {
                await apiService.deleteDevice(123);
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/devices/123", {
                    method: "DELETE",
                    headers: {"Content-Type": "application/json"},
                });
            });
        });

        describe("createAction", () => {
            it("calls request with POST for device action", async () => {
                const actionData = {startTime: "10:00", endTime: "11:00"};
                await apiService.createAction(1, actionData);

                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/devices/1/actions", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(actionData),
                });
            });
        });

        describe("deleteAction", () => {
            it("calls request with DELETE for device action", async () => {
                await apiService.deleteAction(1, 2);
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/devices/1/actions/2", {
                    method: "DELETE",
                    headers: {"Content-Type": "application/json"},
                });
            });
        });

        describe("fetchPlan", () => {
            it("calls request for plan endpoint", async () => {
                await apiService.fetchPlan();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/plan", expect.any(Object));
            });
        });

        describe("fetchPlanData", () => {
            it("calls request for plan/data endpoint", async () => {
                await apiService.fetchPlanData();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/plan/data", expect.any(Object));
            });
        });

        describe("fetchPlanStatus", () => {
            it("calls request for plan/status endpoint", async () => {
                await apiService.fetchPlanStatus();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/plan/status", expect.any(Object));
            });
        });

        describe("generatePlan", () => {
            it("calls request with POST for plan/generate", async () => {
                await apiService.generatePlan();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/plan/generate", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                });
            });
        });

        describe("fetchSimulatedAnnealingSettings", () => {
            it("calls request for settings/simulated-annealing", async () => {
                await apiService.fetchSimulatedAnnealingSettings();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/settings/simulated-annealing", expect.any(Object));
            });
        });

        describe("updateSimulatedAnnealingSettings", () => {
            it("calls request with PUT for settings update", async () => {
                const settings = {initial_temperature: 1000};
                await apiService.updateSimulatedAnnealingSettings(settings);

                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/settings/simulated-annealing", {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(settings),
                });
            });
        });

        describe("resetSimulatedAnnealingSettings", () => {
            it("calls request with POST for settings reset", async () => {
                await apiService.resetSimulatedAnnealingSettings();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/settings/simulated-annealing/reset", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                });
            });
        });

        describe("createScheduledGenerator", () => {
            it("makes FormData request for scheduled generator", async () => {
                const mockFile = new File(["content"], "test.csv", {type: "text/csv"});
                fetchMock.mockResolvedValue({
                    ok: true,
                    json: vi.fn().mockResolvedValue({id: 1}),
                });

                const result = await apiService.createScheduledGenerator("Test Generator", mockFile);

                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/devices/scheduled-generator", {
                    method: "POST",
                    body: expect.any(FormData),
                });
                expect(result).toEqual({id: 1});
            });

            it("throws error on backend failure", async () => {
                const mockFile = new File(["content"], "test.csv", {type: "text/csv"});
                fetchMock.mockResolvedValue({
                    ok: false,
                    status: 400,
                    json: vi.fn().mockResolvedValue({detail: "Invalid CSV"}),
                });

                await expect(apiService.createScheduledGenerator("Test", mockFile)).rejects.toThrow("Invalid CSV");
            });
        });

        describe("fetchOverview", () => {
            it("calls request for overview endpoint", async () => {
                await apiService.fetchOverview();
                expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5000/api/overview", expect.any(Object));
            });
        });
    });
});