"use client";

import { Form, message } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  equationsApi,
  formatEzPrepError,
  type Subject,
} from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";
import {
  EquationForm,
  type EquationFormValues,
  type SubjectOption,
} from "../equation-form";

export default function CreateEquationPage() {
  const [form] = Form.useForm<EquationFormValues>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [topics, setTopics] = useState<{ value: string; label: string }[]>([]);
  const [examOptions, setExamOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const [subjectsRes, examsList] = await Promise.all([
          catalogApi.listSubjects(),
          catalogApi.listAllExams(),
        ]);
        setSubjects(
          (subjectsRes.data || []).map((subject: Subject) => ({
            value: subject.id,
            label: subject.name,
            topics: subject.topics || [],
          }))
        );
        setExamOptions(
          examsList.map((exam) => ({ value: exam.id, label: exam.name }))
        );
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to load catalog"));
      } finally {
        setInitialLoading(false);
      }
    };
    void load();
  }, []);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    const subject = subjects.find((item) => item.value === value);
    setTopics(
      subject?.topics?.map((topic) => ({
        value: topic.id,
        label: topic.name,
      })) || []
    );
  };

  const handleSubmit = async (values: EquationFormValues) => {
    setLoading(true);
    try {
      await equationsApi.create({
        ...values,
        bulletPoints: (values.bulletPoints || []).filter((item) =>
          Boolean(item?.trim())
        ),
      });
      message.success("Equation created successfully");
      form.resetFields();
      setSelectedSubject(null);
      setTopics([]);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create equation"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
      <div className="space-y-6">
        <EquationForm
          form={form}
          subjects={subjects}
          topics={topics}
          examOptions={examOptions}
          selectedSubject={selectedSubject}
          onSubjectChange={handleSubjectChange}
          loading={loading}
          submitLabel="Create Equation"
          onSubmit={handleSubmit}
          title="Add Equation"
        />
        <button
          type="button"
          className="text-sm text-blue-600 underline"
          onClick={() => router.push("/admin/equations")}
        >
          Back to equations
        </button>
      </div>
    </EditPageShell>
  );
}
