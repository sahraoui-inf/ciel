import { prisma } from "./db";

/** Enrollment status required before a student ID card becomes available. */
const REQUIRED_STATUS = "Active";

export type IdCardCourse = {
  enrollmentId: string;
  /** Human-readable sequential reference, e.g. ENR-2026-00042. */
  enrollmentNumber: string;
  classGroupName: string;
  courseName: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type IdCardAccess = {
  allowed: boolean;
  /** Machine-readable reason, useful for messages and tests. */
  reason: "eligible" | "no_profile" | "no_valid_enrollment" | "outside_period";
  /** Enrollments validated and inside their course period (drives the "valid until" date). */
  validCourses: IdCardCourse[];
  /** Enrollments validated but whose course period has not started or has ended. */
  expiredCourses: IdCardCourse[];
  /** Latest end date across valid courses, null when no dates are set. */
  validUntil: Date | null;
};

/** Splits a single "name" field into first / last name. Last word becomes the last name. */
export function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function isWithinPeriod(start: Date | null, end: Date | null, now: Date): boolean {
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function pad(n: number, width = 5) {
  return String(n).padStart(width, "0");
}

/**
 * Assigns a stable sequential number (ENR-YYYY-00000) to each enrollment,
 * ordered by creation date within its calendar year.
 */
async function assignEnrollmentNumbers(
  enrollments: { id: string; enrolledAt: Date }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (enrollments.length === 0) return result;

  const years = new Set(enrollments.map(e => e.enrolledAt.getUTCFullYear()));
  const rangeStart = new Date(Date.UTC(Math.min(...years), 0, 1));
  const rangeEnd = new Date(Date.UTC(Math.max(...years) + 1, 0, 1));

  const all = await prisma.enrollment.findMany({
    where: { enrolledAt: { gte: rangeStart, lt: rangeEnd } },
    select: { id: true, enrolledAt: true },
    orderBy: [{ enrolledAt: "asc" }, { id: "asc" }],
  });

  const counters = new Map<number, number>();
  for (const e of all) {
    const year = e.enrolledAt.getUTCFullYear();
    const next = (counters.get(year) ?? 0) + 1;
    counters.set(year, next);
    result.set(e.id, `ENR-${year}-${pad(next)}`);
  }

  return result;
}

/**
 * A student ID card is granted only when the student has at least one enrollment
 * with status "Active" (validated by the admin/teacher) whose class group course
 * period covers the current date.
 */
export async function getStudentIdCardAccess(studentId: string): Promise<IdCardAccess> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      enrollments: {
        where: { status: REQUIRED_STATUS as never },
        select: {
          id: true,
          enrolledAt: true,
          classGroup: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
              course: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!student) {
    return { allowed: false, reason: "no_profile", validCourses: [], expiredCourses: [], validUntil: null };
  }

  const numbers = await assignEnrollmentNumbers(student.enrollments);
  const now = new Date();
  const validCourses: IdCardCourse[] = [];
  const expiredCourses: IdCardCourse[] = [];

  for (const enr of student.enrollments) {
    const cg = enr.classGroup;
    const item: IdCardCourse = {
      enrollmentId: enr.id,
      enrollmentNumber: numbers.get(enr.id) ?? "—",
      classGroupName: cg.name,
      courseName: cg.course.name,
      startDate: cg.startDate,
      endDate: cg.endDate,
    };
    if (isWithinPeriod(cg.startDate, cg.endDate, now)) validCourses.push(item);
    else expiredCourses.push(item);
  }

  const validUntil = validCourses.reduce<Date | null>((acc, c) => {
    if (!c.endDate) return acc;
    if (!acc || c.endDate > acc) return c.endDate;
    return acc;
  }, null);

  return {
    allowed: validCourses.length > 0,
    reason: validCourses.length > 0 ? "eligible" : student.enrollments.length > 0 ? "outside_period" : "no_valid_enrollment",
    validCourses,
    expiredCourses,
    validUntil,
  };
}
