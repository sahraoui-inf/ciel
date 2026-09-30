import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get("publishedOnly") !== "false";
    const where: Record<string, unknown> = {};
    if (publishedOnly) where.isActive = true;
    const testimonials = await prisma.testimonial.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ testimonials });
  } catch (err) {
    logger.error({ err }, "Failed to fetch testimonials");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    const { studentName, contentEn, contentAr, rating } = body;

    if (!studentName || !contentEn) {
      return NextResponse.json({ error: "studentName and contentEn are required" }, { status: 400 });
    }

    const testimonial = await prisma.testimonial.create({
      data: { studentName, contentEn, contentAr, rating: rating ?? 5, isActive: true },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Testimonial", recordId: testimonial.id });
    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create testimonial");
    return handleError(err);
  }
}
