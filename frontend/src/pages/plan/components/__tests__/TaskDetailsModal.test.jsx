import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskDetailsModal from "../TaskDetailsModal.jsx";

vi.mock("recharts", () => {
  const Wrap = ({ children, ...props }) => (
    <div data-testid={props["data-testid"] || "recharts"}>{children}</div>
  );
  return {
    LineChart: (p) => <Wrap data-testid="LineChart">{p.children}</Wrap>,
    Line: () => <div data-testid="Line" />,
    CartesianGrid: () => <div data-testid="CartesianGrid" />,
    XAxis: () => <div data-testid="XAxis" />,
    YAxis: () => <div data-testid="YAxis" />,
  };
});

describe("TaskDetailsModal", () => {
  it("returns null when open=false", () => {
    const { container } = render(
      <TaskDetailsModal open={false} onClose={() => {}} selectedTask={null} planData={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders battery chart when selectedBattery exists", () => {
    render(
      <TaskDetailsModal
        open={true}
        onClose={() => {}}
        selectedTask={{ id: 1, name: "Task" }}
        selectedBattery={{ id: 1, socWh: [10] }}
        selectedVA={null}
        planData={{ timeline: ["2026-02-26T00:00:00.000Z"] }}
      />
    );

    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText(/speicherladung/i)).toBeInTheDocument();
    expect(screen.getByTestId("LineChart")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();

    render(
      <TaskDetailsModal
        open={true}
        onClose={onClose}
        selectedTask={{ id: 1, name: "Task" }}
        selectedBattery={null}
        selectedVA={{ id: 1, powerW: [1] }}
        planData={{ timeline: ["2026-02-26T00:00:00.000Z"] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(onClose).toHaveBeenCalled();
  });
});