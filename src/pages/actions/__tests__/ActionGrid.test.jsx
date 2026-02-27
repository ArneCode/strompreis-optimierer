import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionGrid from "../components/ActionGrid.jsx";

describe("ActionGrid", () => {
  const mockDevices = [
    {
      id: 1,
      name: "Device 1",
      actions: [
        {
          id: 1,
          start: "2026-02-26T10:00:00Z",
          end: "2026-02-26T11:00:00Z",
        },
        {
          id: 2,
          start: "2026-02-26T14:00:00Z",
          end: "2026-02-26T15:00:00Z",
        },
      ],
    },
    {
      id: 2,
      name: "Device 2",
      actions: [
        {
          id: 3,
          start: "2026-02-26T16:00:00Z",
          end: "2026-02-26T17:00:00Z",
        },
      ],
    },
  ];

  it("renders action cards for all devices and actions", () => {
    const onEdit = vi.fn();
    render(<ActionGrid devices={mockDevices} onEdit={onEdit} />);

    expect(screen.getAllByText("Device 1")).toHaveLength(2);
    expect(screen.getByText("Device 2")).toBeInTheDocument();
    expect(screen.getByText("11:00 Uhr - 12:00 Uhr")).toBeInTheDocument();
    expect(screen.getByText("15:00 Uhr - 16:00 Uhr")).toBeInTheDocument();
    expect(screen.getByText("17:00 Uhr - 18:00 Uhr")).toBeInTheDocument();
  });

  it("calls onEdit with correct indices when card is clicked", () => {
    const onEdit = vi.fn();
    render(<ActionGrid devices={mockDevices} onEdit={onEdit} />);

    const firstCard = screen.getAllByText("Device 1")[0].closest(".action-card-wrapper");
    fireEvent.click(firstCard);

    expect(onEdit).toHaveBeenCalledWith(0, 0);
  });

  it("renders empty grid when no devices", () => {
    const onEdit = vi.fn();
    render(<ActionGrid devices={[]} onEdit={onEdit} />);

    expect(screen.queryByText("Device 1")).not.toBeInTheDocument();
  });

  it("renders empty grid when devices have no actions", () => {
    const onEdit = vi.fn();
    const devicesWithoutActions = [{ id: 1, name: "Device 1", actions: [] }];
    render(<ActionGrid devices={devicesWithoutActions} onEdit={onEdit} />);

    expect(screen.queryByText("Device 1")).not.toBeInTheDocument();
  });
});
