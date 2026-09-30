import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { rateLimit } from "./rate-limit";
import { prisma } from "./db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export type ApiUser = {
  id: string; email: string; name: string; role: string; locale: string; theme: string;
};

export async function getApiUser(request: Request): Promise<ApiUser | null> {
  try {
    const cookie = request.headers.get("cookie") || "";
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;
    const { payload } = await jwtVerify(match[1], secret);
    return payload as unknown as ApiUser;
  } catch {
    return null;
  }
}

export function requireRole(user: ApiUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  if (user.role === "SuperAdmin") return true;
  return roles.includes(user.role);
}

/** Returns department IDs the Admin user is allowed to manage. Returns null for SuperAdmin (no filter). */
export async function getAdminDeptIds(user: ApiUser | null): Promise<string[] | null> {
  if (!user) return null;
  if (user.role === "SuperAdmin") return null; // null = no filter, see all
  if (user.role !== "Admin") return null; // non-admin: no department filter
  const rows = await prisma.adminDepartment.findMany({
    where: { userId: user.id },
    select: { departmentId: true },
  });
  return rows.map(r => r.departmentId);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function handleError(err: unknown, message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function rateLimitedResponse() {
  return NextResponse.json({ error: "Too many requests" }, {
    status: 429,
    headers: { "Retry-After": "60" },
  });
}

export function checkRateLimit(request: Request, maxRequests = 100, windowMs = 60_000) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const route = new URL(request.url).pathname;
  return rateLimit(`${ip}:${route}`, maxRequests, windowMs);
}
