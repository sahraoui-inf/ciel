import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, secret);
    const user = payload as { id: string; email: string; name: string; role: string; locale: string; theme: string };

    const { theme } = await request.json();
    if (theme !== "light" && theme !== "dark") {
      return NextResponse.json({ error: "Invalid theme value" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { theme },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
