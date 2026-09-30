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
    const events = await prisma.event.findMany({ where, orderBy: { date: "asc" } });
    return NextResponse.json({ events });
  } catch (err) {
    logger.error({ err }, "Failed to fetch events");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    const { titleEn, titleAr, descriptionEn, descriptionAr, date, location, imageUrl } = body;

    if (!titleEn) {
      return NextResponse.json({ error: "titleEn is required" }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        titleEn, titleAr, descriptionEn, descriptionAr,
        date: date ? new Date(date) : null,
        location, imageUrl, isActive: true,
      },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Event", recordId: event.id });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create event");
    return handleError(err);
  }
}
