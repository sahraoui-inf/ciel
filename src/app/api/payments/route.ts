import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Student")) return unauthorized();

  try {
    const where: Record<string, unknown> = {};
    if (user?.role === "Student") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      if (profile) {
        where.enrollment = { studentId: profile.id };
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: { include: { user: { select: { name: true } } } },
            classGroup: { include: { course: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ payments });
  } catch (err) {
    logger.error({ err }, "Failed to fetch payments");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const body = await request.json();
    const payment = await prisma.payment.create({
      data: {
        enrollmentId: body.enrollmentId,
        amount: body.amount,
        dueDate: new Date(body.dueDate),
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        status: body.status || "Pending",
        method: body.method || "Cash",
        receiptUrl: body.receiptUrl,
        verifiedById: user!.id,
      },
    });

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: body.enrollmentId },
      include: { student: true },
    });
    if (enrollment) {
      await dispatchNotification({
        userId: enrollment.student.userId,
        type: "payment_recorded",
        title: "Payment Recorded",
        messageEn: `Payment of DA${body.amount} has been recorded`,
      });
    }

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Payment", recordId: payment.id });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create payment");
    return handleError(err);
  }
}
