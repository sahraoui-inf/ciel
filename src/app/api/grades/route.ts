import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher", "Student")) return unauthorized();

  try {
    const url = new URL(request.url);
    const examId = url.searchParams.get("examId");
    const enrollmentId = url.searchParams.get("enrollmentId");

    const where: Record<string, unknown> = {};
    if (examId) where.examId = examId;
    if (enrollmentId) where.enrollmentId = enrollmentId;

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (teacher) {
        const myGroupIds = (await prisma.classGroup.findMany({
          where: { teacherId: teacher.id }, select: { id: true },
        })).map(g => g.id);
        where.enrollment = { classGroupId: { in: myGroupIds } };
      }
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        enrollment: { include: { student: { include: { user: { select: { name: true } } } } } },
        exam: true,
      },
      orderBy: { gradedAt: "desc" },
    });
    return NextResponse.json({ grades });
  } catch (err) {
    logger.error({ err }, "Failed to fetch grades");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const body = await request.json();

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      const enr = await prisma.enrollment.findUnique({
        where: { id: body.enrollmentId },
        include: { classGroup: true },
      });
      if (!enr || enr.classGroup.teacherId !== teacher.id) {
        return NextResponse.json({ error: "Not authorized for this enrollment" }, { status: 403 });
      }
    }

    const grade = await prisma.grade.create({
      data: {
        enrollmentId: body.enrollmentId,
        examId: body.examId,
        score: body.score,
        gradedBy: user!.id,
      },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Grade", recordId: grade.id });
    return NextResponse.json({ grade }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create grade");
    return handleError(err);
  }
}
