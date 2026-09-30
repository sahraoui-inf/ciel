import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public" });

  const page = await prisma.cmsPage.findUnique({ where: { slug: "about" } });
  if (!page) notFound();

  const title = locale === "ar" && page.titleAr ? page.titleAr : page.titleEn;
  const content = locale === "ar" && page.contentAr ? page.contentAr : page.contentEn;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">{title || t("aboutUs")}</h1>
      {content ? (
        <div className="prose prose-lg max-w-none text-muted-foreground">{content}</div>
      ) : (
        <p className="text-muted-foreground">About page content coming soon.</p>
      )}
    </div>
  );
}
