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
    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.questionEn !== undefined) data.questionEn = body.questionEn;
    if (body.questionAr !== undefined) data.questionAr = body.questionAr;
    if (body.answerEn !== undefined) data.answerEn = body.answerEn;
    if (body.answerAr !== undefined) data.answerAr = body.answerAr;
    if (body.order !== undefined) data.order = body.order;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const faq = await prisma.faq.update({ where: { id }, data });
    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Faq", recordId: id });
    return NextResponse.json({ faq });
  } catch (err) {
    logger.error({ err }, "Failed to update FAQ");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });

    await prisma.faq.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "Faq", recordId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete FAQ");
    return handleError(err);
  }
}
