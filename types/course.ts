import type { CoursePlan } from "@/types/commission";

export interface Course {
  /** The Delta Finance catalogue item this course is, once mapped. */
  financeItemId?: string | null;
  /** The first of `lmsCourseSlugs` — what a single-course reader sees. */
  lmsCourseSlug?: string;
  /** Every LMS course it opens, in order — two for a bundle. */
  lmsCourseSlugs?: string[];
  _id: string;
  name: string;
  description?: string;
  amount: number;
  /** The bonus a client gets with it, in the amount's currency; 0 (or missing, on one from before) for none. */
  bonusAmount?: number;
  /** The SAC code this course is billed under, for GST invoices. */
  hsnSac?: string;
  /** What selling it earns (AED per approved sale) — set on the Commission plan. */
  commission?: CoursePlan;
  /** How the Bangalore academy sells it — set on the mapping ("Map"). */
  bangalore?: CourseBangalore;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

/**
 * A course as the Bangalore academy sells it: its INR price (a Bangalore close
 * is refused without one), its item in finance's Bangalore org, and its LMS
 * courses — none listed opens the same as Dubai's.
 */
export interface CourseBangalore {
  price?: number | null;
  financeItemId?: string | null;
  lmsCourseSlugs?: string[];
}

/** The INR price a Bangalore close starts from; 0 when the course has none. */
export const bangalorePriceOf = (course?: Pick<Course, "bangalore"> | null): number => {
  const p = Number(course?.bangalore?.price ?? 0);
  return Number.isFinite(p) && p > 0 ? p : 0;
};

export interface CourseFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/** A published course in the LMS, as the Map screen offers it. */
export interface LmsCourse {
  slug: string;
  title: string;
}

/** Every LMS course a course opens; a single mapping from before reads the same. */
export const lmsCoursesOf = (course: Pick<Course, "lmsCourseSlug" | "lmsCourseSlugs">): string[] =>
  course.lmsCourseSlugs?.length ? course.lmsCourseSlugs : course.lmsCourseSlug ? [course.lmsCourseSlug] : [];
