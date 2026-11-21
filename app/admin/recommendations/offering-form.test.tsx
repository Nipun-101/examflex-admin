import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Form } from "antd";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { OfferingForm, type OfferingFormValues } from "./offering-form";

const examOptions = [{ value: "e1", label: "NEET UG" }];

function Harness(props: {
  initial?: Partial<OfferingFormValues>;
  requireCompleteFields?: boolean;
  showActiveToggle?: boolean;
  onSubmit?: (values: OfferingFormValues) => void;
}) {
  const [form] = Form.useForm<OfferingFormValues>();
  useEffect(() => {
    if (props.initial) form.setFieldsValue(props.initial);
  }, [form, props.initial]);
  return (
    <OfferingForm
      form={form}
      examOptions={examOptions}
      loading={false}
      submitLabel="Create course"
      title="Add course pathway"
      onSubmit={props.onSubmit ?? (() => {})}
      requireCompleteFields={props.requireCompleteFields}
      showActiveToggle={props.showActiveToggle}
    />
  );
}

describe("OfferingForm", () => {
  it("no longer asks for minimum / comfort percentages", () => {
    render(<Harness />);
    expect(screen.queryByText(/Minimum score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Comfort score/i)).not.toBeInTheDocument();
    expect(screen.getByText("Course title")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Sort order")).toBeInTheDocument();
  });

  it("points admins to the per-mock cut-offs", () => {
    render(<Harness />);
    expect(
      screen.getByText("Cut-offs are set on each full mock")
    ).toBeInTheDocument();
  });

  it("disables submit until an exam and a valid title are set", async () => {
    render(<Harness requireCompleteFields />);
    const submit = screen.getByRole("button", { name: "Create course" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("MBBS"), {
      target: { value: "M" },
    });
    await waitFor(() => expect(submit).toBeDisabled()); // title too short, no exam
  });

  it("enables submit with an exam and title only (no percent required)", async () => {
    render(
      <Harness requireCompleteFields initial={{ exam: "e1", title: "MBBS" }} />
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create course" })).toBeEnabled()
    );
  });

  it("is always enabled when completeness is not enforced", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Create course" })).toBeEnabled();
  });

  it("submits the entered values without any percent fields", async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        initial={{ exam: "e1", title: "MBBS", subtitle: "Medicine" }}
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const values = onSubmit.mock.calls[0][0];
    expect(values).toMatchObject({
      exam: "e1",
      title: "MBBS",
      subtitle: "Medicine",
    });
    expect(values).not.toHaveProperty("minPercent");
    expect(values).not.toHaveProperty("comfortPercent");
  });

  it("validates the title length", async () => {
    const onSubmit = vi.fn();
    render(<Harness initial={{ exam: "e1", title: "M" }} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    expect(
      await screen.findByText("Title must be at least 2 characters")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the active toggle only when asked", () => {
    const { rerender } = render(<Harness />);
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    rerender(<Harness showActiveToggle />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
