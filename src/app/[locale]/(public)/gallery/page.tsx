import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public" });
  const ct = await getTranslations({ locale, namespace: "cms" });

  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
  });

  const images = media.filter((m) => m.type === "Image");

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-10">{t("photoGallery")}</h1>
      {images.length === 0 ? (
        <p className="text-muted-foreground">{ct("noMedia")}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              className="block aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
              <img src={item.url} alt={item.alt || ""} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
