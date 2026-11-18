"use client";

import { Button, Card, Form, Input, Space, Typography } from "antd";
import type { FormInstance } from "antd/es/form";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Select } from "@/app/components/SearchableSelect";
import { MathpixContent } from "@/app/admin/full-mock-tests/MathpixContent";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { setFormValue } from "@/app/lib/form-store";
import type { NamedRef } from "@/app/services/ezprep-api";
import { isEquationFormReady } from "./equation-form-ready";

const { Title, Text } = Typography;

export type EquationFormValues = {
  title: string;
  shortDescription: string;
  equation: string;
  longDescription?: string;
  mnemonic?: string;
  bulletPoints?: string[];
  subject: string;
  topic: string;
  exams: string[];
};

export type SubjectOption = {
  value: string;
  label: string;
  topics: NamedRef[];
};

type EquationFormProps = {
  form: FormInstance<EquationFormValues>;
  subjects: SubjectOption[];
  topics: { value: string; label: string }[];
  examOptions: { value: string; label: string }[];
  selectedSubject: string | null;
  onSubjectChange: (value: string) => void;
  loading: boolean;
  submitLabel: string;
  onSubmit: (values: EquationFormValues) => Promise<void>;
  title: string;
};

export function EquationForm({
  form,
  subjects,
  topics,
  examOptions,
  selectedSubject,
  onSubjectChange,
  loading,
  submitLabel,
  onSubmit,
  title,
}: EquationFormProps) {
  const equationPreview = Form.useWatch("equation", form) || "";
  const bulletPreview = Form.useWatch("bulletPoints", form) || [];
  const watchedValues = Form.useWatch([], form) as
    | Partial<EquationFormValues>
    | undefined;
  const canSubmit = isEquationFormReady(watchedValues);

  return (
    <Card
      title={
        <Title level={4} className="mb-0">
          {title}
        </Title>
      }
      className="w-full shadow-sm"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        className="max-w-4xl"
        initialValues={{ bulletPoints: [] }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please enter a title" }]}
            className="md:col-span-2"
          >
            <Input placeholder="Net force on a free body?" size="large" />
          </Form.Item>

          <Form.Item
            label="Short description"
            name="shortDescription"
            rules={[
              { required: true, message: "Please enter a short description" },
            ]}
            className="md:col-span-2"
          >
            <Input.TextArea
              placeholder="Cue shown before the student flips the card"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          <Form.Item
            label="Equation (Mathpix / LaTeX)"
            name="equation"
            rules={[{ required: true, message: "Please enter the equation" }]}
            className="md:col-span-2"
          >
            <Input.TextArea
              placeholder="$$\\Sigma F = ma$$"
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>

          {equationPreview.trim() ? (
            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Text type="secondary" className="text-xs uppercase tracking-wide">
                Equation preview
              </Text>
              <div className="mt-2">
                <MathpixContent text={equationPreview} />
              </div>
            </div>
          ) : null}

          <Form.Item label="Long description" name="longDescription" className="md:col-span-2">
            <Input.TextArea
              placeholder="Optional coaching note after reveal"
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>

          <Form.Item label="Mnemonic / memory trick" name="mnemonic" className="md:col-span-2">
            <Input.TextArea
              placeholder="Optional memory trick"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          <Form.List name="bulletPoints">
            {(fields, { add, remove }) => (
              <div className="md:col-span-2 space-y-3">
                <Text strong>Bullet points (optional)</Text>
                {fields.map((field) => (
                  <Space key={field.key} align="start" className="w-full">
                    <Form.Item
                      {...field}
                      className="mb-0 flex-1"
                      rules={[{ required: true, message: "Enter bullet text or remove" }]}
                    >
                      <Input.TextArea
                        placeholder="LaTeX or plain bullet"
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        className="min-w-[18rem]"
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  className="mt-2 ml-2"
                >
                  Add bullet
                </Button>
                {Array.isArray(bulletPreview) &&
                bulletPreview.some((item) => String(item || "").trim()) ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <Text
                      type="secondary"
                      className="text-xs uppercase tracking-wide"
                    >
                      Bullets preview
                    </Text>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                      {bulletPreview
                        .filter((item) => String(item || "").trim())
                        .map((item, index) => (
                          <li key={`${index}-${String(item).slice(0, 12)}`}>
                            <MathpixContent text={String(item)} />
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Form.List>

          <Form.Item
            label="Subject"
            name="subject"
            rules={[{ required: true, message: "Please select a subject" }]}
          >
            <Select
              placeholder="Select subject"
              size="large"
              options={subjects}
              onChange={(value: string) => {
                onSubjectChange(value);
                setFormValue(form, "topic", undefined);
              }}
            />
          </Form.Item>

          <Form.Item
            label={ChapterUi.singular}
            name="topic"
            rules={[{ required: true, message: ChapterUi.selectRequired }]}
          >
            <Select
              placeholder={ChapterUi.selectPlaceholder}
              size="large"
              disabled={!selectedSubject}
              options={topics}
            />
          </Form.Item>

          <Form.Item
            label="Exams"
            name="exams"
            rules={[
              { required: true, message: "Select at least one exam" },
              {
                validator: async (_, value: string[] | undefined) => {
                  if (!value || value.length < 1) {
                    throw new Error("Select at least one exam");
                  }
                },
              },
            ]}
            className="md:col-span-2"
          >
            <Select
              mode="multiple"
              placeholder="Select exams"
              size="large"
              options={examOptions}
            />
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50"
          >
            {submitLabel}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
