import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GanttPanel from "../GanttPanel.jsx";

vi.mock("@svar-ui/react-gantt", () => {
  return {
    Willow: ({ children }) => <div data-testid="Willow">{children}</div>,
    Gantt: (props) => (
      <div data-testid="Gantt" data-taskcount={(props.tasks || []).length}>
        gantt
      </div>
    ),
  };
});

vi.mock("../../exportHelper.js", () => {
  return {
    downloadCSV: vi.fn(),
    downloadPDF: vi.fn(),
  };
});

import { downloadCSV, downloadPDF } from "../../exportHelper.js";

describe("GanttPanel", () => {
  it("renders gantt and calls export helpers", () => {
    const tasks = [{ id: 1, name: "T", start: new Date(), end: new Date() }];
    const setError = vi.fn();

    render(
      <GanttPanel
        tasks={tasks}
        scales={[]}
        ganttStart={new Date("2026-02-26T00:00:00.000Z")}
        ganttEnd={new Date("2026-02-26T01:00:00.000Z")}
        initGantt={() => {}}
        setError={setError}
      />
    );

    expect(screen.getByTestId("Gantt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /exportieren als csv/i }));
    expect(downloadCSV).toHaveBeenCalledWith(tasks, "ablaufplan.csv", setError);

    fireEvent.click(screen.getByRole("button", { name: /exportieren als pdf/i }));
    expect(downloadPDF).toHaveBeenCalledWith(tasks, "ablaufplan.pdf", setError);
  });
});