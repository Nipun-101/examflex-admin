"use client";

import { TrendingUp } from "lucide-react";
import { DetailSection } from "@/app/admin/_components/console-detail";
import { Alert, Button, Form, Input, InputNumber, Switch } from "antd";
import type { FormInstance } from "antd/es/form";
import { Select } from "@/app/components/SearchableSelect";

export type OfferingFormValues = {
  exam: string;
  title: string;
  subtitle?: string;
  description?: string;
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
  /** When true, disable submit until exam and a valid title are set. */
  requireCompleteFields?: boolean;
};

function hasRequiredFields(values: Partial<OfferingFormValues>): boolean {
  const title = values.title?.trim() ?? "";
  return Boolean(values.exam) && title.length >= 2;
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
    <DetailSection title={title} icon={TrendingUp} tone="green">
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ isActive: true }}
        className="max-w-2xl"
      >
        <Alert
          type="info"
          showIcon
          className="!mb-4"
          message="Cut-offs are set on each full mock"
          description="Enter the cut-off marks for this course when you publish a full mock (or later from the published mock's page). Students are compared against those marks, so the number can reflect how hard each paper was."
        />

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
        >
          {submitLabel}
        </Button>
      </Form>
    </DetailSection>
  );
}
