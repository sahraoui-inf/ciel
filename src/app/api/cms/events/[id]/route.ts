import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.titleEn !== undefined) data.titleEn = body.titleEn;
    if (body.titleAr !== undefined) data.titleAr = body.titleAr;
    if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn;
    if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.location !== undefined) data.location = body.location;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const event = await prisma.event.update({ where: { id }, data });
    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Event", recordId: id });
    return NextResponse.json({ event });
  } catch (err) {
    logger.error({ err }, "Failed to update event");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    await prisma.event.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "Event", recordId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete event");
    return handleError(err);
  }
}
