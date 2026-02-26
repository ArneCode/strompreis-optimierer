import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanHeader from "../PlanHeader.jsx";

describe("PlanHeader", () => {
  it("renders buttons and calls callbacks", () => {
    const onGenerate = vi.fn();
    const onRefresh = vi.fn();
    const setCompareView = vi.fn();

    render(
      <PlanHeader
        status={{ currentlyRunning: false, hasSchedule: true }}
        error={null}
        onGenerate={onGenerate}
        onRefresh={onRefresh}
        compareView={false}
        setCompareView={setCompareView}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /plan generieren/i }));
    expect(onGenerate).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /aktualisieren/i }));
    expect(onRefresh).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /vergleichsansicht an/i }));
    expect(setCompareView).toHaveBeenCalled();
  });

  it("disables buttons when currentlyRunning=true and shows running text", () => {
    render(
      <PlanHeader
        status={{ currentlyRunning: true, hasSchedule: false }}
        error={null}
        onGenerate={() => {}}
        onRefresh={() => {}}
        compareView={false}
        setCompareView={() => {}}
      />
    );

    expect(screen.getByText(/optimierung läuft/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plan wird generiert/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /aktualisieren/i })).toBeDisabled();
  });

  it("shows error if provided", () => {
    render(
      <PlanHeader
        status={{ currentlyRunning: false, hasSchedule: true }}
        error={"Boom"}
        onGenerate={() => {}}
        onRefresh={() => {}}
        compareView={false}
        setCompareView={() => {}}
      />
    );

    expect(screen.getByText("Boom")).toBeInTheDocument();
  });
});