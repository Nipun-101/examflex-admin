export const EQUATIONS_LIST_QUERY_KEYS = [
  "page",
  "limit",
  "subjectId",
  "examId",
  "topicId",
  "search",
] as const;

export function equationsListHref(
  params?: { get(name: string): string | null } | null
): string {
  const next = new URLSearchParams();
  if (params) {
    for (const key of EQUATIONS_LIST_QUERY_KEYS) {
      const value = params.get(key);
      if (value) {
        next.set(key, value);
      }
    }
  }
  const query = next.toString();
  return query ? `/admin/equations?${query}` : "/admin/equations";
}

export function equationsEditHref(
  equationId: string,
  params?: { get(name: string): string | null } | null
): string {
  const listHref = equationsListHref(params);
  const queryIndex = listHref.indexOf("?");
  const query = queryIndex >= 0 ? listHref.slice(queryIndex) : "";
  return `/admin/equations/${equationId}${query}`;
}
