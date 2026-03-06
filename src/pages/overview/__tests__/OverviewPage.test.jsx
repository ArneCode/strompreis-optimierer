import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import OverviewPage from "../OverviewPage.jsx";
import apiService from "../../../services/apiService";

// Mock apiService
vi.mock("../../../services/apiService", () => ({
  default: {
    fetchOverview: vi.fn(),
  },
}));

function createDeferred() {
  /** @type {(value: any) => void} */
  let resolve;
  /** @type {(reason?: any) => void} */
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("OverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading hint initially and fetches data on mount", async () => {
    apiService.fetchOverview.mockResolvedValue({
      batteries: [],
      actions: [],
      generators: [],
    });

    render(<OverviewPage />);

    // Loading hint should be visible immediately
    expect(screen.getByText(/Lade Daten/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiService.fetchOverview).toHaveBeenCalledTimes(1);
    });

    // After loading finishes, the loading hint disappears
    await waitFor(() => {
      expect(screen.queryByText(/Lade Daten/i)).not.toBeInTheDocument();
    });
  });

  it("renders groups (Batteries/Actions/Generators) and tiles including optional fields", async () => {
    apiService.fetchOverview.mockResolvedValue({
      batteries: [
        {
          id: "bat-1",
          name: "Batterie 1",
          status: "Charging",
          currentPower: 120,
          chargeLevel: 1500,
        },
        {
          id: "bat-2",
          name: "Batterie 2",
          status: "discharging",
          currentPower: 80,
          chargeLevel: 900,
        },
      ],
      actions: [
        {
          id: "act-1",
          name: "Waschmaschine",
          status: "Running",
          currentPower: 700,
          actionType: "Consumer",
        },
      ],
      generators: [
        {
          id: "gen-1",
          name: "PV",
          status: "idle",
          currentPower: 0,
        },
      ],
    });

    render(<OverviewPage />);

    // Wait until loading finished
    await waitFor(() => {
      expect(screen.queryByText(/Lade Daten/i)).not.toBeInTheDocument();
    });

    // Headline + group headings
    expect(screen.getByText("Aktuelle Übersicht")).toBeInTheDocument();
    expect(screen.getByText("Speicher")).toBeInTheDocument();
    expect(screen.getByText("Aktionen")).toBeInTheDocument();
    expect(screen.getByText("Erzeuger")).toBeInTheDocument();

    // Battery tile content
    const bat1 = screen.getByText("Batterie 1").closest("article");
    expect(bat1).toBeTruthy();
    expect(within(bat1).getByText("Status")).toBeInTheDocument();

    const bat1StatusValue = within(bat1).getByText("Charging");
    expect(bat1StatusValue).toHaveClass("status-charging");

    expect(within(bat1).getByText("Aktuelle Leistung")).toBeInTheDocument();
    expect(within(bat1).getByText("120.00 W")).toBeInTheDocument();
    expect(within(bat1).getByText("Ladezustand")).toBeInTheDocument();
    expect(within(bat1).getByText("1500.00 Wh")).toBeInTheDocument();

    // Battery status class should be case-insensitive and accept "discharging"
    const bat2 = screen.getByText("Batterie 2").closest("article");
    const bat2StatusValue = within(bat2).getByText("discharging");
    expect(bat2StatusValue).toHaveClass("status-decharging");

    // Action tile content + optional actionType
    const action = screen.getByText("Waschmaschine").closest("article");
    expect(within(action).getByText("Typ")).toBeInTheDocument();
    expect(within(action).getByText("Consumer")).toBeInTheDocument();

    // Action should not show charge level
    expect(within(action).queryByText("Ladezustand")).not.toBeInTheDocument();

    // Generator tile should show neither charge level nor type
    const gen = screen.getByText("PV").closest("article");
    expect(within(gen).queryByText("Ladezustand")).not.toBeInTheDocument();
    expect(within(gen).queryByText("Typ")).not.toBeInTheDocument();
  });

  it("shows empty states per group when arrays are empty", async () => {
    apiService.fetchOverview.mockResolvedValue({
      batteries: [],
      actions: [],
      generators: [],
    });

    render(<OverviewPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Lade Daten/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("Keine Speicher vorhanden.")).toBeInTheDocument();
    expect(screen.getByText("Keine Aktionen vorhanden.")).toBeInTheDocument();
    expect(screen.getByText("Keine Erzeuger vorhanden.")).toBeInTheDocument();
  });

  it("handles unexpected API formats gracefully (non-arrays fallback to empty arrays)", async () => {
    apiService.fetchOverview.mockResolvedValue({
      batteries: null,
      actions: "oops",
      generators: { id: 1 },
    });

    render(<OverviewPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Lade Daten/i)).not.toBeInTheDocument();
    });

    // Should fall back to empty arrays => empty states
    expect(screen.getByText("Keine Speicher vorhanden.")).toBeInTheDocument();
    expect(screen.getByText("Keine Aktionen vorhanden.")).toBeInTheDocument();
    expect(screen.getByText("Keine Erzeuger vorhanden.")).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    apiService.fetchOverview.mockRejectedValue(new Error("network"));

    render(<OverviewPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Lade Daten/i)).not.toBeInTheDocument();
    });

    expect(
      screen.getByText("Konnte Overview-Daten nicht laden.")
    ).toBeInTheDocument();

    // When error is shown, group sections should not render
    expect(screen.queryByText("Speicher")).not.toBeInTheDocument();
    expect(screen.queryByText("Aktionen")).not.toBeInTheDocument();
    expect(screen.queryByText("Erzeuger")).not.toBeInTheDocument();
  });

  it("does not update state after unmount if the promise resolves later (alive guard)", async () => {
    const deferred = createDeferred();
    apiService.fetchOverview.mockReturnValue(deferred.promise);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { unmount } = render(<OverviewPage />);
    expect(screen.getByText(/Lade Daten/i)).toBeInTheDocument();

    // Unmount before the promise resolves
    unmount();
    deferred.resolve({ batteries: [], actions: [], generators: [] });

    // Flush microtasks
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});