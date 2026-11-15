"use client";

import { Button, Card, Form, Input, Table, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  type Topic,
} from "@/app/services/ezprep-api";
import { ChapterUi } from "@/app/lib/chapter-ui";

const { Title } = Typography;

export default function TopicsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const router = useRouter();

  const pagedTopics = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return topics.slice(start, start + pagination.pageSize);
  }, [topics, pagination.current, pagination.pageSize]);

  const columns = [
    {
      title: ChapterUi.nameLabel,
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      responsive: ["sm", "md", "lg", "xl", "xxl"] as Breakpoint[],
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Topic) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/topics/${record.id}`)}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  const fetchTopics = async () => {
    setTableLoading(true);
    try {
      const data = await catalogApi.listTopics();
      setTopics(data.data || []);
    } catch (error) {
      message.error(formatEzPrepError(error, ChapterUi.failedFetch));
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.createTopic(values);
      message.success(ChapterUi.createdSuccess);
      form.resetFields();
      fetchTopics();
    } catch (error) {
      message.error(formatEzPrepError(error, ChapterUi.failedCreate));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: ChapterUi.deleteTitle,
      content: ChapterUi.deleteConfirm,
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await catalogApi.deleteTopic(id);
          message.success(ChapterUi.deletedSuccess);
          fetchTopics();
        } catch (error) {
          message.error(formatEzPrepError(error, ChapterUi.failedDelete));
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card
        title={<Title level={4} className="mb-0">{ChapterUi.addNewTitle}</Title>}
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
              icon={<PlusOutlined />}
              className="bg-blue-600 hover:bg-blue-700"
              loading={loading}
            >
              {ChapterUi.createButton}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={<Title level={4} className="mb-0">{ChapterUi.listTitle}</Title>}
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={pagedTopics}
          rowKey="id"
          loading={tableLoading}
          scroll={{ x: true }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: topics.length,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: ChapterUi.paginationTotal,
            onChange: (page, pageSize) => {
              setPagination({
                current: page,
                pageSize: pageSize || 10,
              });
            },
          }}
        />
      </Card>
    </div>
  );
}