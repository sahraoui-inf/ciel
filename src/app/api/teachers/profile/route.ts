import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { hash } from "bcryptjs";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "Teacher")) return unauthorized();

  try {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: user!.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, locale: true, theme: true } },
        department: true,
        classGroups: {
          include: {
            course: { include: { language: true, level: true } },
            timeSlots: { include: { timeSlot: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (err) {
    logger.error({ err }, "Failed to fetch teacher profile");
    return handleError(err);
  }
}

export async function PUT(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "Teacher")) return unauthorized();

  try {
    const body = await request.json();
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: user!.id } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const profileData: Record<string, unknown> = {};
    if (body.specialization !== undefined) profileData.specialization = body.specialization;
    if (body.hourlyRate !== undefined) profileData.hourlyRate = parseFloat(body.hourlyRate) || 0;
    if (body.hireDate !== undefined) profileData.hireDate = body.hireDate ? new Date(body.hireDate) : null;
    if (body.photo !== undefined) profileData.photo = body.photo;

    if (Object.keys(profileData).length > 0) {
      await prisma.teacherProfile.update({ where: { userId: user!.id }, data: profileData });
    }

    const userData: Record<string, unknown> = {};
    if (body.name !== undefined) userData.name = body.name;
    if (body.email !== undefined) userData.email = body.email;
    if (body.phone !== undefined) userData.phone = body.phone;
    if (body.password !== undefined && body.password.length >= 6) {
      userData.password = await hash(body.password, 12);
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: user!.id }, data: userData });
    }

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "TeacherProfile", recordId: profile.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to update teacher profile");
    return handleError(err);
  }
}
