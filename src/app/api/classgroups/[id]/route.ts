import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const { id } = await params;
    const group = await prisma.classGroup.findUnique({
      where: { id },
      include: {
        course: { include: { language: true, level: true } },
        teacher: { include: { user: { select: { name: true } } } },
        timeSlots: { include: { timeSlot: true } },
        _count: { select: { enrollments: { where: { status: { not: "Dropped" } } } } },
      },
    });
    if (!group) return NextResponse.json({ error: "Class group not found" }, { status: 404 });
    return NextResponse.json({ group });
  } catch (err) {
    logger.error({ err }, "Failed to fetch class group");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.classGroup.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Class group not found" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.teacherId !== undefined) data.teacherId = body.teacherId;
    if (body.room !== undefined) data.room = body.room;
    if (body.maxCapacity !== undefined) data.maxCapacity = body.maxCapacity;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const group = await prisma.classGroup.update({ where: { id }, data });

    // Sync time slots if provided
    if (body.timeSlotIds !== undefined) {
      await prisma.classGroupTimeSlot.deleteMany({ where: { classGroupId: id } });
      if (body.timeSlotIds.length > 0) {
        await prisma.classGroupTimeSlot.createMany({
          data: body.timeSlotIds.map((tsId: string) => ({ classGroupId: id, timeSlotId: tsId })),
        });
      }
    }

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "ClassGroup", recordId: id });
    return NextResponse.json({ group });
  } catch (err) {
    logger.error({ err }, "Failed to update class group");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.classGroup.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Class group not found" }, { status: 404 });

    await prisma.classGroup.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "ClassGroup", recordId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete class group");
    return handleError(err);
  }
}
