import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const { id } = await params;
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        enrollments: {
          include: {
            classGroup: { include: { course: true, teacher: { include: { user: true } } } },
            attendances: true, grades: { include: { exam: true } },
          },
        },
        certificates: { include: { level: { include: { language: true } } } },
      },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      const myGroupIds: string[] = [];
      if (teacher) {
        const ids = (await prisma.classGroup.findMany({
          where: { teacherId: teacher.id }, select: { id: true },
        })).map(g => g.id);
        myGroupIds.push(...ids);
        const sharedEnrollments = student.enrollments.filter(e => ids.includes(e.classGroupId));
        if (sharedEnrollments.length === 0) {
          return NextResponse.json({ error: "Not authorized to view this student" }, { status: 403 });
        }
      }

      const sanitized = {
        id: student.id,
        userId: student.userId,
        dateOfBirth: student.dateOfBirth,
        birthPlace: student.birthPlace,
        photo: student.photo,
        user: { id: student.user.id, name: student.user.name },
        enrollments: student.enrollments.filter(e => myGroupIds.length === 0 || myGroupIds.includes(e.classGroupId)).map(e => ({
          id: e.id,
          status: e.status,
          enrolledAt: e.enrolledAt,
          isConfirmedByTeacher: e.isConfirmedByTeacher,
          teacherNotes: e.teacherNotes,
          classGroup: {
            id: e.classGroup.id,
            name: e.classGroup.name,
            course: { name: e.classGroup.course.name },
            teacher: { user: { name: e.classGroup.teacher?.user?.name || "" } },
          },
          attendances: e.attendances.map(a => ({ id: a.id, date: a.date, status: a.status })),
          grades: e.grades.map(g => ({ id: g.id, score: g.score, exam: { id: g.exam.id, name: g.exam.name, maxScore: g.exam.maxScore } })),
        })),
      };
      return NextResponse.json({ student: sanitized });
    }

    return NextResponse.json({ student });
  } catch (err) {
    logger.error({ err }, "Failed to fetch student");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const optionalStr = (v: unknown) => (v === "" || v === undefined || v === null ? null : v);

    const profileData: Record<string, unknown> = {};
    if (body.dateOfBirth !== undefined) profileData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.birthPlace !== undefined) profileData.birthPlace = optionalStr(body.birthPlace);
    if (body.nationalId !== undefined) profileData.nationalId = optionalStr(body.nationalId);
    if (body.emergencyContact !== undefined) profileData.emergencyContact = optionalStr(body.emergencyContact);
    if (body.guardianName !== undefined) profileData.guardianName = optionalStr(body.guardianName);
    if (body.guardianPhone !== undefined) profileData.guardianPhone = optionalStr(body.guardianPhone);
    if (body.notes !== undefined) profileData.notes = optionalStr(body.notes);
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
    const student = await prisma.studentProfile.update({
      where: { id },
      data: profileData,
    });

    const profile = await prisma.studentProfile.findUnique({ where: { id } });
    if (profile) {
      const userData: Record<string, unknown> = {};
      if (body.name !== undefined) userData.name = body.name;
      if (body.email !== undefined) userData.email = body.email;
      if (body.phone !== undefined) userData.phone = body.phone;
      if (body.isActive !== undefined) userData.isActive = body.isActive;
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({ where: { id: profile.userId }, data: userData });
      }
    }

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "StudentProfile", recordId: id });
    return NextResponse.json({ student });
  } catch (err) {
    logger.error({ err }, "Failed to update student");
    return handleError(err);
  }
}
