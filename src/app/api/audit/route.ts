import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: "desc" },
      take: 200,
    });
    return NextResponse.json({ logs });
  } catch (err) {
    logger.error({ err }, "Failed to fetch audit logs");
    return handleError(err);
  }
}
