import { describe, it, expect } from "vitest";
import {
  translateDevice,
  RULES,
  DEVICE_VALIDATION_SCHEME,
  INITIAL_DEVICE_FORM,
} from "../DevicesLogic.js";

describe("DevicesLogic", () => {
  describe("translateDevice", () => {
    it("translates known device types", () => {
      expect(translateDevice("Battery")).toBe("Speicher");
      expect(translateDevice("Consumer")).toBe("Verbraucher");
      expect(translateDevice("Generator")).toBe("Erzeuger");
      expect(translateDevice("PVGenerator")).toBe("PV-Anlage");
      expect(translateDevice("RandomGenerator")).toBe("Zufallsgenerator");
    });

    it("returns key for unknown types", () => {
      expect(translateDevice("Unknown")).toBe("Unknown");
    });

    it("handles null/undefined", () => {
      expect(translateDevice(null)).toBe(null);
      expect(translateDevice(undefined)).toBe(undefined);
    });

    it("handles ScheduledGenerator", () => {
      expect(translateDevice("ScheduledGenerator")).toBe("Erzeuger");
    });
  });

  describe("RULES", () => {
    describe("required", () => {
      it("returns null for truthy values", () => {
        expect(RULES.required("test")).toBe(null);
        expect(RULES.required(1)).toBe(null);
      });

      it("returns error for falsy values", () => {
        expect(RULES.required("")).toBe("Pflichtfeld");
        expect(RULES.required(null)).toBe("Pflichtfeld");
        expect(RULES.required(undefined)).toBe("Pflichtfeld");
      });
    });

    describe("number", () => {
      it("returns null for valid numbers", () => {
        expect(RULES.number("123")).toBe(null);
        expect(RULES.number("123.45")).toBe(null);
        expect(RULES.number(123)).toBe(null);
      });

      it("returns error for invalid numbers", () => {
        expect(RULES.number("abc")).toBe("Gib eine Zahl an");
      });
    });

    describe("positive", () => {
      it("returns null for positive numbers", () => {
        expect(RULES.positive("1")).toBe(null);
        expect(RULES.positive("0.1")).toBe(null);
        expect(RULES.positive(5)).toBe(null);
      });

      it("returns error for non-positive numbers", () => {
        expect(RULES.positive("0")).toBe("Muss > 0 sein");
        expect(RULES.positive("-1")).toBe("Muss > 0 sein");
      });
    });

    describe("efficiencyRange", () => {
      it("returns null for valid efficiency", () => {
        expect(RULES.efficiencyRange("50")).toBe(null);
        expect(RULES.efficiencyRange("100")).toBe(null);
        expect(RULES.efficiencyRange("0.1")).toBe(null);
      });

      it("returns error for invalid efficiency", () => {
        expect(RULES.efficiencyRange("0")).toBe("0-100%!");
        expect(RULES.efficiencyRange("101")).toBe("0-100%!");
        expect(RULES.efficiencyRange("-1")).toBe("0-100%!");
      });
    });

    describe("angleRange", () => {
      it("returns null for valid angles", () => {
        expect(RULES.angleRange("45")).toBe(null);
        expect(RULES.angleRange("0")).toBe(null);
        expect(RULES.angleRange("90")).toBe(null);
      });

      it("returns error for invalid angles", () => {
        expect(RULES.angleRange("-1")).toBe("0°-90°!");
        expect(RULES.angleRange("91")).toBe("0°-90°!");
      });
    });
  });

  describe("DEVICE_VALIDATION_SCHEME", () => {
    it("has correct structure for Generator", () => {
      expect(DEVICE_VALIDATION_SCHEME.Generator).toEqual({
        forecast: [RULES.required],
      });
    });

    it("has correct structure for PVGenerator", () => {
      expect(DEVICE_VALIDATION_SCHEME.PVGenerator).toEqual({
        ratedPower: [RULES.required, RULES.number, RULES.positive],
        angleOfInclination: [RULES.required, RULES.number, RULES.angleRange],
        alignment: [RULES.required],
        location: [RULES.required],
      });
    });

    it("has correct structure for RandomGenerator", () => {
      expect(DEVICE_VALIDATION_SCHEME.RandomGenerator).toEqual({
        peakPower: [RULES.required, RULES.number, RULES.positive],
      });
    });

    it("has correct structure for Consumer", () => {
      expect(DEVICE_VALIDATION_SCHEME.Consumer).toEqual({
        flexibility: [RULES.required],
      });
    });

    it("has correct structure for Battery", () => {
      expect(DEVICE_VALIDATION_SCHEME.Battery).toEqual({
        capacity: [RULES.required, RULES.number, RULES.positive],
        currentCharge: [RULES.required, RULES.number, RULES.positive],
        maxChargeRate: [RULES.required, RULES.number, RULES.positive],
        maxDischarge: [RULES.required, RULES.number, RULES.positive],
        efficiency: [RULES.required, RULES.number, RULES.efficiencyRange],
      });
    });
  });

  describe("INITIAL_DEVICE_FORM", () => {
    it("has all required fields", () => {
      expect(INITIAL_DEVICE_FORM).toEqual({
        name: "",
        type: "Generator",
        ratedPower: "",
        angleOfInclination: "",
        alignment: "Süd",
        location: "",
        lat: null,
        lng: null,
        forecast: "",
        flexibility: "constant",
        capacity: "",
        maxDischarge: "",
        maxChargeRate: "",
        currentCharge: "",
        efficiency: "",
        peakPower: "",
      });
    });
  });
});
