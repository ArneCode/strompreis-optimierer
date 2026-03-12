import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionModal from "../ActionModal.jsx";

vi.mock("../components/ActionForm.jsx", () => ({
  default: ({ actionForm, onChange, disabled }) => (
    <div data-testid="ActionForm">
      <input
        name="deviceId"
        value={actionForm.deviceId || ""}
        onChange={onChange}
        disabled={disabled}
        data-testid="device-select"
      />
      <button data-testid="save-button" disabled={disabled}>
        Save
      </button>
    </div>
  ),
}));

describe("ActionModal", () => {
  const defaultProps = {
    isOpen: true,
    isEdit: false,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    errorMessage: "",
    isLoading: false,
    isDeleting: false,
    actionForm: { deviceId: "", startTime: "", endTime: "" },
    onChange: vi.fn(),
    devices: [],
    errors: {},
    sliderToTime: vi.fn(),
    timeToSlider: vi.fn(),
    startLabel: "(Heute)",
    endLabel: "(Heute)",
    currentTimeStr: "12:00",
    onTimeBlur: vi.fn(),
  };

  it("renders create modal when open", () => {
    render(<ActionModal {...defaultProps} />);

    expect(screen.getByText("Aktion erstellen")).toBeInTheDocument();
    expect(screen.getByText("Abbrechen")).toBeInTheDocument();
    expect(screen.getByText("Erstellen")).toBeInTheDocument();
  });

  it("renders edit modal with delete button", () => {
    render(<ActionModal {...defaultProps} isEdit={true} />);

    expect(screen.getByText("Aktion bearbeiten")).toBeInTheDocument();
    expect(screen.getByText("Löschen")).toBeInTheDocument();
    expect(screen.getByText("Speichern")).toBeInTheDocument();
  });

  it("does not render when not open", () => {
    render(<ActionModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Aktion erstellen")).not.toBeInTheDocument();
  });

  it("shows error message when provided", () => {
    render(<ActionModal {...defaultProps} errorMessage="Test error" />);

    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    render(<ActionModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Abbrechen"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onSave when save button is clicked", () => {
    render(<ActionModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Erstellen"));
    expect(defaultProps.onSave).toHaveBeenCalledWith(false);
  });

  it("calls onDelete when delete button is clicked in edit mode", () => {
    render(<ActionModal {...defaultProps} isEdit={true} />);

    fireEvent.click(screen.getByText("Löschen"));
    expect(defaultProps.onDelete).toHaveBeenCalled();
  });

  it("disables buttons when loading", () => {
    render(<ActionModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText("Erstellt...")).toBeDisabled();
    expect(screen.getByText("Abbrechen")).toBeDisabled();
  });

  it("disables buttons when deleting", () => {
    render(<ActionModal {...defaultProps} isEdit={true} isDeleting={true} />);

    expect(screen.getByText("Löscht...")).toBeDisabled();
    expect(screen.getByText("Abbrechen")).toBeDisabled();
  });
});
