import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, unauthorized, handleError, getAdminDeptIds } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  try {
    // Auto-expire stale pending enrollments
    await prisma.enrollment.updateMany({
      where: { status: "Pending", expiresAt: { lt: new Date() } },
      data: { status: "Expired" },
    });

    const base = {
      user: { id: user.id, name: user.name, role: user.role },
    };

    if (user.role === "SuperAdmin" || user.role === "Admin") {
      const deptIds = await getAdminDeptIds(user);
      const deptFilter = deptIds === null ? {} : { departmentId: { in: deptIds } };

      const [studentCount, courseCount, teacherCount, pendingEnrollments] = await Promise.all([
        deptIds === null
          ? prisma.studentProfile.count()
          : prisma.enrollment.groupBy({ by: ["studentId"], where: { classGroup: { course: { departmentId: { in: deptIds } } } } }).then(r => r.length),
        prisma.course.count({ where: { isActive: true, ...deptFilter } }),
        prisma.teacherProfile.count({ where: { isActive: true, ...deptFilter } }),
        deptIds === null
          ? prisma.enrollment.count({ where: { status: "Pending" } })
          : prisma.enrollment.count({ where: { status: "Pending", classGroup: { course: { departmentId: { in: deptIds } } } } }),
      ]);
      return NextResponse.json({ ...base, studentCount, courseCount, teacherCount, pendingEnrollments });
    }

    if (user.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        include: { _count: { select: { classGroups: true } } },
      });
      if (!teacher) return NextResponse.json({ ...base, myGroups: 0, myStudents: 0 });

      const groupIds = (await prisma.classGroup.findMany({
        where: { teacherId: teacher.id },
        select: { id: true },
      })).map(g => g.id);

      const myStudents = await prisma.enrollment.count({
        where: { classGroupId: { in: groupIds }, status: { not: "Dropped" } },
      });

      return NextResponse.json({ ...base, myGroups: teacher._count.classGroups, myStudents });
    }

    if (user.role === "Student") {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: { _count: { select: { enrollments: true } } },
      });
      return NextResponse.json({ ...base, myEnrollmentsCount: profile?._count.enrollments ?? 0 });
    }

    return NextResponse.json(base);
  } catch (err) {
    logger.error({ err }, "Failed to fetch dashboard data");
    return handleError(err);
  }
}
