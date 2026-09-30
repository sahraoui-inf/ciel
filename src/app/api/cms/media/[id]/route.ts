import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { id } = await params;
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Media not found" }, { status: 404 });

    await prisma.media.delete({ where: { id } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "Media", recordId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete media");
    return handleError(err);
  }
}
