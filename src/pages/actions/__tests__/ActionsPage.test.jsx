import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActionsPage from "../ActionsPage.jsx";
import apiService from "../../../services/apiService";

// Mock apiService
vi.mock("../../../services/apiService", () => ({
  default: {
    fetchDevices: vi.fn(),
    createAction: vi.fn(),
    deleteAction: vi.fn(),
  },
}));

// Mock TimeRangeSlider
vi.mock("../../../components/slider/TimeRangeSlider.jsx", () => ({
  default: ({ startTime, endTime, onChange, disabled }) => (
    <div data-testid="TimeRangeSlider">
      <input
        type="time"
        value={startTime}
        onChange={(e) => onChange(e.target.value, endTime)}
        disabled={disabled}
        data-testid="slider-start"
      />
      <input
        type="time"
        value={endTime}
        onChange={(e) => onChange(startTime, e.target.value)}
        disabled={disabled}
        data-testid="slider-end"
      />
    </div>
  ),
}));

// Mock plus icon
vi.mock("../../../assets/images/plus.png", () => ({
  default: "plus.png",
}));

describe("ActionsPage", () => {
  const mockDevices = [
    {
      id: 1,
      name: "Device 1",
      type: "Consumer",
      flexibility: "constant",
      actions: [
        {
          id: 1,
          start: "2026-02-26T10:00:00Z",
          end: "2026-02-26T11:00:00Z",
          duration_minutes: 60,
          consumption: 1000,
        },
      ],
    },
    {
      id: 2,
      name: "Device 2",
      type: "Consumer",
      flexibility: "variable",
      actions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    apiService.fetchDevices.mockResolvedValue(mockDevices);
  });

  it("renders the page with header and grid", async () => {
    render(<ActionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Aktionen")).toBeInTheDocument();
      expect(screen.getByText("Neue Aktion")).toBeInTheDocument();
    });

    expect(screen.getByText("Device 1")).toBeInTheDocument();
    expect(screen.getByText("11:00 Uhr - 12:00 Uhr")).toBeInTheDocument();
  });

  it("loads devices on mount", async () => {
    render(<ActionsPage />);

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalledTimes(1);
    });
  });

  it("opens create modal when new action button is clicked", async () => {
    render(<ActionsPage />);

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const newActionButton = screen.getByText("Neue Aktion");
    fireEvent.click(newActionButton);

    expect(screen.getByText("Aktion erstellen")).toBeInTheDocument();
  });

  it("opens edit modal when action card is clicked", async () => {
    render(<ActionsPage />);

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const actionCard = screen.getByText("Device 1").closest(".action-card-wrapper");
    fireEvent.click(actionCard);

    expect(screen.getByText("Aktion bearbeiten")).toBeInTheDocument();
  });

  it("saves a new action successfully", async () => {
    apiService.createAction.mockResolvedValue({});

    render(<ActionsPage />);

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText("Neue Aktion"));

    fireEvent.change(screen.getByDisplayValue("Verbraucher wählen"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByPlaceholderText("z.B. 60"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByPlaceholderText("z.B. 1000"), {
      target: { value: "500" },
    });

    fireEvent.click(screen.getByText("Erstellen"));

    await waitFor(() => {
      expect(apiService.createAction).toHaveBeenCalledWith(1, {
        start: expect.any(String),
        end: expect.any(String),
        consumption: 500,
        duration_minutes: 30,
      });
    });
  });

  it("deletes an action successfully", async () => {
    apiService.deleteAction.mockResolvedValue({});

    render(<ActionsPage />);

    await waitFor(() => {
      expect(apiService.fetchDevices).toHaveBeenCalled();
    });

    const actionCard = screen.getByText("Device 1").closest(".action-card-wrapper");
    fireEvent.click(actionCard);

    fireEvent.click(screen.getByText("Löschen"));

    await waitFor(() => {
      expect(apiService.deleteAction).toHaveBeenCalledWith(1, 1);
    });
  });

});
