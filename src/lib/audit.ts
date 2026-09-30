import { prisma } from "./db";
import { logger } from "./logger";

export async function writeAuditLog(params: {
  userId?: string;
  action: string;
  tableAffected?: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    logger.error({ err, params }, "Failed to write audit log");
  }
}
