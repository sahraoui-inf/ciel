import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: body.status,
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        method: body.method,
        receiptUrl: body.receiptUrl,
        verifiedById: user!.id,
      },
    });

    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "Payment", recordId: id });
    return NextResponse.json({ payment });
  } catch (err) {
    logger.error({ err }, "Failed to update payment");
    return handleError(err);
  }
}
