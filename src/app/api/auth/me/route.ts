import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return NextResponse.json({ user: null });

    const { payload } = await jwtVerify(match[1], secret);
    return NextResponse.json({ user: payload });
  } catch {
    return NextResponse.json({ user: null });
  }
}
