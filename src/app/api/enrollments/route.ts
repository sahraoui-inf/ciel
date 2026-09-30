import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, unauthorized, handleError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  try {
    const url = new URL(request.url);
    const classGroupId = url.searchParams.get("classGroupId");

    const where: Record<string, unknown> = {};
    if (classGroupId) where.classGroupId = classGroupId;

    // Teachers can only see enrollments in their own groups
    if (user.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (!teacher) return NextResponse.json({ enrollments: [] });
      const myGroupIds = (await prisma.classGroup.findMany({
        where: { teacherId: teacher.id },
        select: { id: true },
      })).map(g => g.id);
      if (classGroupId && !myGroupIds.includes(classGroupId)) {
        return NextResponse.json({ enrollments: [] });
      }
      if (!classGroupId) where.classGroupId = { in: myGroupIds };
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        classGroup: { select: { name: true } },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json({ enrollments });
  } catch (err) {
    logger.error({ err }, "Failed to fetch enrollments");
    return handleError(err);
  }
}
