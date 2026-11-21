import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Form } from "antd";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { EquationForm, type EquationFormValues } from "./equation-form";

// The upload widget itself is covered elsewhere; here we drive the form value it owns.
vi.mock("@/app/components/ImageUpload", async () => {
  const actual = await vi.importActual<typeof import("@/app/components/ImageUpload")>(
    "@/app/components/ImageUpload"
  );
  return {
    ...actual,
    ImageUpload: ({
      name,
      label,
      onUploadingChange,
    }: {
      name: (string | number)[];
      label?: string;
      onUploadingChange?: (uploading: boolean) => void;
    }) => {
      const form = Form.useFormInstance();
      return (
        <div data-testid="image-upload" data-name={JSON.stringify(name)}>
          {/* like the real component: a hidden item registers the field */}
          <Form.Item name={name} hidden>
            <ValueHolder />
          </Form.Item>
          <span>{label}</span>
          <button type="button" onClick={() => onUploadingChange?.(true)}>
            start-upload
          </button>
          <button type="button" onClick={() => onUploadingChange?.(false)}>
            finish-upload
          </button>
          <button
            type="button"
            onClick={() =>
              form.setFieldValue(name, {
                key: "admin-images/new.png",
                bucket: "examflex-images",
              })
            }
          >
            set-image
          </button>
          <button type="button" onClick={() => form.setFieldValue(name, undefined)}>
            remove-image
          </button>
        </div>
      );
    },
  };
});

function ValueHolder(_props: { value?: unknown; onChange?: (v: unknown) => void }) {
  return null;
}

const READY: Partial<EquationFormValues> = {
  title: "Force",
  shortDescription: "cue",
  equation: "$$F=ma$$",
  subject: "s1",
  topic: "t1",
  exams: ["e1"],
};

function Harness({
  initial = READY,
  onSubmit = async () => {},
}: {
  initial?: Partial<EquationFormValues>;
  onSubmit?: (values: EquationFormValues) => Promise<void>;
}) {
  const [form] = Form.useForm<EquationFormValues>();
  useEffect(() => {
    form.setFieldsValue(initial);
  }, [form, initial]);
  return (
    <EquationForm
      form={form}
      subjects={[{ value: "s1", label: "Physics", topics: [] }]}
      topics={[{ value: "t1", label: "Laws" }]}
      examOptions={[{ value: "e1", label: "NEET" }]}
      selectedSubject="s1"
      onSubjectChange={() => {}}
      loading={false}
      submitLabel="Save equation"
      onSubmit={onSubmit}
      title="Add Equation"
    />
  );
}

describe("EquationForm image field", () => {
  it("offers an optional image upload bound to the `image` field", () => {
    render(<Harness />);
    const upload = screen.getByTestId("image-upload");
    expect(upload).toHaveAttribute("data-name", JSON.stringify(["image"]));
    expect(screen.getByText("Equation image (optional)")).toBeInTheDocument();
    expect(screen.getByText(/JPG or PNG/)).toBeInTheDocument();
  });

  it("does not require an image to save", async () => {
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save equation" })).toBeEnabled()
    );
  });

  it("holds the save button while an image is uploading, then releases it", async () => {
    render(<Harness />);
    const save = screen.getByRole("button", { name: "Save equation" });
    await waitFor(() => expect(save).toBeEnabled());

    fireEvent.click(screen.getByText("start-upload"));
    await waitFor(() => expect(save).toBeDisabled());

    fireEvent.click(screen.getByText("finish-upload"));
    await waitFor(() => expect(save).toBeEnabled());
  });

  it("submits the uploaded image with the other values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("set-image"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save equation" })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Save equation" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      title: "Force",
      image: { key: "admin-images/new.png", bucket: "examflex-images" },
    });
  });

  it("submits without an image after it is removed", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <Harness
        onSubmit={onSubmit}
        initial={{ ...READY, image: { key: "admin-images/old.png", bucket: "b" } }}
      />
    );
    fireEvent.click(screen.getByText("remove-image"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save equation" })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Save equation" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].image).toBeUndefined();
  });

  describe("bullet points", () => {
    it("renders existing bullets without React's spread-key warning", async () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      render(<Harness initial={{ ...READY, bulletPoints: ["first", "second"] }} />);
      await waitFor(() =>
        expect(screen.getAllByPlaceholderText("LaTeX or plain bullet")).toHaveLength(2)
      );
      const keyWarnings = errors.mock.calls.filter((call) =>
        String(call[0]).includes('containing a "key" prop')
      );
      expect(keyWarnings).toEqual([]);
      errors.mockRestore();
    });

    it("still adds and removes bullets", async () => {
      render(<Harness initial={{ ...READY, bulletPoints: ["first"] }} />);
      await waitFor(() =>
        expect(screen.getAllByPlaceholderText("LaTeX or plain bullet")).toHaveLength(1)
      );

      fireEvent.click(screen.getByRole("button", { name: /Add bullet/ }));
      await waitFor(() =>
        expect(screen.getAllByPlaceholderText("LaTeX or plain bullet")).toHaveLength(2)
      );

      fireEvent.click(screen.getAllByRole("img", { name: "minus-circle" })[0]!);
      await waitFor(() =>
        expect(screen.getAllByPlaceholderText("LaTeX or plain bullet")).toHaveLength(1)
      );
    });

    it("keeps the typed text on the right bullet after removing another", async () => {
      render(<Harness initial={{ ...READY, bulletPoints: ["alpha", "beta"] }} />);
      await waitFor(() =>
        expect(screen.getAllByPlaceholderText("LaTeX or plain bullet")).toHaveLength(2)
      );
      fireEvent.click(screen.getAllByRole("img", { name: "minus-circle" })[0]!);
      await waitFor(() => {
        const boxes = screen.getAllByPlaceholderText("LaTeX or plain bullet");
        expect(boxes).toHaveLength(1);
        expect(boxes[0]).toHaveValue("beta");
      });
    });
  });
});

