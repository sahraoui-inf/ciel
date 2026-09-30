import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { getStudentIdCardAccess, splitName } from "@/lib/idcard";
import IDCard from "@/components/shared/IDCard";

export default async function MyIdCardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await verifySession();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== "Student") redirect(`/${locale}/dashboard`);

  const student = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });
  if (!student) notFound();

  const access = await getStudentIdCardAccess(student.id);
  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/students/${student.id}`;

  if (!access.allowed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">ID Card not available</h1>
          <p className="text-sm text-muted-foreground mb-1">
            {access.reason === "outside_period"
              ? "Your enrollments are validated, but no course period is currently in progress."
              : "Your ID card is issued once an enrollment is validated by the administration."}
          </p>
          {access.expiredCourses.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Validated course(s): {access.expiredCourses.map(c => c.courseName).join(", ")}
            </p>
          )}
          <Link href={`/${locale}/enroll`}
            className="inline-block mt-4 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Browse courses
          </Link>
        </div>
      </div>
    );
  }

  const primary = access.validCourses[0];
  const { firstName, lastName } = splitName(student.user.name);

  const [siteName, logoUrl] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "site_name" } }),
    prisma.systemSetting.findUnique({ where: { key: "logo_url" } }),
  ]);

  return (
    <div className="py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="mb-6">
          <Link href={`/${locale}/profile`} className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Profile
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center">My ID Card</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {student.user.name} &mdash; {student.user.email}
        </p>

        <IDCard
          type="student"
          firstName={firstName}
          lastName={lastName}
          course={primary.courseName}
          enrollmentNumber={primary.enrollmentNumber}
          profileUrl={profileUrl}
          photoUrl={student.photo || undefined}
          siteName={siteName?.value || "LinguaCenter"}
          logoUrl={logoUrl?.value || undefined}
        />

        {access.validCourses.length > 1 && (
          <div className="mt-6 bg-card border border-border rounded-lg p-4 text-sm">
            <h2 className="font-semibold mb-2">Other active courses</h2>
            <ul className="space-y-1">
              {access.validCourses.slice(1).map(c => (
                <li key={c.enrollmentId} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{c.courseName} — {c.classGroupName}</span>
                  <span className="font-mono text-xs shrink-0">{c.enrollmentNumber}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 bg-card border border-border rounded-lg p-4 text-sm">
          <h2 className="font-semibold mb-2">Valid for</h2>
          <ul className="space-y-1">
            {access.validCourses.map(c => (
              <li key={c.enrollmentId} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{c.courseName} — {c.classGroupName}</span>
                <span className="font-medium shrink-0">
                  {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}
                  {" → "}
                  {c.endDate ? new Date(c.endDate).toLocaleDateString() : "open-ended"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            This card is only available while at least one validated course period is in progress.
          </p>
        </div>
      </div>
    </div>
  );
}
