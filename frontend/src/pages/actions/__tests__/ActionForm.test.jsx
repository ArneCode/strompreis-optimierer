import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionForm from "../components/ActionForm.jsx";

vi.mock("../../../components/slider/TimeRangeSlider.jsx", () => ({
  default: ({ startTime, endTime}) => (
    <div data-testid="TimeRangeSlider">
      Slider: {startTime} - {endTime}
    </div>
  ),
}));

describe("ActionForm", () => {
  const mockDevices = [
    { id: 1, name: "Constant Device", type: "Consumer", flexibility: "constant" },
    { id: 2, name: "Variable Device", type: "Consumer", flexibility: "variable" },
  ];

  const defaultProps = {
    actionForm: {
      deviceId: "",
      startTime: "10:00",
      endTime: "11:00",
      duration: "",
      consumption: "",
      totalConsumption: "",
    },
    onChange: vi.fn(),
    onTimeBlur: vi.fn(),
    devices: mockDevices,
    isEdit: false,
    errors: {},
    disabled: false,
    sliderToTime: vi.fn((val) => `${Math.floor(val / 60)}:${(val % 60).toString().padStart(2, '0')}`),
    timeToSlider: vi.fn((time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    }),
    startLabel: "(Heute)",
    endLabel: "(Heute)",
    currentTimeStr: "09:00",
  };

  it("renders device select in create mode", () => {
    render(<ActionForm {...defaultProps} />);

    expect(screen.getByText("Gerät auswählen")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Verbraucher wählen")).toBeInTheDocument();
  });

  it("does not render device select in edit mode", () => {
    render(<ActionForm {...defaultProps} isEdit={true} />);

    expect(screen.queryByText("Gerät auswählen")).not.toBeInTheDocument();
  });

  it("renders time inputs with labels", () => {
    render(<ActionForm {...defaultProps} />);

    expect(screen.getByText("Frühester Start (Heute)")).toBeInTheDocument();
    expect(screen.getByText("Spätestes Ende (Heute)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("11:00")).toBeInTheDocument();
  });

  it("renders TimeRangeSlider", () => {
    render(<ActionForm {...defaultProps} />);

    expect(screen.getByTestId("TimeRangeSlider")).toBeInTheDocument();
  });

  it("renders duration field for constant device", () => {
    const props = {
      ...defaultProps,
      actionForm: { ...defaultProps.actionForm, deviceId: "1" },
    };
    render(<ActionForm {...props} />);

    expect(screen.getByText("Dauer (min)")).toBeInTheDocument();
    expect(screen.getByText("Leistung (W)")).toBeInTheDocument();
  });

  it("renders totalConsumption field for variable device", () => {
    const props = {
      ...defaultProps,
      actionForm: { ...defaultProps.actionForm, deviceId: "2" },
    };
    render(<ActionForm {...props} />);

    expect(screen.getByText("Gesamtverbrauch (Wh)")).toBeInTheDocument();
    expect(screen.getByText("Max. Leistung (W)")).toBeInTheDocument();
  });

  it("shows error messages", () => {
    const props = {
      ...defaultProps,
      errors: { deviceId: "Required", startTime: "Invalid" },
    };
    render(<ActionForm {...props} />);

    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Invalid")).toBeInTheDocument();
  });

  it("calls onChange when inputs change", () => {
    render(<ActionForm {...defaultProps} />);

    const deviceSelect = screen.getByDisplayValue("Verbraucher wählen");
    fireEvent.change(deviceSelect, { target: { value: "1" } });

    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it("disables inputs when disabled prop is true", () => {
    render(<ActionForm {...defaultProps} disabled={true} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();

    const timeInputs = screen.getAllByDisplayValue(/^\d{2}:\d{2}$/);
    timeInputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});
