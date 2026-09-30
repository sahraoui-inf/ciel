import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { calculateExpiration, validatePrerequisiteCert } from "@/lib/certificates";
import { generateCertNumber } from "@/lib/utils";
import { dispatchNotification } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Student")) return unauthorized();

  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId");
    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (user?.role === "Student") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      if (profile) where.studentId = profile.id;
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: { level: { include: { language: true } }, student: { include: { user: { select: { name: true } } } } },
      orderBy: { issueDate: "desc" },
    });
    return NextResponse.json({ certificates });
  } catch (err) {
    logger.error({ err }, "Failed to fetch certificates");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin")) return unauthorized();

  try {
    const body = await request.json();
    const { studentId, levelId } = body;

    const certNumber = generateCertNumber();
    const now = new Date();
    const cert = await prisma.certificate.create({
      data: {
        studentId,
        levelId,
        certificateNumber: certNumber,
        issueDate: now,
        expirationDate: calculateExpiration(now),
        issuedBy: user!.id,
      },
    });

    await dispatchNotification({
      userId: (await prisma.studentProfile.findUnique({ where: { id: studentId } }))!.userId,
      type: "certificate_issued",
      title: "Certificate Issued",
      messageEn: `Your certificate ${certNumber} has been issued`,
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "Certificate", recordId: cert.id });
    return NextResponse.json({ cert }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Failed to create certificate");
    return handleError(err);
  }
}
