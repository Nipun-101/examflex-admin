export type {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  PaginationMeta,
} from "@/app/services/ezprep-api";

export type DraftStatus =
  | "GENERATING"
  | "REVIEW"
  | "PUBLISHING"
  | "PUBLISHED"
  | "DISCARDED";
export type ExamMode = "Mixed" | "Session-wise";
export type DifficultyLevel = "easy" | "medium" | "hard";

/** One exam subject row: its id and how many questions the paper needs from it. */
export interface FullMockExamSubject {
  subjectId: string;
  name: string;
  numberOfQuestions: number;
}

/** Admin-chosen easy/medium/hard split for one exam subject. */
export interface SubjectDifficultySplit {
  subjectId: string;
  easy: number;
  medium: number;
  hard: number;
}

export interface FullMockExamListItem {
  id: string;
  examName: string;
  duration?: string;
  questions?: number;
  totalMarks?: number;
  category?: string;
  examGroup?: string;
  subjects: string[];
  /** Subject ids + quotas, same order as `subjects`. */
  subjectDetails?: FullMockExamSubject[];
  mode: ExamMode;
}

export interface QuestionImageRef {
  key: string;
  bucket: string;
}

export interface QuestionTextLocale {
  text?: string | null;
  imageUrl?: string | null;
  /** Present when the list payload only has storage metadata. Signed at render time. */
  image?: QuestionImageRef | null;
}

export interface SafeQuestionOption {
  id: string;
  type: string;
  en?: string | null;
  ml?: string | null;
  imageUrl?: string | null;
  image?: QuestionImageRef | null;
}

export interface SafeQuestion {
  _id: string;
  questionText: {
    en: QuestionTextLocale;
    ml: QuestionTextLocale;
  };
  optionType?: string;
  options: SafeQuestionOption[];
  /** Correct option id; only present on admin published views. */
  correctAnswer?: string;
  subject?: string;
  topic?: string;
  difficultyLevel?: DifficultyLevel | string;
  tags?: string[];
}

export interface DraftQuestionItem extends SafeQuestion {
  position: number;
  marksPerQuestion: number;
  negativeMarking: number;
  replacedFrom?: string;
}

export interface DraftSubjectBlock {
  subjectId: string;
  name: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  hasNegativeMarking: boolean;
  negativeMarksPerQuestion: number;
  sessionTime?: number;
  questions: DraftQuestionItem[];
}

export interface DraftExamSnapshot {
  name: string;
  description?: string;
  duration?: number;
  totalQuestions: number;
  totalMarks?: number;
  isSessionWise: boolean;
}

export interface DraftResponse {
  id: string;
  examId: string;
  status: DraftStatus;
  examSnapshot: DraftExamSnapshot;
  subjects: DraftSubjectBlock[];
  publishedMockTestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftListItem {
  id: string;
  examId: string;
  examName: string;
  status: DraftStatus;
  totalQuestions: number;
  totalMarks?: number;
  duration?: number;
  isSessionWise: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchQuestionItem extends SafeQuestion {
  snippet?: string;
}

/** One stored cut-off: absolute marks on the paper's own scale. */
export interface CourseCutoffEntry {
  offeringId: string;
  cutoffMarks: number;
}

/** One edit on a published paper. `null` removes the course's cut-off. */
export interface CourseCutoffUpdate {
  offeringId: string;
  cutoffMarks: number | null;
}

export interface PublishDraftPayload {
  title?: string;
  description?: string;
  allowRetake?: boolean;
  shuffleOptions?: boolean;
  keepSubjectOrder?: boolean;
  showResultsImmediately?: boolean;
  passingScore?: number;
  accessMode?: "FREE" | "ENTITLED";
  /** Optional per-course cut-offs in absolute marks. */
  courseCutoffs?: CourseCutoffEntry[];
}

export interface PublishDraftResult {
  mockTestId: string;
  draft: DraftResponse;
}

export interface FullMockSubjectConfig {
  subject: string;
  name: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
  hasNegativeMarking: boolean;
  negativeMarksPerQuestion: number;
  sessionTime?: number;
  questionStartIndex: number;
  questionEndIndex: number;
}

export interface ExamSummary {
  id: string;
  name: string;
  description?: string;
}

export interface FullMockTestListItem {
  id: string;
  title?: string;
  description?: string;
  totalQuestions: number;
  durationInMinutes: number;
  totalMarks?: number;
  isSessionWise: boolean;
  exam: ExamSummary | null;
  subjectConfig: FullMockSubjectConfig[];
  marksPerQuestion: number;
  negativeMarking: number;
  passingScore?: number;
  allowRetake: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Admin-only: safe questions grouped by subject (published detail). */
  subjects?: DraftSubjectBlock[];
  /** Admin-only: stored per-course cut-off marks. */
  courseCutoffs?: CourseCutoffEntry[];
}
