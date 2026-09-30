import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher", "Student")) return unauthorized();

  try {
    const where: Record<string, unknown> = {};
    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId");
    const teacherId = url.searchParams.get("teacherId");

    if (courseId) where.courseId = courseId;
    if (teacherId) where.teacherId = teacherId;
    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (teacher) where.teacherId = teacher.id;
      else return NextResponse.json({ groups: [] });
    }

    const groups = await prisma.classGroup.findMany({
      where: { ...where, isActive: true },
      include: {
        course: { include: { language: true, level: true } },
        teacher: { include: { user: { select: { name: true } } } },
        timeSlots: { include: { timeSlot: true } },
        _count: { select: { enrollments: { where: { status: { not: "Dropped" } } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ groups });
  } catch (err) {
    logger.error({ err }, "Failed to fetch class groups");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const body = await request.json();
    const group = await prisma.classGroup.create({
      data: {
        courseId: body.courseId,
        name: body.name,
        teacherId: body.teacherId,
        room: body.room,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        maxCapacity: body.maxCapacity || 30,
        timeSlots: body.timeSlotIds?.length
          ? { create: body.timeSlotIds.map((tsId: string) => ({ timeSlotId: tsId })) }
          : undefined,
      },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "ClassGroup", recordId: group.id });
    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create class group");
    return handleError(err);
  }
}
