import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { hash } from "bcryptjs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const staff = await prisma.user.findFirst({
      where: { id, role: "Admin" },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, updatedAt: true,
        adminDepartments: {
          select: { department: { select: { id: true, name: true, nameAr: true } } },
        },
      },
    });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    return NextResponse.json({
      staff: { ...staff, departments: staff.adminDepartments.map(ad => ad.department) },
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch staff");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.user.findFirst({ where: { id, role: "Admin" } });
    if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) {
      const dup = await prisma.user.findFirst({ where: { email: body.email, id: { not: id } } });
      if (dup) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      data.email = body.email;
    }
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.password) data.password = await hash(body.password, 12);

    await prisma.user.update({ where: { id }, data });

    if (body.departmentIds !== undefined) {
      await prisma.adminDepartment.deleteMany({ where: { userId: id } });
      if (body.departmentIds.length > 0) {
        await prisma.adminDepartment.createMany({
          data: body.departmentIds.map((deptId: string) => ({ userId: id, departmentId: deptId })),
        });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, updatedAt: true,
        adminDepartments: {
          select: { department: { select: { id: true, name: true, nameAr: true } } },
        },
      },
    });

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "User", recordId: id });
    return NextResponse.json({
      staff: { ...updated, departments: updated!.adminDepartments.map(ad => ad.department) },
    });
  } catch (err) {
    logger.error({ err }, "Failed to update staff");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.user.findFirst({ where: { id, role: "Admin" } });
    if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    if (id === user!.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

    await prisma.adminDepartment.deleteMany({ where: { userId: id } });
    await prisma.user.update({ where: { id }, data: { isActive: false, role: "Student" } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "User", recordId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete staff");
    return handleError(err);
  }
}
