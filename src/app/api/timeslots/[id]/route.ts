import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();
  try {
    const { id } = await params;
    const slot = await prisma.timeSlot.findUnique({ where: { id } });
    if (!slot) return NextResponse.json({ error: "Time slot not found" }, { status: 404 });
    return NextResponse.json({ timeSlot: slot });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();
  try {
    const { id } = await params;
    const body = await request.json();
    const slot = await prisma.timeSlot.update({
      where: { id },
      data: { name: body.name, nameAr: body.nameAr, days: body.days, startTime: body.startTime, endTime: body.endTime, isActive: body.isActive },
    });
    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "TimeSlot", recordId: id });
    return NextResponse.json({ timeSlot: slot });
  } catch (err) {
    return handleError(err, "Failed to update time slot");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();
  try {
    const { id } = await params;
    await prisma.timeSlot.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "TimeSlot", recordId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err, "Failed to delete time slot");
  }
}
