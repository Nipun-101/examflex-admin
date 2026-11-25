"use client";

import { Button, Card, Form, Input, message } from "antd";
import { ConsolePageShell } from "@/app/admin/_components/console-list";
import { Select } from "@/app/components/SearchableSelect";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogApi, formatEzPrepError } from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { useVectorSubjects, VECTOR_SUBJECT_HELP } from "../useVectorSubjects";


export default function EditSubjectPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();
  const [topicOptions, setTopicOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const { options: vectorSubjectOptions } = useVectorSubjects();

  const fetchData = async () => {
    try {
      const [topicsRes, subjectRes] = await Promise.all([
        catalogApi.listTopics(),
        catalogApi.getSubject(params.id),
      ]);
      setTopicOptions(
        (topicsRes.data || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
      form.setFieldsValue({
        name: subjectRes.data.name,
        description: subjectRes.data.description,
        topics: subjectRes.data.topics?.map((topic) => topic.id) || [],
        vectorSubjectKey: subjectRes.data.vectorSubjectKey ?? undefined,
      });
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch subject"));
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    topics?: string[];
    vectorSubjectKey?: string;
  }) => {
    setLoading(true);
    try {
      // A cleared select is undefined; send null so the API removes the mapping.
      await catalogApi.updateSubject(params.id, {
        ...values,
        vectorSubjectKey: values.vectorSubjectKey ?? null,
      });
      message.success("Subject updated successfully");
      router.push("/admin/subjects");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update subject"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
    <ConsolePageShell
      eyebrow="Catalog"
      title="Edit Subject"
      back={{ label: "Back to Subjects", onClick: () => router.push("/admin/subjects") }}
    >
      <Card
        title="Details"
        className="w-full shadow-sm"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Subject Name"
              name="name"
              rules={[{ required: true, message: "Please enter subject name" }]}
            >
              <Input placeholder="Enter subject name" size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder="Enter subject description"
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>

            <Form.Item label={ChapterUi.plural} name="topics">
              <Select
                mode="multiple"
                placeholder={ChapterUi.selectPluralPlaceholder}
                size="large"
                options={topicOptions}
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item
              label="NCERT vector subject"
              name="vectorSubjectKey"
              tooltip={VECTOR_SUBJECT_HELP}
            >
              <Select
                allowClear
                placeholder="Not mapped"
                size="large"
                options={vectorSubjectOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          </div>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
            >
              Update Subject
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/subjects")}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </ConsolePageShell>
    </EditPageShell>
  );
}
