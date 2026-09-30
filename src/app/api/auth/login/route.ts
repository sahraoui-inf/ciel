import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { checkRateLimit, rateLimitedResponse } from "@/lib/api-helpers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export async function POST(request: Request) {
  const rl = checkRateLimit(request, 10, 60_000);
  if (!rl.allowed) return rateLimitedResponse();
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(password, user.password))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

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
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
