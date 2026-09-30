import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, getAdminDeptIds } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    // Auto-expire stale pending enrollments
    await prisma.enrollment.updateMany({
      where: { status: "Pending", expiresAt: { lt: new Date() } },
      data: { status: "Expired" },
    });

    const deptIds = await getAdminDeptIds(user);
    const where: Record<string, unknown> = { status: "Pending" };

    if (deptIds !== null) {
      if (deptIds.length === 0) return NextResponse.json({ enrollments: [] });
      where.classGroup = { course: { departmentId: { in: deptIds } } };
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: { include: { user: { select: { id: true, name: true, email: true } } } },
        classGroup: {
          include: {
            course: { include: { language: true, level: true } },
            teacher: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json({ enrollments });
  } catch (err) {
    logger.error({ err }, "Failed to fetch pending enrollments");
    return handleError(err);
  }
}
