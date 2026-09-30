import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "Student")) return unauthorized();

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user!.id },
    });

    if (!profile) return NextResponse.json({ enrollments: [] });

    // Auto-expire stale pending enrollments for this student
    await prisma.enrollment.updateMany({
      where: { studentId: profile.id, status: "Pending", expiresAt: { lt: new Date() } },
      data: { status: "Expired" },
    });

    const profileWithEnrollments = await prisma.studentProfile.findUnique({
      where: { userId: user!.id },
      include: {
        enrollments: {
          include: {
            classGroup: {
              include: {
                course: { include: { language: true } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
      },
    });

    const enrollments = (profileWithEnrollments?.enrollments || []).map(e => ({
      id: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt,
      expiresAt: e.expiresAt,
      paymentProofUrl: e.paymentProofUrl,
      classGroup: {
        name: e.classGroup.name,
        course: { name: e.classGroup.course.name },
      },
    }));

    return NextResponse.json({ enrollments });
  } catch (err) {
    logger.error({ err }, "Failed to fetch enrollments");
    return handleError(err);
  }
}
