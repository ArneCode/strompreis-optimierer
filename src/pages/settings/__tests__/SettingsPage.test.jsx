import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "../SettingsPage.jsx";
import apiService from "../../../services/apiService.js";

vi.mock("../../../services/apiService.js", () => ({
  default: {
    fetchSimulatedAnnealingSettings: vi.fn(),
    updateSimulatedAnnealingSettings: vi.fn(),
    resetSimulatedAnnealingSettings: vi.fn(),
    fetchDevices: vi.fn(),
    resetAllDevices: vi.fn(),
  },
}));

describe("SettingsPage", () => {
  const mockSettings = {
    initial_temperature: 100,
    cooling_rate: 0.95,
    final_temperature: 1,
    constant_action_move_factor: 0.5,
    num_moves_per_step: 5,
  };

  const mockDevices = [
    {
      id: 1,
      name: "Device 1",
      flexibility: "constant",
      actions: [{ id: 1 }, { id: 2 }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    apiService.fetchSimulatedAnnealingSettings.mockResolvedValue(mockSettings);
    apiService.fetchDevices.mockResolvedValue(mockDevices);
  });


  describe("Edit Settings", () => {
    it("loads settings on mount", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(apiService.fetchSimulatedAnnealingSettings).toHaveBeenCalled();
      });
    });

    it("opens edit mode", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-edit-open"));
      });

      expect(screen.getByTestId("settings-initial-temperature")).toBeInTheDocument();
    });

    it("cancels edit without saving", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-edit-open"));
      });

      fireEvent.change(screen.getByTestId("settings-initial-temperature"), { target: { value: "999" } });
      fireEvent.click(screen.getByTestId("settings-edit-cancel"));

      expect(screen.queryByTestId("settings-edit-form")).not.toBeInTheDocument();
    });

    it("saves settings successfully", async () => {
      apiService.updateSimulatedAnnealingSettings.mockResolvedValue({});

      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-edit-open"));
      });

      // Change cooling_rate and final_temperature to fix validation issues
      fireEvent.change(screen.getByTestId("settings-cooling-rate"), { target: { value: "0.90" } });
      fireEvent.change(screen.getByTestId("settings-final-temperature"), { target: { value: "0.5" } });
      fireEvent.change(screen.getByTestId("settings-num-moves"), { target: { value: "2" } });
      fireEvent.click(screen.getByTestId("settings-edit-save"));

      await waitFor(() => {
        expect(apiService.updateSimulatedAnnealingSettings).toHaveBeenCalled();
      });
    });

    it("validates empty initial_temperature", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-edit-open"));
      });

      fireEvent.change(screen.getByTestId("settings-initial-temperature"), { target: { value: "" } });
      fireEvent.click(screen.getByTestId("settings-edit-save"));

      await waitFor(() => {
        expect(screen.getByTestId("settings-initial-temperature-error")).toBeInTheDocument();
      });
    });

    it("validates cooling_rate range", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-edit-open"));
      });

      fireEvent.change(screen.getByTestId("settings-cooling-rate"), { target: { value: "1.5" } });
      fireEvent.click(screen.getByTestId("settings-edit-save"));

      await waitFor(() => {
        expect(screen.getByTestId("settings-cooling-rate-error")).toBeInTheDocument();
      });
    });

    it("does not save invalid settings", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-edit-open"));
      });

      fireEvent.change(screen.getByTestId("settings-initial-temperature"), { target: { value: "" } });
      fireEvent.click(screen.getByTestId("settings-edit-save"));

      expect(apiService.updateSimulatedAnnealingSettings).not.toHaveBeenCalled();
    });
  });

  describe("Reset SA Settings", () => {
    it("opens reset confirmation dialog", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-sa-reset-open"));
      });

      expect(screen.getByTestId("settings-sa-reset-modal")).toBeInTheDocument();
    });

    it("cancels reset dialog", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-sa-reset-open"));
      });

      fireEvent.click(screen.getByTestId("settings-sa-reset-cancel"));

      expect(screen.queryByTestId("settings-sa-reset-modal")).not.toBeInTheDocument();
    });

    it("resets settings to default values", async () => {
      const defaultSettings = {
        initial_temperature: 500,
        cooling_rate: 0.99,
        final_temperature: 0.1,
        constant_action_move_factor: 1,
        num_moves_per_step: 10,
      };
      apiService.resetSimulatedAnnealingSettings.mockResolvedValue(defaultSettings);

      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-sa-reset-open"));
      });

      fireEvent.click(screen.getByTestId("settings-sa-reset-confirm"));

      await waitFor(() => {
        expect(apiService.resetSimulatedAnnealingSettings).toHaveBeenCalled();
      });
    });

    it("shows error on reset failure", async () => {
      apiService.resetSimulatedAnnealingSettings.mockRejectedValue(new Error("Server error"));

      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-sa-reset-open"));
      });

      fireEvent.click(screen.getByTestId("settings-sa-reset-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("settings-error")).toBeInTheDocument();
      });
    });
  });

  describe("Reset Household", () => {
    it("opens reset household confirmation dialog", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-house-reset-open"));
      });

      expect(screen.getByTestId("settings-house-reset-modal")).toBeInTheDocument();
    });

    it("cancels household reset", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-house-reset-open"));
      });

      fireEvent.click(screen.getByTestId("settings-house-reset-cancel"));

      expect(screen.queryByTestId("settings-house-reset-modal")).not.toBeInTheDocument();
    });

    it("resets household successfully", async () => {
      apiService.resetAllDevices.mockResolvedValue({});

      render(<SettingsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("settings-house-reset-open"));
      });

      fireEvent.click(screen.getByTestId("settings-house-reset-confirm"));

      await waitFor(() => {
        expect(apiService.resetAllDevices).toHaveBeenCalled();
      });
    });
  });
});





