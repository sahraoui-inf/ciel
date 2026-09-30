import { NextResponse } from "next/server";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { validatePrerequisiteCert } from "@/lib/certificates";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Student")) return unauthorized();

  try {
    const body = await request.json();
    const { certificateNumber, studentId, languageId } = body;

    if (!certificateNumber || !studentId || !languageId) {
      return NextResponse.json({ error: "certificateNumber, studentId, and languageId required" }, { status: 400 });
    }

    const result = await validatePrerequisiteCert(certificateNumber, studentId, languageId);
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to validate certificate");
    return handleError(err);
  }
}
