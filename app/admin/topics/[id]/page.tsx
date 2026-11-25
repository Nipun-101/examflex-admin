"use client";

import { Button, Card, Form, Input, message } from "antd";
import { ConsolePageShell } from "@/app/admin/_components/console-list";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogApi, formatEzPrepError } from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";


export default function EditTopicPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const { data } = await catalogApi.getTopic(params.id);
        form.setFieldsValue({
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        message.error(formatEzPrepError(error, ChapterUi.failedFetchOne));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTopic();
  }, [params.id, form]);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.updateTopic(params.id, values);
      message.success(ChapterUi.updatedSuccess);
      router.push("/admin/topics");
    } catch (error) {
      message.error(formatEzPrepError(error, ChapterUi.failedUpdate));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
    <ConsolePageShell
      eyebrow="Catalog"
      title={ChapterUi.editTitle}
      back={{ label: `Back to ${ChapterUi.plural}`, onClick: () => router.push("/admin/topics") }}
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
              label={ChapterUi.nameLabel}
              name="name"
              rules={[{ required: true, message: ChapterUi.enterNameRequired }]}
            >
              <Input placeholder={ChapterUi.enterName} size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                placeholder={ChapterUi.enterDescription}
                size="large"
                autoSize={{ minRows: 2, maxRows: 6 }}
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
              {ChapterUi.updateButton}
            </Button>
            <Button
              className="ml-2"
              size="large"
              onClick={() => router.push("/admin/topics")}
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