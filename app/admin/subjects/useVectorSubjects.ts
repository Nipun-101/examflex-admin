"use client";

import { useEffect, useState } from "react";
import { catalogApi, type VectorSubject } from "@/app/services/ezprep-api";

export interface VectorSubjectOption {
  value: string;
  label: string;
}

/**
 * NCERT vector subjects a subject can map to. A failed load only hides the
 * options; it never blocks the subject form.
 */
export function useVectorSubjects() {
  const [vectorSubjects, setVectorSubjects] = useState<VectorSubject[]>([]);

  useEffect(() => {
    let cancelled = false;
    catalogApi
      .listVectorSubjects()
      .then((res) => {
        if (!cancelled) setVectorSubjects(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setVectorSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options: VectorSubjectOption[] = vectorSubjects.map((s) => ({
    value: s.key,
    label: s.label,
  }));
  const labelFor = (key?: string | null) =>
    key ? (vectorSubjects.find((s) => s.key === key)?.label ?? key) : undefined;

  return { options, labelFor };
}

export const VECTOR_SUBJECT_HELP =
  "Questions in a mapped subject get NCERT citations. Several subjects can share one (e.g. Botany and Zoology → Biology).";
