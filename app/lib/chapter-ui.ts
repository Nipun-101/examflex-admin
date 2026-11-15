/**
 * UI copy for the content scope the API calls "topic".
 *
 * Backend / ez-prep-api mapping (keep wire names; this file is display-only):
 * - Catalog entity: Topic model, routes `/v1/topics`, payload fields `topic` / `topicId`
 * - Paper type: `paperType: "TOPIC_WISE"` (topic-wise mock tests)
 * - Drafts: `/v1/mock-tests/drafts` (topic-wise drafts → published TOPIC_WISE papers)
 * - Question / tag / filter query params still use `topic` / `topicId`
 *
 * Product language in examflex-admin shows "Chapter" / "Chapter-wise" only.
 */
export const ChapterUi = {
  singular: "Chapter",
  plural: "Chapters",
  /** Long product name for TOPIC_WISE papers */
  paperType: "Chapter-wise",
  paperTypeTitle: "Chapter Wise",
  paperSingular: "chapter-wise test",
  paperPlural: "chapter-wise tests",
  paperShortSingular: "chapter test",
  paperShortPlural: "chapter tests",
  navPapers: "Chapter Wise Tests",
  navCatalog: "Chapters",
  managementTitle: "Chapter Wise Tests Management",
  createCardTitle: "Create New Chapter Wise Test",
  draftFallbackTitle: "Chapter-wise draft",
  draftCreated: "Chapter-wise draft created",
  createFromSelectionTitle: (count: number) =>
    `Create chapter-wise test (${count} questions)`,
  practiceLabel: "Chapter-wise practice",
  selectRequired: "Please select a chapter",
  selectPlaceholder: "Select chapter",
  selectPluralPlaceholder: "Select chapters",
  filterPlaceholder: "Filter by chapter",
  loading: "Loading chapters",
  noneForSubject: "No chapters for this subject",
  missingOnDraft: "Missing chapter",
  locked: "Chapter locked",
  noTopicOnDraft: "This draft has no chapter",
  noTopicOnDraftHint:
    "Chapter-wise tests require a chapter. Discard this draft and create a new one with a chapter selected. Use a sprint test for questions from multiple chapters.",
  subjectHasNoTopics:
    "This subject has no chapters. Add a chapter first, or use a sprint test for multi-chapter practice.",
  selectSubjectAndTopicFirst: "Please select subject and chapter first",
  sameExamRequired:
    "Every question on a chapter-wise test must be tagged to the same exam. Change the selection, then try again.",
  sameSubjectRequired:
    "Every question on a chapter-wise test must belong to the same subject.",
  sameTopicRequired:
    "Every question on a chapter-wise test must belong to the same chapter.",
  sizeAtLeast: (sizes: string) =>
    `Select at least 10 questions. A chapter-wise test must have exactly ${sizes} questions.`,
  sizeExact: (sizes: string, count: number) =>
    `A chapter-wise test must have exactly ${sizes} questions. You have selected ${count}. Add or remove questions to reach one of those counts.`,
  canCreateFromSelection: (count: number) =>
    `${count} questions selected. You can create a chapter-wise test.`,
  topicTestButton: "+ Chapter Test",
  replacementMustMatch: "Replacement must stay on this chapter and subject.",
  failedFetch: "Failed to fetch chapters",
  failedCreateDraft: "Failed to create chapter-wise draft",
  dashboardPapersDescription:
    "Chapter-wise papers grouped for practice by exam.",
  dashboardCatalogDescription:
    "Chapter inventory grouped under their parent subjects.",
  subjectsWithChaptersDescription:
    "Subject catalog with how many chapters sit under each.",
  tagsBySubjectAndChapter:
    "Question tags used to label items by subject and chapter.",
  userActivityLabel: "Chapter test activity",
  userSectionTitle: "Chapter tests",
  userNoun: { singular: "chapter test", plural: "chapter tests" } as const,
  userNounAttempted: {
    singular: "chapter test attempted",
    plural: "chapter tests attempted",
  } as const,
  userEachTitle: "Each chapter test",
  userEachDescription:
    "Score on each of the last 5 finished chapter tests, newest first.",
  userEmptyFinished: "This learner has not finished a chapter test.",
  userEmptySummary: "No finished chapter tests yet.",
  nameLabel: "Chapter Name",
  enterName: "Enter chapter name",
  enterDescription: "Enter chapter description",
  enterNameRequired: "Please enter chapter name",
  addNewTitle: "Add New Chapter",
  listTitle: "Chapters List",
  createButton: "Create Chapter",
  updateButton: "Update Chapter",
  editTitle: "Edit Chapter",
  deleteTitle: "Delete Chapter",
  deleteConfirm:
    "Are you sure you want to delete this chapter? This action cannot be undone.",
  createdSuccess: "Chapter created successfully",
  updatedSuccess: "Chapter updated successfully",
  deletedSuccess: "Chapter deleted successfully",
  failedCreate: "Failed to create chapter",
  failedUpdate: "Failed to update chapter",
  failedDelete: "Failed to delete chapter",
  failedFetchOne: "Failed to fetch chapter",
  paginationTotal: (total: number) => `Total ${total} chapters`,
  sprintReplaceTopicMayDiffer:
    "Replacement must be the same subject. Chapter may differ. Marks and position stay with this slot.",
} as const;
