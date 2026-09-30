import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { hash } from "bcryptjs";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "Student")) return unauthorized();

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user!.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, locale: true, theme: true } },
        enrollments: {
          include: {
            classGroup: {
              include: {
                course: { include: { language: true, level: true } },
                teacher: { include: { user: { select: { name: true } } } },
                timeSlots: { include: { timeSlot: true } },
              },
            },
            attendances: true,
            grades: { include: { exam: true } },
          },
          orderBy: { enrolledAt: "desc" },
        },
        certificates: {
          include: { level: { include: { language: true } } },
          orderBy: { issueDate: "desc" },
        },
      },
    });

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (err) {
    logger.error({ err }, "Failed to fetch profile");
    return handleError(err);
  }
}

export async function PUT(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "Student")) return unauthorized();

  try {
    const body = await request.json();
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user!.id } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const optionalStr = (v: unknown) => (v === "" || v === undefined || v === null ? null : v);

    const profileData: Record<string, unknown> = {};
    if (body.dateOfBirth !== undefined) profileData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.birthPlace !== undefined) profileData.birthPlace = optionalStr(body.birthPlace);
    if (body.nationalId !== undefined) profileData.nationalId = optionalStr(body.nationalId);
    if (body.emergencyContact !== undefined) profileData.emergencyContact = optionalStr(body.emergencyContact);
    if (body.guardianName !== undefined) profileData.guardianName = optionalStr(body.guardianName);
    if (body.guardianPhone !== undefined) profileData.guardianPhone = optionalStr(body.guardianPhone);
    if (body.photo !== undefined) profileData.photo = optionalStr(body.photo);
    if (body.phone2 !== undefined) profileData.phone2 = optionalStr(body.phone2);
    if (body.bloodType !== undefined) profileData.bloodType = optionalStr(body.bloodType);
    if (body.fatherName !== undefined) profileData.fatherName = optionalStr(body.fatherName);
    if (body.fatherPhone !== undefined) profileData.fatherPhone = optionalStr(body.fatherPhone);
    if (body.status !== undefined) profileData.status = optionalStr(body.status);
    if (body.faculty !== undefined) profileData.faculty = optionalStr(body.faculty);
    if (body.university !== undefined) profileData.university = optionalStr(body.university);
    if (body.doctorType !== undefined) profileData.doctorType = optionalStr(body.doctorType);
    if (body.sector !== undefined) profileData.sector = optionalStr(body.sector);
    if (body.establishment !== undefined) profileData.establishment = optionalStr(body.establishment);

    if (Object.keys(profileData).length > 0) {
      await prisma.studentProfile.update({ where: { userId: user!.id }, data: profileData });
    }

    const userData: Record<string, unknown> = {};
    if (body.name !== undefined) userData.name = body.name;
    if (body.email !== undefined) userData.email = body.email;
    if (body.phone !== undefined) userData.phone = optionalStr(body.phone);
    if (body.password !== undefined && body.password.length >= 6) {
      userData.password = await hash(body.password, 12);
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: user!.id }, data: userData });
    }

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "StudentProfile", recordId: profile.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to update profile");
    return handleError(err);
  }
}
