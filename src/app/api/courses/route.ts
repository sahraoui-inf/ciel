import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError, getAdminDeptIds } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher", "Student")) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const languageId = searchParams.get("languageId");
    const departmentId = searchParams.get("departmentId");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (languageId) where.languageId = languageId;
    if (isActive !== null) where.isActive = isActive === "true";

    const deptIds = await getAdminDeptIds(user);
    if (deptIds !== null) {
      if (deptIds.length === 0) return NextResponse.json({ courses: [] });
      where.departmentId = { in: deptIds };
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    const courses = await prisma.course.findMany({
      where,
      include: { language: true, level: true, department: true, classGroups: { where: { isActive: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ courses });
  } catch (err) {
    logger.error({ err }, "Failed to fetch courses");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const body = await request.json();
    let languageId = body.languageId;
    if (!languageId && body.levelId) {
      const level = await prisma.level.findUnique({ where: { id: body.levelId } });
      if (level) languageId = level.languageId;
    }
    const course = await prisma.course.create({
      data: {
        languageId,
        levelId: body.levelId,
        departmentId: body.departmentId || null,
        name: body.name,
        code: body.code,
        description: body.description,
        maxStudents: body.maxStudents || 0,
        registrationOpen: body.registrationOpen || false,
        registrationStart: body.registrationStart ? new Date(body.registrationStart) : null,
        registrationEnd: body.registrationEnd ? new Date(body.registrationEnd) : null,
      },
    });

    await writeAuditLog({
      userId: user!.id, action: "CREATE", tableAffected: "Course", recordId: course.id,
      newValue: JSON.stringify(body),
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create course");
    return handleError(err, "Failed to create course");
  }
}
