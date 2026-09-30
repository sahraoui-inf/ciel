import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { hash } from "bcryptjs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const { id } = await params;
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
        classGroups: { include: { course: { include: { language: true, level: true } }, timeSlots: { include: { timeSlot: true } } } },
        payouts: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    return NextResponse.json({ teacher });
  } catch (err) {
    logger.error({ err }, "Failed to fetch teacher");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.teacherProfile.findUnique({ where: { id }, include: { user: true } });
    if (!existing) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const profileData: Record<string, unknown> = {};
    if (body.specialization !== undefined) profileData.specialization = body.specialization;
    if (body.hourlyRate !== undefined) profileData.hourlyRate = body.hourlyRate;
    if (body.isActive !== undefined) profileData.isActive = body.isActive;
    if (body.hireDate !== undefined) profileData.hireDate = body.hireDate ? new Date(body.hireDate) : null;
    if (body.departmentId !== undefined) profileData.departmentId = body.departmentId || null;
    if (body.photo !== undefined) profileData.photo = body.photo;

    const teacher = await prisma.teacherProfile.update({
      where: { id },
      data: profileData,
      include: { user: true, department: true },
    });

    const userData: Record<string, unknown> = {};
    if (body.name !== undefined) userData.name = body.name;
    if (body.email !== undefined) userData.email = body.email;
    if (body.phone !== undefined) userData.phone = body.phone;
    if (body.password !== undefined && body.password.length >= 6) {
      userData.password = await hash(body.password, 12);
    }
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: existing.user.id }, data: userData });
    }

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "TeacherProfile", recordId: id });
    return NextResponse.json({ teacher });
  } catch (err) {
    logger.error({ err }, "Failed to update teacher");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    await prisma.teacherProfile.delete({ where: { id } });
    await prisma.user.update({ where: { id: existing.userId }, data: { role: "Student", isActive: false } });

    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "TeacherProfile", recordId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete teacher");
    return handleError(err);
  }
}
