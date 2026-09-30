import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const url = new URL(request.url);
    const classGroupId = url.searchParams.get("classGroupId");

    const where: Record<string, unknown> = {};
    if (classGroupId) where.classGroupId = classGroupId;

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (teacher) {
        const myGroupIds = (await prisma.classGroup.findMany({
          where: { teacherId: teacher.id }, select: { id: true },
        })).map(g => g.id);
        where.classGroupId = { in: myGroupIds };
      }
    }

    const exams = await prisma.exam.findMany({
      where,
      include: { _count: { select: { grades: true } }, classGroup: { select: { name: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ exams });
  } catch (err) {
    logger.error({ err }, "Failed to fetch exams");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher")) return unauthorized();

  try {
    const body = await request.json();

    if (user?.role === "Teacher") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      const group = await prisma.classGroup.findUnique({ where: { id: body.classGroupId } });
      if (!group || group.teacherId !== teacher.id) {
        return NextResponse.json({ error: "Not authorized for this class group" }, { status: 403 });
      }
    }

    const exam = await prisma.exam.create({
      data: {
        classGroupId: body.classGroupId,
        name: body.name,
        date: body.date ? new Date(body.date) : null,
        maxScore: body.maxScore || 100,
      },
    });
    return NextResponse.json({ exam }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create exam");
    return handleError(err);
  }
}
