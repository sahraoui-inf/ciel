import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { SignJWT } from "jose";
import { checkRateLimit, rateLimitedResponse } from "@/lib/api-helpers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export async function POST(request: Request) {
  const rl = checkRateLimit(request, 5, 60_000);
  if (!rl.allowed) return rateLimitedResponse();
  try {
    const { name, email, phone, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, phone, password: hashed, role: "Student" },
    });

    await prisma.studentProfile.create({
      data: { userId: user.id },
    });

    const token = await new SignJWT({
      id: user.id, email: user.email, name: user.name,
      role: user.role, locale: user.locale, theme: user.theme,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.cookies.set("session", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
