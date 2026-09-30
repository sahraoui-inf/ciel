import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, getAdminDeptIds } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { hash } from "bcryptjs";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const name = searchParams.get("name");

    const deptIds = await getAdminDeptIds(user);
    const where: Record<string, unknown> = {};
    if (name) where.user = { name: { contains: name } };

    if (deptIds !== null) {
      if (deptIds.length === 0) return NextResponse.json({ teachers: [] });
      where.departmentId = { in: deptIds };
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    const teachers = await prisma.teacherProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        department: true,
        classGroups: { include: { course: true }, where: { isActive: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ teachers });
  } catch (err) {
    logger.error({ err }, "Failed to fetch teachers");
    return handleError(err);
  }
}

export async function POST(request: Request) {
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
    const teacher = await prisma.teacherProfile.create({
      data: {
        department: body.departmentId ? { connect: { id: body.departmentId } } : undefined,
        specialization: body.specialization || null,
        hireDate: body.hireDate ? new Date(body.hireDate) : null,
        hourlyRate: body.hourlyRate || 0,
        user: {
          create: {
            name: body.name,
            email: body.email,
            phone: body.phone || null,
            password: hashedPassword,
            role: "Teacher",
          },
        },
      },
      include: { user: true, department: true },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "TeacherProfile", recordId: teacher.id });
    return NextResponse.json({ teacher }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create teacher");
    return handleError(err);
  }
}
