import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompareView from "../CompareView.jsx";

vi.mock("@svar-ui/react-gantt", () => {
  return {
    Willow: ({ children }) => <div data-testid="Willow">{children}</div>,
    Gantt: () => <div data-testid="Gantt">gantt</div>,
  };
});

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

describe("CompareView", () => {
  it("renders sections and toggles collapse", () => {
    const toggleCollapsed = vi.fn();

    render(
      <CompareView
        tasks={[]}
        planData={{ timeline: [], batteries: [], variableActions: [], constantActions: [] }}
        scales={[]}
        ganttStart={new Date()}
        ganttEnd={new Date()}
        initGantt={() => {}}
        collapsed={{
          gantt: false,
          price: false,
          generation: false,
          batteries: true,
          variableActions: true,
          constantActions: true,
        }}
        toggleCollapsed={toggleCollapsed}
        generatorOptions={[{ id: "1", name: "G1" }]}
        selectedGeneratorId={"total"}
        setSelectedGeneratorId={() => {}}
        priceDataFromBackend={[]}
        generatorDataFromBackend={[]}
      />
    );

    expect(screen.getByText(/ablaufplan/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "▾" })[0]);
    expect(toggleCollapsed).toHaveBeenCalled();
  });

  it("shows generator select and can change it", () => {
    const setSelectedGeneratorId = vi.fn();

    render(
      <CompareView
        tasks={[]}
        planData={{ timeline: [], batteries: [], variableActions: [], constantActions: [] }}
        scales={[]}
        ganttStart={new Date()}
        ganttEnd={new Date()}
        initGantt={() => {}}
        collapsed={{
          gantt: true,
          price: true,
          generation: false,
          batteries: true,
          variableActions: true,
          constantActions: true,
        }}
        toggleCollapsed={() => {}}
        generatorOptions={[{ id: "1", name: "G1" }]}
        selectedGeneratorId={"total"}
        setSelectedGeneratorId={setSelectedGeneratorId}
        priceDataFromBackend={[]}
        generatorDataFromBackend={[]}
      />
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });
    expect(setSelectedGeneratorId).toHaveBeenCalledWith("1");
  });
});