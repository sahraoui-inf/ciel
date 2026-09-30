import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, checkRateLimit, rateLimitedResponse } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { hash } from "bcryptjs";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";

    const staff = await prisma.user.findMany({
      where: {
        role: "Admin",
        ...(search ? { name: { contains: search } } : {}),
      },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
        adminDepartments: {
          select: { department: { select: { id: true, name: true, nameAr: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const staffWithDepts = staff.map(s => ({
      ...s,
      departments: s.adminDepartments.map(ad => ad.department),
    }));

    return NextResponse.json({ staff: staffWithDepts });
  } catch (err) {
    logger.error({ err }, "Failed to fetch staff");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request, 10, 60_000);
  if (!rl.allowed) return rateLimitedResponse();
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const hashedPassword = await hash(body.password, 12);

    const staff = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        phone: body.phone || null,
        role: "Admin",
        isActive: body.isActive !== undefined ? body.isActive : true,
        adminDepartments: body.departmentIds?.length
          ? { create: body.departmentIds.map((deptId: string) => ({ departmentId: deptId })) }
          : undefined,
      },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
      },
    });

    const created = await prisma.user.findUnique({
      where: { id: staff.id },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
        adminDepartments: {
          select: { department: { select: { id: true, name: true, nameAr: true } } },
        },
      },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "User", recordId: staff.id });
    return NextResponse.json({
      staff: { ...created, departments: created!.adminDepartments.map(ad => ad.department) },
    }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create staff");
    return handleError(err);
  }
}
