"use client";

import { Form, message } from "antd";
import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  catalogApi,
  equationsApi,
  formatEzPrepError,
  refId,
  type Subject,
} from "@/app/services/ezprep-api";
import { toPlainImageMetadata } from "@/app/components/ImageUpload";
import { EditPageShell } from "@/app/components/PageLoader";
import {
  EquationForm,
  type EquationFormValues,
  type SubjectOption,
} from "../equation-form";
import { equationsListHref } from "../equations-list-href";

export default function EditEquationPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const searchParams = useSearchParams();
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
  // Whether the saved equation had a picture, so a removal can be sent as null.
  const hadImage = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [subjectsRes, examsList, equationRes] = await Promise.all([
          catalogApi.listSubjects(),
          catalogApi.listAllExams(),
          equationsApi.get(params.id),
        ]);

        const subjectsList = (subjectsRes.data || []).map(
          (subject: Subject) => ({
            value: subject.id,
            label: subject.name,
            topics: subject.topics || [],
          })
        );
        setSubjects(subjectsList);
        setExamOptions(
          examsList.map((exam) => ({ value: exam.id, label: exam.name }))
        );

        const data = equationRes.data;
        const subjectId = refId(data.subject);
        const topicId = refId(data.topic);
        const examIds = (data.exams || [])
          .map((exam) => refId(exam))
          .filter((id): id is string => Boolean(id));

        if (subjectId) {
          setSelectedSubject(subjectId);
          const subject = subjectsList.find((item) => item.value === subjectId);
          setTopics(
            subject?.topics?.map((topic) => ({
              value: topic.id,
              label: topic.name,
            })) || []
          );
        }

        const savedImage = toPlainImageMetadata(data.image);
        hadImage.current = Boolean(savedImage);

        form.setFieldsValue({
          title: data.title,
          shortDescription: data.shortDescription,
          equation: data.equation,
          longDescription: data.longDescription,
          mnemonic: data.mnemonic,
          bulletPoints: data.bulletPoints || [],
          image: savedImage,
          subject: subjectId || undefined,
          topic: topicId || undefined,
          exams: examIds,
        });
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch equation"));
      } finally {
        setInitialLoading(false);
      }
    };

    void load();
  }, [params.id, form]);

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
      const { image, ...rest } = values;
      const imageMetadata = toPlainImageMetadata(image);
      await equationsApi.update(params.id, {
        ...rest,
        bulletPoints: (values.bulletPoints || []).filter((item) =>
          Boolean(item?.trim())
        ),
        // new / kept picture -> send it; removed picture -> null; never had one -> omit
        ...(imageMetadata
          ? { image: imageMetadata }
          : hadImage.current
            ? { image: null }
            : {}),
      });
      hadImage.current = Boolean(imageMetadata);
      message.success("Equation updated successfully");
      router.push(equationsListHref(searchParams));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update equation"));
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
          submitLabel="Update Equation"
          onSubmit={handleSubmit}
          title="Edit Equation"
        />
      </div>
    </EditPageShell>
  );
}
