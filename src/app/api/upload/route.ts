import { NextResponse } from "next/server";
import { getApiUser, requireRole, unauthorized, handleError, checkRateLimit, rateLimitedResponse } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  const rl = checkRateLimit(request, 20, 60_000);
  if (!rl.allowed) return rateLimitedResponse();
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin", "Admin", "Teacher", "Student")) return unauthorized();

  try {
    const fd = await request.formData();
    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(dir, filename), buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    logger.error({ err }, "Upload failed");
    return handleError(err, "Upload failed");
  }
}
