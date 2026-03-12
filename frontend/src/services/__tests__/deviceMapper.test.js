import { describe, it, expect } from "vitest";
import { mapDeviceData, azimuthToAlignment, prepareDeviceForForm } from "../deviceMapper.js";

describe("deviceMapper", () => {
  describe("mapDeviceData", () => {
    it("maps Battery data correctly", () => {
      const rawForm = {
        name: "Test Battery",
        type: "Battery",
        capacity: "100",
        currentCharge: "50",
        maxChargeRate: "10",
        maxDischarge: "10",
        efficiency: "95"
      };
      const result = mapDeviceData(rawForm);
      expect(result).toEqual({
        name: "Test Battery",
        type: "Battery",
        capacity: 100,
        currentCharge: 50,
        maxChargeRate: 10,
        maxDischarge: 10,
        efficiency: 0.95
      });
    });

    it("converts efficiency percentage to decimal for Battery", () => {
      const rawForm = {
        name: "Test Battery",
        type: "Battery",
        capacity: "100",
        currentCharge: "50",
        maxChargeRate: "10",
        maxDischarge: "10",
        efficiency: "95"
      };
      const result = mapDeviceData(rawForm);
      expect(result.efficiency).toBe(0.95);
    });

    it("maps Consumer data correctly", () => {
      const rawForm = {
        name: "Test Consumer",
        type: "Consumer",
        flexibility: "variable"
      };
      const result = mapDeviceData(rawForm);
      expect(result).toEqual({
        name: "Test Consumer",
        type: "Consumer",
        flexibility: "variable"
      });
    });

    it("maps PVGenerator data correctly", () => {
      const rawForm = {
        name: "Test PV",
        type: "PVGenerator",
        ratedPower: "5",
        angleOfInclination: "30",
        alignment: "Süd",
        location: "Berlin",
        lat: "52.5",
        lng: "13.4"
      };
      const result = mapDeviceData(rawForm);
      expect(result).toEqual({
        name: "Test PV",
        type: "PVGenerator",
        peakPower: 5,
        declination: 30,
        location: "Berlin",
        azimuth: 180,
        latitude: 52.5,
        longitude: 13.4
      });
    });

    it("maps RandomGenerator data correctly", () => {
      const rawForm = {
        name: "Test Random",
        type: "RandomGenerator",
        peakPower: "10"
      };
      const result = mapDeviceData(rawForm);
      expect(result).toEqual({
        name: "Test Random",
        type: "RandomGenerator",
        peakPower: 10
      });
    });

    it("maps unknown type with basic data", () => {
      const rawForm = {
        name: "Test Unknown",
        type: "Unknown"
      };
      const result = mapDeviceData(rawForm);
      expect(result).toEqual({
        name: "Test Unknown",
        type: "Unknown"
      });
    });

    it("handles missing or invalid numeric values", () => {
      const rawForm = {
        name: "Test Battery",
        type: "Battery",
        capacity: "invalid",
        currentCharge: "",
        maxChargeRate: "10",
        maxDischarge: "10",
        efficiency: "95"
      };
      const result = mapDeviceData(rawForm);
      expect(result.capacity).toBe(0);
      expect(result.currentCharge).toBe(0);
      expect(result.maxChargeRate).toBe(10);
    });
  });

  describe("azimuthToAlignment", () => {
    it("returns Süd for null/undefined/NaN", () => {
      expect(azimuthToAlignment(null)).toBe("Süd");
      expect(azimuthToAlignment(undefined)).toBe("Süd");
      expect(azimuthToAlignment(NaN)).toBe("Süd");
      expect(azimuthToAlignment("invalid")).toBe("Süd");
    });

    it("maps exact angles correctly", () => {
      expect(azimuthToAlignment(0)).toBe("Nord");
      expect(azimuthToAlignment(90)).toBe("Ost");
      expect(azimuthToAlignment(180)).toBe("Süd");
      expect(azimuthToAlignment(270)).toBe("West");
    });

    it("maps approximate angles to nearest direction", () => {
      expect(azimuthToAlignment(45)).toBe("Nordost");
      expect(azimuthToAlignment(135)).toBe("Südost");
      expect(azimuthToAlignment(225)).toBe("Südwest");
      expect(azimuthToAlignment(315)).toBe("Nordwest");
    });

    it("handles angles over 360", () => {
      expect(azimuthToAlignment(405)).toBe("Nordost");
    });

    it("handles negative angles", () => {
      expect(azimuthToAlignment(-45)).toBe("Nordwest");
    });
  });

  describe("prepareDeviceForForm", () => {
    it("returns device unchanged if no special handling needed", () => {
      const device = { id: 1, name: "Test", type: "Battery" };
      expect(prepareDeviceForForm(device)).toEqual(device);
    });

    it("converts ScheduledGenerator to Generator", () => {
      const device = { id: 1, name: "Test", type: "ScheduledGenerator" };
      const result = prepareDeviceForForm(device);
      expect(result.type).toBe("Generator");
    });

    it("converts numeric azimuth to alignment string", () => {
      const device = { id: 1, name: "Test", type: "PVGenerator", azimuth: 180 };
      const result = prepareDeviceForForm(device);
      expect(result.alignment).toBe("Süd");
    });

    it("converts numeric alignment to alignment string", () => {
      const device = { id: 1, name: "Test", type: "PVGenerator", alignment: 90 };
      const result = prepareDeviceForForm(device);
      expect(result.alignment).toBe("Ost");
    });

    it("handles empty device object", () => {
      expect(prepareDeviceForForm({})).toEqual({});
    });

    it("converts efficiency from decimal to percentage for Battery", () => {
      const device = { id: 1, name: "Test Battery", type: "Battery", efficiency: 0.95 };
      const result = prepareDeviceForForm(device);
      expect(result.efficiency).toBe(95);
    });

    it("converts efficiency for Battery with different values", () => {
      const device1 = { id: 1, name: "Test Battery", type: "Battery", efficiency: 0.9 };
      expect(prepareDeviceForForm(device1).efficiency).toBe(90);

      const device2 = { id: 2, name: "Test Battery", type: "Battery", efficiency: 0.5 };
      expect(prepareDeviceForForm(device2).efficiency).toBe(50);

      const device3 = { id: 3, name: "Test Battery", type: "Battery", efficiency: 1.0 };
      expect(prepareDeviceForForm(device3).efficiency).toBe(100);
    });

  });
});
