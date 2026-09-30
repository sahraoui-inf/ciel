import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, getAdminDeptIds } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const languageId = url.searchParams.get("languageId");
    const departmentId = url.searchParams.get("departmentId");

    const user = await getApiUser(request);
    const deptIds = await getAdminDeptIds(user);

    const where: Record<string, unknown> = {};
    if (languageId) where.languageId = languageId;

    if (deptIds !== null) {
      if (deptIds.length === 0) return NextResponse.json({ levels: [] });
      where.departmentId = { in: deptIds };
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    const levels = await prisma.level.findMany({
      where,
      include: { language: true, department: true },
      orderBy: [{ order: "asc" }],
    });
    return NextResponse.json({ levels });
  } catch (err) {
    logger.error({ err }, "Failed to fetch levels");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    if (!body.name || !body.code || body.order === undefined) {
      return NextResponse.json({ error: "Name, code, and order are required" }, { status: 400 });
    }
    const level = await prisma.level.create({
      data: {
        languageId: body.languageId,
        departmentId: body.departmentId || null,
        name: body.name,
        code: body.code,
        order: body.order,
        description: body.description || null,
        price: body.price || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      include: { language: true, department: true },
    });
    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Level", recordId: level.id });
    return NextResponse.json({ level }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create level");
    return handleError(err);
  }
}
