import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public" });
  const ct = await getTranslations({ locale, namespace: "cms" });

  const events = await prisma.event.findMany({
    where: { isActive: true },
    orderBy: { date: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-10">{t("ourEvents")}</h1>
      {events.length === 0 ? (
        <p className="text-muted-foreground">{ct("noEvents")}</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const title = locale === "ar" && event.titleAr ? event.titleAr : event.titleEn;
            const desc = locale === "ar" && event.descriptionAr ? event.descriptionAr : event.descriptionEn;
            return (
              <div key={event.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {event.imageUrl && (
                  <img src={event.imageUrl} alt={title} className="w-full h-48 object-cover" />
                )}
                <div className="p-5">
                  <h2 className="font-semibold text-lg mb-2">{title}</h2>
                  {event.date && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {new Date(event.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  )}
                  {event.location && <p className="text-sm text-muted-foreground mb-2">{event.location}</p>}
                  {desc && <p className="text-muted-foreground">{desc.substring(0, 200)}{desc.length > 200 ? "..." : ""}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
