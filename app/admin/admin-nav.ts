import {
  Activity,
  Book,
  CircleHelp,
  CircleX,
  FileCheck,
  FlaskConical,
  FolderTree,
  Headset,
  Layers,
  LayoutGrid,
  List,
  MessageSquare,
  Newspaper,
  Receipt,
  Shapes,
  ShoppingBag,
  Sigma,
  Tag,
  TrendingUp,
  Upload,
  Users,
  Calculator,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ChapterUi } from "@/app/lib/chapter-ui";

export type AdminNavBadge = "failed-questions" | "commerce-health";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: AdminNavBadge;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

/** Sidebar sections. Every admin route lives in exactly one group. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    label: "Learners",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
      { href: "/admin/counseling", label: "Counseling", icon: Headset },
    ],
  },
  {
    label: "Question bank",
    items: [
      { href: "/admin/questions", label: "Questions", icon: CircleHelp },
      { href: "/admin/equations", label: "Equations", icon: Sigma },
      { href: "/admin/bulk-upload", label: "Bulk upload", icon: Upload },
      {
        href: "/admin/failed-questions",
        label: "Failed questions",
        icon: CircleX,
        badge: "failed-questions",
      },
    ],
  },
  {
    label: "Papers",
    items: [
      // UI: Chapter Wise Tests — backend: TOPIC_WISE / /admin/mock-tests drafts
      { href: "/admin/mock-tests", label: ChapterUi.navPapers, icon: FlaskConical },
      { href: "/admin/full-mock-tests", label: "Full mock tests", icon: FileCheck },
      { href: "/admin/sprint-tests", label: "Sprint tests", icon: Zap },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/current-affairs", label: "Current affairs", icon: Newspaper },
      { href: "/admin/recommendations", label: "Recommendations", icon: TrendingUp },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/products", label: "Products", icon: ShoppingBag },
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/accounting", label: "Accounting", icon: Calculator },
      {
        href: "/admin/commerce-health",
        label: "Commerce health",
        icon: Activity,
        badge: "commerce-health",
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/categories", label: "Categories", icon: Shapes },
      { href: "/admin/exam-groups", label: "Exam groups", icon: FolderTree },
      { href: "/admin/exams", label: "Exams", icon: Book },
      { href: "/admin/subjects", label: "Subjects", icon: Layers },
      // UI: Chapters — backend Topic catalog `/v1/topics` (route still /admin/topics)
      { href: "/admin/topics", label: ChapterUi.navCatalog, icon: List },
      { href: "/admin/tags", label: "Tags", icon: Tag },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/** The nav item that owns `pathname`: exact match for the dashboard, segment prefix otherwise. */
export function findActiveNavItem(pathname: string): AdminNavItem | undefined {
  if (pathname === "/admin" || pathname === "/admin/") {
    return ALL_ITEMS[0];
  }
  return ALL_ITEMS.filter(
    (item) =>
      item.href !== "/admin" &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`))
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
