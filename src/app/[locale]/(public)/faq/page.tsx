import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public" });
  const ct = await getTranslations({ locale, namespace: "cms" });

  const faqs = await prisma.faq.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-10">{t("faq")}</h1>
      {faqs.length === 0 ? (
        <p className="text-muted-foreground">{ct("noFaqs")}</p>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq) => {
            const question = locale === "ar" && faq.questionAr ? faq.questionAr : faq.questionEn;
            const answer = locale === "ar" && faq.answerAr ? faq.answerAr : faq.answerEn;
            return (
              <details key={faq.id} className="bg-card border border-border rounded-lg p-4">
                <summary className="cursor-pointer font-medium">{question}</summary>
                <p className="mt-3 text-muted-foreground">{answer}</p>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
