import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher", "Student")) return unauthorized();

  try {
    const departments = await prisma.department.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ departments });
  } catch (err) {
    logger.error({ err }, "Failed to fetch departments");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const existing = await prisma.department.findUnique({ where: { code: body.code } });
    if (existing) return NextResponse.json({ error: "Department code already exists" }, { status: 409 });

    const department = await prisma.department.create({
      data: {
        name: body.name,
        nameAr: body.nameAr || null,
        description: body.description || null,
        descriptionAr: body.descriptionAr || null,
        code: body.code,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Department", recordId: department.id });
    return NextResponse.json({ department }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create department");
    return handleError(err);
  }
}
