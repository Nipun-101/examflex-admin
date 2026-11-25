"use client";

import { Form, message } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  catalogApi,
  formatEzPrepError,
  recommendationsApi,
} from "@/app/services/ezprep-api";
import { EditPageShell } from "@/app/components/PageLoader";
import {
  OfferingForm,
  type OfferingFormValues,
} from "../offering-form";

export default function CreateRecommendationPage() {
  const [form] = Form.useForm<OfferingFormValues>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [examOptions, setExamOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    void catalogApi
      .listAllExams()
      .then((list) =>
        setExamOptions(list.map((exam) => ({ value: exam.id, label: exam.name })))
      )
      .catch((error) => {
        message.error(formatEzPrepError(error, "Failed to load exams"));
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleSubmit = async (values: OfferingFormValues) => {
    setLoading(true);
    try {
      await recommendationsApi.create({
        exam: values.exam,
        kind: "COURSE",
        title: values.title,
        subtitle: values.subtitle,
        description: values.description,
        sortOrder: values.sortOrder,
      });
      message.success("Course pathway created");
      router.push("/admin/recommendations");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to create recommendation"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditPageShell loading={initialLoading}>
      <div className="mx-auto max-w-2xl space-y-4">
        <OfferingForm
          form={form}
          examOptions={examOptions}
          loading={loading}
          submitLabel="Create course"
          title="Add course pathway"
          onSubmit={handleSubmit}
          requireCompleteFields
        />
        <button
          type="button"
          className="text-sm text-console-green underline hover:text-console-ink-hover"
          onClick={() => router.push("/admin/recommendations")}
        >
          Back to recommendations
        </button>
      </div>
    </EditPageShell>
  );
}
