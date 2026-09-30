import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, checkRateLimit, rateLimitedResponse } from "@/lib/api-helpers";
import { validatePrerequisiteCert } from "@/lib/certificates";
import { dispatchNotification } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { checkProfileComplete } from "@/lib/profile";

export async function POST(request: Request) {
  const rl = checkRateLimit(request, 10, 60_000);
  if (!rl.allowed) return rateLimitedResponse();
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Student")) return unauthorized();

  try {
    const body = await request.json();
    let { studentId, classGroupId, prerequisiteCertNumber, departmentId } = body;

    if (!studentId && user?.role === "Student") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: user!.id } });
      if (!profile) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      studentId = profile.id;

      const profileCheck = checkProfileComplete({
        dateOfBirth: profile.dateOfBirth?.toISOString() || null,
        status: profile.status,
        faculty: profile.faculty,
        university: profile.university,
        doctorType: profile.doctorType,
        sector: profile.sector,
        establishment: profile.establishment,
      });
      if (!profileCheck.complete) {
        return NextResponse.json({
          error: "Your profile is incomplete. Please complete your profile before enrolling.",
          missingFields: profileCheck.missingFields,
        }, { status: 403 });
      }
    }

    if (!classGroupId) return NextResponse.json({ error: "classGroupId is required" }, { status: 400 });
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    const classGroup = await prisma.classGroup.findUnique({
      where: { id: classGroupId },
      include: { course: true, enrollments: true },
    });
    if (!classGroup) return NextResponse.json({ error: "Class group not found" }, { status: 404 });

    if (!classGroup.isActive) return NextResponse.json({ error: "Class group is not active" }, { status: 400 });

    // Validate course belongs to selected department
    if (departmentId && classGroup.course.departmentId && classGroup.course.departmentId !== departmentId) {
      return NextResponse.json({ error: "Course does not belong to the selected department" }, { status: 400 });
    }

    // Single-pending-enrollment rule: student can have only one Pending at a time
    const existingPending = await prisma.enrollment.findFirst({
      where: { studentId, status: "Pending" },
    });
    if (existingPending) {
      return NextResponse.json({ error: "You already have a pending enrollment request. Wait for it to be processed or expire before submitting a new one." }, { status: 409 });
    }

    const activeCount = classGroup.enrollments.filter(e => e.status !== "Dropped" && e.status !== "Expired").length;
    if (activeCount >= classGroup.maxCapacity) {
      return NextResponse.json({ error: "Class group is full" }, { status: 400 });
    }

    const alreadyEnrolled = classGroup.enrollments.find(e => e.studentId === studentId && e.status !== "Dropped" && e.status !== "Expired");
    if (alreadyEnrolled) {
      return NextResponse.json({ error: "You are already enrolled in this class group" }, { status: 409 });
    }

    if (classGroup.course.registrationOpen === false) {
      return NextResponse.json({ error: "Registration is closed for this course" }, { status: 400 });
    }
    if (classGroup.course.registrationStart && new Date() < classGroup.course.registrationStart) {
      return NextResponse.json({ error: "Registration period has not started" }, { status: 400 });
    }
    if (classGroup.course.registrationEnd && new Date() > classGroup.course.registrationEnd) {
      return NextResponse.json({ error: "Registration period has ended" }, { status: 400 });
    }

    let prerequisiteCertId: string | undefined;
    if (prerequisiteCertNumber) {
      const langId = classGroup.course.languageId || (await prisma.level.findUnique({ where: { id: classGroup.course.levelId } }))?.languageId;
      const validation = await validatePrerequisiteCert(
        prerequisiteCertNumber, studentId, langId || ""
      );
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      const cert = await prisma.certificate.findUnique({ where: { certificateNumber: prerequisiteCertNumber } });
      prerequisiteCertId = cert!.id;
    }

    // Set 48-hour expiry
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classGroupId,
        prerequisiteCertId,
        paymentProofUrl: body.paymentProofUrl || null,
        status: "Pending",
        expiresAt,
      },
    });

    // Notify department admins
    if (classGroup.course.departmentId) {
      const deptAdmins = await prisma.adminDepartment.findMany({
        where: { departmentId: classGroup.course.departmentId },
        include: { user: { select: { id: true } } },
      });
      for (const admin of deptAdmins) {
        await dispatchNotification({
          userId: admin.user.id,
          type: "new_enrollment",
          title: "New Enrollment Request",
          messageEn: `A new student enrollment request requires your approval in ${classGroup.name} — expires in 48h`,
          data: { enrollmentId: enrollment.id, classGroupId },
        });
      }
    }

    // Also notify the teacher
    await dispatchNotification({
      userId: classGroup.teacherId,
      type: "new_enrollment",
      title: "New Enrollment",
      messageEn: `A new student has enrolled in ${classGroup.name}`,
      data: { enrollmentId: enrollment.id, classGroupId },
    });

    await writeAuditLog({
      userId: user!.id, action: "CREATE", tableAffected: "Enrollment", recordId: enrollment.id,
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to enroll student");
    return handleError(err, "Failed to enroll student");
  }
}
