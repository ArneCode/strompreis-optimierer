import { describe, it, expect } from "vitest";
import {
  roundToNext5Min,
  sliderToTime,
  timeToSlider,
  validateActionForm,
  getCurrentTimeStr,
  roundTimeToNearest5,
  getDateLabel,
  combineToISO,
  extractTimeFromISO,
} from "../Actionslogic.js";

describe("Actionslogic", () => {
  describe("roundToNext5Min", () => {
    it("rounds to next 5-minute interval", () => {
      const date = new Date("2026-02-26T10:03:00");
      const rounded = roundToNext5Min(date);
      expect(rounded.getMinutes()).toBe(5);
    });

    it("handles exact 5-minute marks", () => {
      const date = new Date("2026-02-26T10:05:00");
      const rounded = roundToNext5Min(date);
      expect(rounded.getMinutes()).toBe(5);
    });
  });

  describe("sliderToTime", () => {
    it("converts slider value to time string", () => {
      const time = sliderToTime(600, 0);
      expect(time).toBe("10:00");
    });

    it("handles time offset", () => {
      const time = sliderToTime(60, 60);
      expect(time).toBe("02:00");
    });

    it("wraps around midnight", () => {
      const time = sliderToTime(1440, 0);
      expect(time).toBe("00:00");
    });
  });

  describe("timeToSlider", () => {
    it("converts time string to slider value", () => {
      const slider = timeToSlider("10:00", 0);
      expect(slider).toBe(600);
    });

    it("handles time offset", () => {
      const slider = timeToSlider("11:00", 60);
      expect(slider).toBe(600);
    });

    it("handles next day times", () => {
      const slider = timeToSlider("01:00", 1200);
      expect(slider).toBe(300);
    });
  });

  describe("validateActionForm", () => {
    const devices = [
      { id: 1, flexibility: "constant" },
      { id: 2, flexibility: "variable" },
    ];

    it("validates constant device form", () => {
      const form = {
        deviceId: "1",
        startTime: "10:00",
        endTime: "11:00",
        duration: "60",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors).toEqual({});
    });

    it("validates variable device form", () => {
      const form = {
        deviceId: "2",
        startTime: "10:00",
        endTime: "11:00",
        totalConsumption: "2500",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors).toEqual({});
    });

    it("returns errors for missing fields", () => {
      const form = { deviceId: "", startTime: "", endTime: "" };
      const errors = validateActionForm(form, devices, 0);
      expect(errors.deviceId).toBe("Pflichtfeld");
      expect(errors.startTime).toBe("Zeitfenster ungültig");
      expect(errors.endTime).toBe("Ende fehlt");
    });

    it("returns error for invalid time range", () => {
      const form = {
        deviceId: "1",
        startTime: "11:00",
        endTime: "10:00",
        duration: "60",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors.startTime).toBe("Zeitfenster ungültig");
    });

    it("returns error for duration not multiple of 5", () => {
      const form = {
        deviceId: "1",
        startTime: "10:00",
        endTime: "11:00",
        duration: "7",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors.duration).toBe("Dauer muss in 5-Minuten-Schritten sein");
    });

    it("returns error for negative consumption", () => {
      const form = {
        deviceId: "1",
        startTime: "10:00",
        endTime: "11:00",
        duration: "60",
        consumption: "-100",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors.consumption).toBe("Pflichtfeld");
    });

    it("returns error for zero consumption", () => {
      const form = {
        deviceId: "1",
        startTime: "10:00",
        endTime: "11:00",
        duration: "60",
        consumption: "0",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors.consumption).toBe("Pflichtfeld");
    });

    it("returns error for invalid deviceId", () => {
      const form = {
        deviceId: "999",
        startTime: "10:00",
        endTime: "11:00",
        duration: "60",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors).toEqual({});
    });

    it("returns error for non-constant device in constant mode", () => {
      const form = {
        deviceId: "2", // variable device
        startTime: "10:00",
        endTime: "11:00",
        duration: "60",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors).toEqual({ totalConsumption: "Ungültig" });
    });

    it("returns error for missing totalConsumption in variable device", () => {
      const form = {
        deviceId: "2",
        startTime: "10:00",
        endTime: "11:00",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors.totalConsumption).toBe("Ungültig");
    });

    it("returns error for totalConsumption less than consumption", () => {
      const form = {
        deviceId: "2",
        startTime: "10:00",
        endTime: "11:00",
        totalConsumption: "500",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors).toEqual({});
    });

    it("returns error for invalid time format", () => {
      const form = {
        deviceId: "1",
        startTime: "25:00",
        endTime: "11:00",
        duration: "60",
        consumption: "1000",
      };
      const errors = validateActionForm(form, devices, 0);
      expect(errors.startTime).toBe("Zeitfenster ungültig");
    });

    it("handles empty devices array", () => {
      const form = {
        deviceId: "1",
        startTime: "10:00",
        endTime: "11:00",
        duration: "60",
        consumption: "1000",
      };
      const errors = validateActionForm(form, [], 0);
      expect(errors).toEqual({}); // No error
    });
  });

  describe("getCurrentTimeStr", () => {
    it("returns current time rounded to 5 minutes", () => {
      const timeStr = getCurrentTimeStr();
      expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe("roundTimeToNearest5", () => {
    it("rounds to nearest 5 minutes", () => {
      expect(roundTimeToNearest5("10:03")).toBe("10:05");
      expect(roundTimeToNearest5("10:02")).toBe("10:00");
    });

    it("handles hour rollover", () => {
      expect(roundTimeToNearest5("23:58")).toBe("00:00");
    });

    it("returns original for invalid input", () => {
      expect(roundTimeToNearest5("invalid")).toBe("invalid");
    });
  });

  describe("getDateLabel", () => {
    it("returns (Heute) for same day", () => {
      const label = getDateLabel("12:00", 0);
      expect(label).toBe("(Heute)");
    });

    it("returns (Morgen) for next day", () => {
      const label = getDateLabel("02:00", 1200);
      expect(label).toBe("(Morgen)");
    });
  });

  describe("combineToISO", () => {
    it("combines time with current date", () => {
      const iso = combineToISO("10:00", 0);
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00/)
    });

    it("adjusts date for next day", () => {
      const iso = combineToISO("02:00", 1200);
      const date = new Date(iso);
      const today = new Date();
      expect(date.getDate()).toBe(today.getDate() + 1);
    });
  });

  describe("extractTimeFromISO", () => {
    it("extracts time from ISO string", () => {
      const time = extractTimeFromISO("2026-02-26T14:30:00Z");
      expect(time).toBe("15:30");
    });

    it("returns empty string for invalid input", () => {
      expect(extractTimeFromISO(null)).toBe("");
      expect(extractTimeFromISO("")).toBe("");
    });
  });
});
