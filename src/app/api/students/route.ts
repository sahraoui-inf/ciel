import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, getAdminDeptIds } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const classGroupId = searchParams.get("classGroupId");
    const name = searchParams.get("name")?.trim();

    const deptIds = await getAdminDeptIds(user);
    const where: Record<string, unknown> = {};

    if (name) {
      where.user = {
        OR: [{ name: { contains: name } }, { email: { contains: name } }],
      };
    }

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (!teacher) return NextResponse.json({ students: [] });

      const myGroupIds = (await prisma.classGroup.findMany({
        where: { teacherId: teacher.id },
        select: { id: true },
      })).map(g => g.id);

      const students = await prisma.studentProfile.findMany({
        where: {
          ...where,
          enrollments: { some: { classGroupId: { in: myGroupIds } } },
        },
        select: {
          id: true,
          userId: true,
          dateOfBirth: true,
          birthPlace: true,
          photo: true,
          user: { select: { id: true, name: true } },
          enrollments: {
            select: {
              id: true,
              status: true,
              classGroup: { select: { id: true, name: true, course: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ students });
    }

    if (deptIds !== null) {
      if (deptIds.length === 0) return NextResponse.json({ students: [] });
      if (classGroupId) {
        where.enrollments = { some: { classGroupId } };
      } else {
        where.enrollments = { some: { classGroup: { course: { departmentId: { in: deptIds } } } } };
      }
    } else if (classGroupId) {
      where.enrollments = { some: { classGroupId } };
    }

    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        enrollments: { include: { classGroup: { include: { course: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ students });
  } catch (err) {
    logger.error({ err }, "Failed to fetch students");
    return handleError(err);
  }
}
