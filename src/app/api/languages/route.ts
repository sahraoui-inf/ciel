import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const languages = await prisma.language.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ languages });
  } catch (err) {
    logger.error({ err }, "Failed to fetch languages");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    const language = await prisma.language.create({
      data: { name: body.name, code: body.code },
    });
    return NextResponse.json({ language }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create language");
    return handleError(err);
  }
}
