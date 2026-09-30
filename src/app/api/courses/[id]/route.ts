import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher", "Student")) return unauthorized();

  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: { language: true, level: true, department: true, classGroups: { include: { teacher: { include: { user: true } }, timeSlots: { include: { timeSlot: true } }, _count: { select: { enrollments: { where: { status: { not: "Dropped" } } } } } } } },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ course });
  } catch (err) {
    logger.error({ err }, "Failed to fetch course");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.languageId !== undefined) data.languageId = body.languageId;
    if (body.levelId !== undefined) data.levelId = body.levelId;
    if (body.departmentId !== undefined) data.departmentId = body.departmentId || null;
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.description !== undefined) data.description = body.description;
    if (body.maxStudents !== undefined) data.maxStudents = body.maxStudents;
    if (body.registrationOpen !== undefined) data.registrationOpen = body.registrationOpen;
    if (body.registrationStart !== undefined) data.registrationStart = new Date(body.registrationStart);
    if (body.registrationEnd !== undefined) data.registrationEnd = new Date(body.registrationEnd);
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const course = await prisma.course.update({ where: { id }, data });

    await writeAuditLog({
      userId: user!.id, action: "UPDATE", tableAffected: "Course", recordId: id,
      oldValue: JSON.stringify(existing), newValue: JSON.stringify(body),
    });

    return NextResponse.json({ course });
  } catch (err) {
    logger.error({ err }, "Failed to update course");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    await prisma.course.delete({ where: { id } });
    await writeAuditLog({
      userId: user!.id, action: "DELETE", tableAffected: "Course", recordId: id,
      oldValue: JSON.stringify(existing),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete course");
    return handleError(err);
  }
}
