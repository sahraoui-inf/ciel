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
    const faqs = await prisma.faq.findMany({ where, orderBy: { order: "asc" } });
    return NextResponse.json({ faqs });
  } catch (err) {
    logger.error({ err }, "Failed to fetch FAQs");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    const { questionEn, questionAr, answerEn, answerAr, order } = body;

    if (!questionEn || !answerEn) {
      return NextResponse.json({ error: "questionEn and answerEn are required" }, { status: 400 });
    }

    const faq = await prisma.faq.create({
      data: { questionEn, questionAr, answerEn, answerAr, order: order ?? 0, isActive: true },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Faq", recordId: faq.id });
    return NextResponse.json({ faq }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create FAQ");
    return handleError(err);
  }
}
