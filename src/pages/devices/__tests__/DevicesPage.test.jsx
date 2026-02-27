import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DevicesPage from "../DevicesPage.jsx";
import apiService from "../../../services/apiService";
import { prepareDeviceForForm } from "../../../services/deviceMapper.js";

// Mock apiService
vi.mock("../../../services/apiService", () => ({
  default: {
    fetchDevices: vi.fn(),
    saveDevice: vi.fn(),
    deleteDevice: vi.fn(),
    createScheduledGenerator: vi.fn(),
  },
}));

// Mock deviceMapper
vi.mock("../../../services/deviceMapper.js", () => ({
  prepareDeviceForForm: vi.fn((device) => device),
}));

vi.mock("../DevicesLogic.js", async () => {
  const actual = await vi.importActual("../DevicesLogic.js");
  return {
    ...actual,
    validateDevice: vi.fn(() => ({})),
  };
});

vi.mock("../DeviceModal", () => ({
  default: ({ isOpen, onSave, onDelete, errorMessage }) => (
    isOpen ? (
      <div data-testid="device-modal">
        <button onClick={() => onSave(false)}>Save New</button>
        <button onClick={() => onSave(true)}>Save Edit</button>
        <button onClick={onDelete}>Delete</button>
        {errorMessage && <div>{errorMessage}</div>}
      </div>
    ) : null
  ),
}));

describe("DevicesPage", () => {
  const mockDevices = [
    { id: 1, name: "Device 1", type: "Generator", forecast: "file1.csv" },
    { id: 2, name: "Device 2", type: "Battery", capacity: "100" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    apiService.fetchDevices.mockResolvedValue(mockDevices);
    prepareDeviceForForm.mockImplementation((device) => device);
  });

  it("renders loading state initially", async () => {
    act(() => {
      render(<DevicesPage />);
    });
    await waitFor(() => {
      expect(screen.getByText("Geräte")).toBeInTheDocument();
    });
  });

  it("loads and displays devices on mount", async () => {
    act(() => {
      render(<DevicesPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    expect(screen.getByText("Device 1")).toBeInTheDocument();
    expect(screen.getByText("Device 2")).toBeInTheDocument();
  });

  it("shows error on devices load failure", async () => {
    apiService.fetchDevices.mockRejectedValue(new Error("Load failed"));

    act(() => {
      render(<DevicesPage />);
    });

    const newDeviceButton = screen.getByRole("button", { name: /neues gerät/i });
    act(() => {
      fireEvent.click(newDeviceButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Fehler beim Laden.")).toBeInTheDocument();
    });
  });

  it("opens create modal when new device button is clicked", async () => {
    act(() => {
      render(<DevicesPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const newDeviceButton = screen.getByRole("button", { name: /neues gerät/i });
    act(() => {
      fireEvent.click(newDeviceButton);
    });

    expect(screen.getByTestId("device-modal")).toBeInTheDocument();
  });

  it("opens edit modal when device is clicked", async () => {
    act(() => {
      render(<DevicesPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const deviceElement = screen.getByText("Device 1");
    act(() => {
      fireEvent.click(deviceElement);
    });

    expect(screen.getByTestId("device-modal")).toBeInTheDocument();
  });

  it("saves a new device successfully", async () => {
    apiService.saveDevice.mockResolvedValue();

    act(() => {
      render(<DevicesPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    // Open create modal
    const newDeviceButton = screen.getByRole("button", { name: /neues gerät/i });
    act(() => {
      fireEvent.click(newDeviceButton);
    });

    const saveButton = screen.getByRole("button", { name: /save new/i });
    act(() => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(apiService.saveDevice).toHaveBeenCalled();
    });
  });

  it("shows validation errors on save", async () => {

    const { validateDevice } = await import("../DevicesLogic.js");
    validateDevice.mockReturnValue({ name: "Pflichtfeld" });

    act(() => {
      render(<DevicesPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const newDeviceButton = screen.getByRole("button", { name: /neues gerät/i });
    act(() => {
      fireEvent.click(newDeviceButton);
    });

    const saveButton = screen.getByRole("button", { name: /save new/i });
    act(() => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Bitte alle Felder prüfen!")).toBeInTheDocument();
    });
  });

  it("deletes a device successfully", async () => {
    apiService.deleteDevice.mockResolvedValue();

    act(() => {
      render(<DevicesPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const deviceElement = screen.getByText("Device 1");
    act(() => {
      fireEvent.click(deviceElement);
    });

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    act(() => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(apiService.deleteDevice).toHaveBeenCalledWith(1);
    });
  });

  it("shows error on delete failure", async () => {
    apiService.deleteDevice.mockRejectedValue(new Error("Delete failed"));

    act(() => {
      render(<DevicesPage />);
    });

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const deviceElement = screen.getByText("Device 1");
    act(() => {
      fireEvent.click(deviceElement);
    });

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    act(() => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Löschen fehlgeschlagen.")).toBeInTheDocument();
    });
  });
});
