import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher", "Student")) return unauthorized();
  try {
    const timeSlots = await prisma.timeSlot.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ timeSlots });
  } catch (err) {
    logger.error({ err }, "Failed to fetch time slots");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();
  try {
    const body = await request.json();
    const slot = await prisma.timeSlot.create({
      data: { name: body.name, nameAr: body.nameAr, days: body.days, startTime: body.startTime, endTime: body.endTime },
    });
    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "TimeSlot", recordId: slot.id });
    return NextResponse.json({ timeSlot: slot }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create time slot");
    return handleError(err, "Failed to create time slot");
  }
}
