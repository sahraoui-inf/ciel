import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, requireRole, unauthorized, handleError } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  try {
    const { slug } = await params;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (err) {
    logger.error({ err }, "Failed to fetch CMS page");
    return handleError(err);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { slug } = await params;
    const body = await request.json();
    const { titleEn, titleAr, contentEn, contentAr, seoTitle, seoDescription, seoKeywords, isPublished } = body;

    const existing = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (titleEn !== undefined) data.titleEn = titleEn;
    if (titleAr !== undefined) data.titleAr = titleAr;
    if (contentEn !== undefined) data.contentEn = contentEn;
    if (contentAr !== undefined) data.contentAr = contentAr;
    if (seoTitle !== undefined) data.seoTitle = seoTitle;
    if (seoDescription !== undefined) data.seoDescription = seoDescription;
    if (seoKeywords !== undefined) data.seoKeywords = seoKeywords;
    if (isPublished !== undefined) {
      data.isPublished = isPublished;
      if (isPublished && !existing.publishedAt) data.publishedAt = new Date();
    }

    const page = await prisma.cmsPage.update({ where: { slug }, data });
    await writeAuditLog({ userId: user!.id, action: "UPDATE", tableAffected: "CmsPage", recordId: page.id });

    return NextResponse.json({ page });
  } catch (err) {
    logger.error({ err }, "Failed to update CMS page");
    return handleError(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getApiUser(request);
  if (!requireRole(user, "SuperAdmin")) return unauthorized();

  try {
    const { slug } = await params;
    const existing = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    await prisma.cmsPage.delete({ where: { slug } });
    await writeAuditLog({ userId: user!.id, action: "DELETE", tableAffected: "CmsPage", recordId: slug });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete CMS page");
    return handleError(err);
  }
}
