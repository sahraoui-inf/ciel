import { addYears } from "date-fns";
import { prisma } from "./db";
import { CERT_VALIDITY_YEARS } from "./constants";

export function calculateExpiration(issueDate: Date = new Date()): Date {
  return addYears(issueDate, CERT_VALIDITY_YEARS);
}

export async function validatePrerequisiteCert(
  certNumber: string,
  studentId: string,
  languageId: string
): Promise<{ valid: boolean; error?: string }> {
  const cert = await prisma.certificate.findUnique({
    where: { certificateNumber: certNumber },
    include: { level: true },
  });

  if (!cert) return { valid: false, error: "Certificate not found" };
  if (cert.studentId !== studentId) return { valid: false, error: "Certificate does not belong to this student" };
  if (cert.level.languageId !== languageId) return { valid: false, error: "Certificate is for a different language" };
  if (cert.status !== "Valid") return { valid: false, error: "Certificate is not valid" };
  if (new Date() > cert.expirationDate) return { valid: false, error: "Certificate has expired" };

  const alreadyUsed = await prisma.enrollment.findFirst({
    where: { prerequisiteCertId: cert.id, status: { not: "Dropped" } },
  });
  if (alreadyUsed) return { valid: false, error: "Certificate already used for another enrollment" };

  return { valid: true };
}
