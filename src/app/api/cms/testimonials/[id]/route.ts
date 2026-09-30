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
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.studentName !== undefined) data.studentName = body.studentName;
    if (body.contentEn !== undefined) data.contentEn = body.contentEn;
    if (body.contentAr !== undefined) data.contentAr = body.contentAr;
    if (body.rating !== undefined) data.rating = body.rating;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const testimonial = await prisma.testimonial.update({ where: { id }, data });
    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Testimonial", recordId: id });
    return NextResponse.json({ testimonial });
  } catch (err) {
    logger.error({ err }, "Failed to update testimonial");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });

    await prisma.testimonial.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "Testimonial", recordId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete testimonial");
    return handleError(err);
  }
}
