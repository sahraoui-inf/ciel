import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    logger.error({ err }, "Failed to fetch notifications");
    return handleError(err);
  }
}

export async function PUT(request: Request) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    await prisma.notification.updateMany({
      where: { userId: user.id, id: { in: body.ids || [] } },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to mark notifications as read");
    return handleError(err);
  }
}
