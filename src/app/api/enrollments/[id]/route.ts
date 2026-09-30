import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, getAdminDeptIds } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, isConfirmedByTeacher, teacherNotes } = body;

    const existing = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: { include: { user: true } },
        classGroup: { include: { course: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (!teacher || existing.classGroup.teacherId !== teacher.id) return NextResponse.json({ error: "Not your class group" }, { status: 403 });
    }

    if (user?.role === "Admin") {
      const deptIds = await getAdminDeptIds(user);
      if (deptIds === null || !deptIds.includes(existing.classGroup.course.departmentId!)) {
        return NextResponse.json({ error: "Not your department" }, { status: 403 });
      }
    }

    // If approving (status → Active), check 48h expiry
    if (status === "Active" && existing.expiresAt && new Date() > existing.expiresAt) {
      // Auto-expire instead
      await prisma.enrollment.update({ where: { id }, data: { status: "Expired" } });
      await dispatchNotification({
        userId: existing.student.user.id,
        type: "enrollment_status",
        title: "Enrollment Expired",
        messageEn: `Your enrollment request for ${existing.classGroup.name} has expired (48h window passed). Please submit a new request.`,
        data: { enrollmentId: id, status: "Expired" },
      });
      await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Enrollment", recordId: id, newValue: JSON.stringify({ status: "Expired" }) });
      return NextResponse.json({ error: "This enrollment request has expired (48-hour window passed). It has been marked as Expired." }, { status: 410 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (isConfirmedByTeacher !== undefined) data.isConfirmedByTeacher = isConfirmedByTeacher;
    if (teacherNotes !== undefined) data.teacherNotes = teacherNotes;

    const enrollment = await prisma.enrollment.update({ where: { id }, data });

    await dispatchNotification({
      userId: existing.student.user.id,
      type: "enrollment_status",
      title: "Enrollment Updated",
      messageEn: `Your enrollment in ${existing.classGroup.name} is now ${enrollment.status}`,
      data: { enrollmentId: id, status: enrollment.status },
    });

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Enrollment", recordId: id });

    return NextResponse.json({ enrollment });
  } catch (err) {
    logger.error({ err }, "Failed to update enrollment");
    return handleError(err);
  }
}
