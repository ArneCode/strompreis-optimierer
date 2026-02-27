import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Action from "../components/Action.jsx";

describe("Action", () => {
  it("renders action name and time range", () => {
    render(<Action name="Test Device" startTime="10:00" endTime="11:30" />);

    expect(screen.getByText("Test Device")).toBeInTheDocument();
    expect(screen.getByText("10:00 Uhr - 11:30 Uhr")).toBeInTheDocument();
  });

  it("renders with different times", () => {
    render(<Action name="Another Device" startTime="14:15" endTime="16:45" />);

    expect(screen.getByText("Another Device")).toBeInTheDocument();
    expect(screen.getByText("14:15 Uhr - 16:45 Uhr")).toBeInTheDocument();
  });
});
