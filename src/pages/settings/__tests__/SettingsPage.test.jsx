import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import SettingsPage from "../SettingsPage.jsx";
import apiService from "../../../services/apiService";

// Mock apiService
vi.mock("../../../services/apiService", () => ({
  default: {
    fetchSimulatedAnnealingSettings: vi.fn(),
    updateSimulatedAnnealingSettings: vi.fn(),
    fetchDevices: vi.fn(),
    resetAllDevices: vi.fn(),
  },
}));

describe("SettingsPage", () => {
  const mockSettings = {
    initial_temperature: "1000",
    cooling_rate: "0.95",
    final_temperature: "1",
    constant_action_move_factor: "0.1",
    num_moves_per_step: "10",
  };

  const mockDevices = [
    {
      id: 1,
      name: "Device 1",
      type: "Consumer",
      flexibility: "constant",
      actions: [{ id: 1 }, { id: 2 }],
    },
    {
      id: 2,
      name: "Device 2",
      type: "Generator",
      flexibility: "variable",
      actions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    apiService.fetchSimulatedAnnealingSettings.mockResolvedValue(mockSettings);
    apiService.fetchDevices.mockResolvedValue(mockDevices);
  });

  it("renders loading state initially", () => {
    act(() => {
      render(<SettingsPage />);
    });
    expect(screen.getByText("Einstellungen werden geladen...")).toBeInTheDocument();
  });

  it("loads and displays settings on mount", async () => {
    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchSimulatedAnnealingSettings).toHaveBeenCalled();
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    expect(screen.getByText("1000")).toBeInTheDocument();
    expect(screen.getByText("0.95")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // constant actions count
  });

  it("shows error on settings load failure", async () => {
    apiService.fetchSimulatedAnnealingSettings.mockRejectedValue(new Error("Load failed"));

    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Fehler beim Laden der Einstellungen: Load failed")).toBeInTheDocument();
    });
  });

  it("allows editing settings", async () => {
    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /bearbeiten/i });
    act(() => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const input = screen.getByDisplayValue("1000");
      fireEvent.change(input, { target: { value: "2000" } });
      expect(input.value).toBe("2000");
    });
  });

  it("saves settings successfully", async () => {
    apiService.updateSimulatedAnnealingSettings.mockResolvedValue();

    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /bearbeiten/i });
    act(() => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const input = screen.getByDisplayValue("1000");
      fireEvent.change(input, { target: { value: "2000" } });
    });

    const saveButton = screen.getByRole("button", { name: /speichern/i });
    act(() => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(apiService.updateSimulatedAnnealingSettings).toHaveBeenCalledWith({
        ...mockSettings,
        initial_temperature: "2000",
      });
      expect(screen.getByText("Einstellungen erfolgreich gespeichert!")).toBeInTheDocument();
    });
  });

  it("shows error on save failure", async () => {
    apiService.updateSimulatedAnnealingSettings.mockRejectedValue(new Error("Save failed"));

    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /bearbeiten/i });
    act(() => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /speichern/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Fehler beim Speichern: Save failed")).toBeInTheDocument();
    });
  });

  it("cancels editing", async () => {
    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /bearbeiten/i });
    act(() => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const input = screen.getByDisplayValue("1000");
      fireEvent.change(input, { target: { value: "2000" } });
    });

    const cancelButton = screen.getByRole("button", { name: /abbrechen/i });
    act(() => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument(); // back to original
    });
  });

  it("opens reset confirmation modal", async () => {
    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /haushalt zurücksetzen/i });
    act(() => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Haushalt zurücksetzen")).toBeInTheDocument();
    });
  });

  it("resets devices successfully", async () => {
    apiService.resetAllDevices.mockResolvedValue();

    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /haushalt zurücksetzen/i });
    act(() => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      const confirmButton = screen.getByRole("button", { name: /bestätigen/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(apiService.resetAllDevices).toHaveBeenCalled();
      expect(screen.getByText("Haushalt erfolgreich zurückgesetzt!")).toBeInTheDocument();
    });
  });

  it("shows error on reset failure", async () => {
    apiService.resetAllDevices.mockRejectedValue(new Error("Reset failed"));

    act(() => {
      render(<SettingsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1000")).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /haushalt zurücksetzen/i });
    act(() => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      const confirmButton = screen.getByRole("button", { name: /bestätigen/i });
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Fehler beim Zurücksetzen: Reset failed")).toBeInTheDocument();
    });
  });
});
