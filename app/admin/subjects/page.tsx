"use client";

import { Button, Card, Form, Input, Table, Typography, message } from "antd";
import { ConsolePageShell } from "../_components/console-list";
import { Select } from "@/app/components/SearchableSelect";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { showConfirmModal } from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  type NamedRef,
  type Subject,
} from "@/app/services/ezprep-api";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { useVectorSubjects, VECTOR_SUBJECT_HELP } from "./useVectorSubjects";

const { Title } = Typography;

interface TopicOption {
  value: string;
  label: string;
}

export default function SubjectsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const router = useRouter();
  const [topicOptions, setTopicOptions] = useState<TopicOption[]>([]);
  const { options: vectorSubjectOptions, labelFor: vectorSubjectLabel } =
    useVectorSubjects();

  const pagedSubjects = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return subjects.slice(start, start + pagination.pageSize);
  }, [subjects, pagination.current, pagination.pageSize]);

  const columns = [
    {
      title: "Subject Name",
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
      title: ChapterUi.plural,
      dataIndex: "topics",
      key: "topics",
      render: (topics: NamedRef[]) =>
        topics?.map((topic) => topic.name).filter(Boolean).join(", ") || "-",
    },
    {
      title: "NCERT",
      dataIndex: "vectorSubjectKey",
      key: "vectorSubjectKey",
      responsive: ["md", "lg", "xl", "xxl"] as Breakpoint[],
      render: (key?: string | null) => vectorSubjectLabel(key) ?? "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Subject) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => router.push(`/admin/subjects/${record.id}`)}
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

  const fetchSubjects = async () => {
    setTableLoading(true);
    try {
      const data = await catalogApi.listSubjects();
      setSubjects(data.data || []);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch subjects"));
    } finally {
      setTableLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const data = await catalogApi.listTopics();
      setTopicOptions(
        (data.data || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, ChapterUi.failedFetch));
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchTopics();
  }, []);

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    topics?: string[];
    vectorSubjectKey?: string;
  }) => {
    setLoading(true);
    try {
      await catalogApi.createSubject(values);
      message.success("Subject created successfully");
      form.resetFields();
      fetchSubjects();
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create subject"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Subject",
      content:
        "Are you sure you want to delete this subject? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await catalogApi.deleteSubject(id);
          message.success("Subject deleted successfully");
          fetchSubjects();
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete subject"));
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  return (
    <ConsolePageShell eyebrow="Catalog" title="Subjects">
      <Card
        title={<Title level={4} className="mb-0">Add New Subject</Title>}
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
              icon={<PlusOutlined />}
              loading={loading}
            >
              Create Subject
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={<Title level={4} className="mb-0">Subjects List</Title>}
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={pagedSubjects}
          rowKey="id"
          loading={tableLoading}
          scroll={{ x: true }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: subjects.length,
            position: ["bottomCenter"],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} subjects`,
            onChange: (page, pageSize) => {
              setPagination({
                current: page,
                pageSize: pageSize || 10,
              });
            },
          }}
        />
      </Card>
    </ConsolePageShell>
  );
}
