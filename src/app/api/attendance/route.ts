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
    const classGroupId = url.searchParams.get("classGroupId");
    const enrollmentId = url.searchParams.get("enrollmentId");
    const date = url.searchParams.get("date");

    const where: Record<string, unknown> = {};
    if (classGroupId) {
      where.enrollment = { classGroupId };
    }
    if (enrollmentId) where.enrollmentId = enrollmentId;
    if (date) where.date = new Date(date);

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (teacher) {
        const myGroupIds = (await prisma.classGroup.findMany({
          where: { teacherId: teacher.id }, select: { id: true },
        })).map(g => g.id);
        where.enrollment = { ...(where.enrollment as Record<string, unknown> || {}), classGroupId: { in: myGroupIds } };
      }
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: { include: { user: { select: { name: true, email: true } } } },
            classGroup: { include: { course: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ records });
  } catch (err) {
    logger.error({ err }, "Failed to fetch attendance");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const body = await request.json();
    const { records } = body;

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (teacher) {
        const myGroupIds = (await prisma.classGroup.findMany({
          where: { teacherId: teacher.id }, select: { id: true },
        })).map(g => g.id);
        for (const r of records) {
          const enr = await prisma.enrollment.findUnique({ where: { id: r.enrollmentId } });
          if (!enr || !myGroupIds.includes(enr.classGroupId)) {
            return NextResponse.json({ error: "Not authorized for this enrollment" }, { status: 403 });
          }
        }
      }
    }

    const created = [];
    for (const r of records) {
      const existing = await prisma.attendance.findFirst({
        where: { enrollmentId: r.enrollmentId, date: new Date(r.date) },
      });
      if (existing) {
        const updated = await prisma.attendance.update({
          where: { id: existing.id },
          data: { status: r.status },
        });
        created.push(updated);
      } else {
        const newRecord = await prisma.attendance.create({
          data: { enrollmentId: r.enrollmentId, date: new Date(r.date), status: r.status },
        });
        created.push(newRecord);
      }
    }

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Attendance", recordId: `batch:${created.length}` });
    return NextResponse.json({ records: created }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to save attendance");
    return handleError(err, "Failed to save attendance");
  }
}
