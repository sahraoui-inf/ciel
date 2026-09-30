import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ media });
  } catch (err) {
    logger.error({ err }, "Failed to fetch media");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    const { url, type, alt } = body;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const media = await prisma.media.create({
      data: { url, type: type ?? "Image", alt, uploadedById: user!.id },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Media", recordId: media.id });
    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create media");
    return handleError(err);
  }
}
