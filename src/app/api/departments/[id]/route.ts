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
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    return NextResponse.json({ department });
  } catch (err) {
    logger.error({ err }, "Failed to fetch department");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    const body = await request.json();
    if (body.code && body.code !== existing.code) {
      const dup = await prisma.department.findUnique({ where: { code: body.code } });
      if (dup) return NextResponse.json({ error: "Department code already in use" }, { status: 409 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.nameAr !== undefined) data.nameAr = body.nameAr;
    if (body.description !== undefined) data.description = body.description;
    if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr;
    if (body.code !== undefined) data.code = body.code;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const department = await prisma.department.update({ where: { id }, data });
    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Department", recordId: id });
    return NextResponse.json({ department });
  } catch (err) {
    logger.error({ err }, "Failed to update department");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    await prisma.department.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "Department", recordId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete department");
    return handleError(err);
  }
}
