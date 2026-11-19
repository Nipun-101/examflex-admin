"use client";

import { Button, Form, Input, InputNumber, Switch } from "antd";
import type { FormInstance } from "antd/es/form";
import { Select } from "@/app/components/SearchableSelect";

export type OfferingFormValues = {
  exam: string;
  title: string;
  subtitle?: string;
  description?: string;
  minPercent: number;
  comfortPercent?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

type OfferingFormProps = {
  form: FormInstance<OfferingFormValues>;
  examOptions: { value: string; label: string }[];
  loading: boolean;
  submitLabel: string;
  title: string;
  onSubmit: (values: OfferingFormValues) => void | Promise<void>;
  showActiveToggle?: boolean;
  examDisabled?: boolean;
  /** When true, disable submit until exam, title, and minPercent are set. */
  requireCompleteFields?: boolean;
};

function hasRequiredFields(values: Partial<OfferingFormValues>): boolean {
  const title = values.title?.trim() ?? "";
  return (
    Boolean(values.exam) &&
    title.length >= 2 &&
    typeof values.minPercent === "number" &&
    Number.isFinite(values.minPercent)
  );
}

export function OfferingForm({
  form,
  examOptions,
  loading,
  submitLabel,
  title,
  onSubmit,
  showActiveToggle = false,
  examDisabled = false,
  requireCompleteFields = false,
}: OfferingFormProps) {
  const watched = Form.useWatch([], form) as
    | Partial<OfferingFormValues>
    | undefined;
  const canSubmit = requireCompleteFields
    ? hasRequiredFields(watched ?? {})
    : true;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ minPercent: 70, isActive: true }}
      >
        <Form.Item
          name="exam"
          label="Exam"
          rules={[{ required: true, message: "Select an exam" }]}
        >
          <Select
            options={examOptions}
            placeholder="Select exam (e.g. NEET)"
            disabled={examDisabled}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          name="title"
          label="Course title"
          rules={[
            { required: true, message: "Title is required" },
            { min: 2, message: "Title must be at least 2 characters" },
          ]}
        >
          <Input placeholder="MBBS" maxLength={120} />
        </Form.Item>

        <Form.Item name="subtitle" label="Subtitle">
          <Input placeholder="Medicine" maxLength={200} />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item
            name="minPercent"
            label="Minimum score %"
            rules={[
              { required: true, message: "Minimum percent is required" },
            ]}
            extra="Students are compared using average % of their last full mocks."
          >
            <InputNumber min={0} max={100} className="w-full" />
          </Form.Item>

          <Form.Item
            name="comfortPercent"
            label="Comfort score % (optional)"
            extra="Defaults to minimum + 10 if left empty."
          >
            <InputNumber min={0} max={100} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item name="sortOrder" label="Sort order">
          <InputNumber min={0} className="w-full" placeholder="Auto if empty" />
        </Form.Item>

        {showActiveToggle ? (
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        ) : null}

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={!canSubmit}
          className="!border-blue-600 !bg-blue-600 !text-white hover:!border-blue-700 hover:!bg-blue-700 disabled:!border-blue-400 disabled:!bg-blue-400 disabled:!text-white disabled:!opacity-100"
        >
          {submitLabel}
        </Button>
      </Form>
    </div>
  );
}
