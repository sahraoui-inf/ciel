import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const { id } = await params;
    const level = await prisma.level.findUnique({ where: { id }, include: { language: true, department: true } });
    if (!level) return NextResponse.json({ error: "Level not found" }, { status: 404 });
    return NextResponse.json({ level });
  } catch (err) {
    logger.error({ err }, "Failed to fetch level");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.level.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Level not found" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.languageId !== undefined) data.languageId = body.languageId;
    if (body.departmentId !== undefined) data.departmentId = body.departmentId || null;
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.order !== undefined) data.order = body.order;
    if (body.description !== undefined) data.description = body.description;
    if (body.price !== undefined) data.price = body.price;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const level = await prisma.level.update({ where: { id }, data, include: { language: true, department: true } });
    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Level", recordId: id });
    return NextResponse.json({ level });
  } catch (err) {
    logger.error({ err }, "Failed to update level");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.level.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Level not found" }, { status: 404 });

    await prisma.level.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "Level", recordId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete level");
    return handleError(err);
  }
}
