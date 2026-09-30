import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { getStudentIdCardAccess, splitName } from "@/lib/idcard";
import IDCard from "@/components/shared/IDCard";

export default async function StudentIDCardPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await verifySession();
  if (!user) redirect(`/${locale}/login`);

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!student) notFound();

  let access: Awaited<ReturnType<typeof getStudentIdCardAccess>> | null = null;
  if (user.role === "Student") {
    // A student may only ever open their own card, and only while it is valid.
    if (student.userId !== user.id) notFound();
    access = await getStudentIdCardAccess(student.id);
    if (!access.allowed) redirect(`/${locale}/id-card`);
  } else if (user.role === "Teacher") {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!teacher) notFound();
    const owns = await prisma.enrollment.findFirst({
      where: { studentId: id, classGroup: { teacherId: teacher.id } },
      select: { id: true },
    });
    if (!owns) notFound();
  } else if (user.role === "Admin") {
    const deptIds = (await prisma.adminDepartment.findMany({
      where: { userId: user.id },
      select: { departmentId: true },
    })).map(r => r.departmentId);
    const inScope = await prisma.enrollment.findFirst({
      where: {
        studentId: id,
        classGroup: { course: { departmentId: { in: deptIds.length ? deptIds : ["__none__"] } } },
      },
      select: { id: true },
    });
    if (!inScope) notFound();
  } else if (user.role !== "SuperAdmin") {
    notFound();
  }

  // Staff view: fall back to any validated enrollment when none is currently in period,
  // so the card stays printable for administrative purposes.
  if (!access) access = await getStudentIdCardAccess(student.id);
  const primary = access.validCourses[0] ?? access.expiredCourses[0];
  const { firstName, lastName } = splitName(student.user.name);
  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/students/${id}`;

  const [siteName, logoUrl] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "site_name" } }),
    prisma.systemSetting.findUnique({ where: { key: "logo_url" } }),
  ]);

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="mb-6">
          <Link href={`/${locale}/students/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Student
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center">ID Card</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {student.user.name} &mdash; {student.user.email}
        </p>

        <IDCard
          type="student"
          firstName={firstName}
          lastName={lastName}
          course={primary?.courseName}
          enrollmentNumber={primary?.enrollmentNumber}
          profileUrl={profileUrl}
          photoUrl={student.photo || undefined}
          siteName={siteName?.value || "LinguaCenter"}
          logoUrl={logoUrl?.value || undefined}
        />

        {!access.allowed && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No course period is currently in progress for this student.
          </p>
        )}
      </div>
    </div>
  );
}
