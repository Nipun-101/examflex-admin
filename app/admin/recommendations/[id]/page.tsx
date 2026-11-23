"use client";

import { Form, message } from "antd";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditRecommendationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [form] = Form.useForm<OfferingFormValues>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [examOptions, setExamOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setInitialLoading(true);
      try {
        const [offeringRes, examsList] = await Promise.all([
          recommendationsApi.get(id),
          catalogApi.listAllExams(),
        ]);
        if (cancelled) return;
        const offering = offeringRes.data;
        setExamOptions(
          examsList.map((exam) => ({ value: exam.id, label: exam.name }))
        );
        form.setFieldsValue({
          exam: offering.exam.id,
          title: offering.title,
          subtitle: offering.subtitle,
          description: offering.description,
          sortOrder: offering.sortOrder,
          isActive: offering.isActive,
        });
      } catch (error) {
        message.error(
          formatEzPrepError(error, "Failed to load recommendation")
        );
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [form, id]);

  const handleSubmit = async (values: OfferingFormValues) => {
    if (!id) return;
    setLoading(true);
    try {
      await recommendationsApi.update(id, {
        exam: values.exam,
        title: values.title,
        subtitle: values.subtitle,
        description: values.description,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      });
      message.success("Recommendation updated");
      router.push("/admin/recommendations");
    } catch (error) {
      message.error(
        formatEzPrepError(error, "Failed to update recommendation")
      );
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
          submitLabel="Save changes"
          title="Edit course pathway"
          onSubmit={handleSubmit}
          showActiveToggle
          requireCompleteFields
        />
        <button
          type="button"
          className="text-sm text-blue-600 underline"
          onClick={() => router.push("/admin/recommendations")}
        >
          Back to recommendations
        </button>
      </div>
    </EditPageShell>
  );
}
