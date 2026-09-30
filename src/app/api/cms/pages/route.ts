import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const where: Record<string, unknown> = {};
    if (slug) where.slug = slug;
    const pages = await prisma.cmsPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ pages });
  } catch (err) {
    logger.error({ err }, "Failed to fetch CMS pages");
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const body = await request.json();
    const { slug, titleEn, titleAr, contentEn, contentAr, seoTitle, seoDescription, seoKeywords } = body;

    if (!slug || !titleEn) {
      return NextResponse.json({ error: "slug and titleEn are required" }, { status: 400 });
    }

    const page = await prisma.cmsPage.create({
      data: {
        slug, titleEn, titleAr, contentEn, contentAr,
        seoTitle, seoDescription, seoKeywords,
        isPublished: false,
      },
    });

    await writeAuditLog({ userId: user!.id, action: "CREATE", tableAffected: "CmsPage", recordId: page.id });

    return NextResponse.json({ page }, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    logger.error({ err }, "Failed to create CMS page");
    return handleError(err);
  }
}
