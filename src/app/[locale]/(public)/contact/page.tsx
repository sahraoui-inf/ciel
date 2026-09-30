import { getTranslations } from "next-intl/server";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public" });

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">{t("contactUs")}</h1>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("yourName")}</label>
              <input type="text" required className="w-full px-3 py-2 rounded-md border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("yourEmail")}</label>
              <input type="email" required className="w-full px-3 py-2 rounded-md border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("yourMessage")}</label>
              <textarea required rows={5} className="w-full px-3 py-2 rounded-md border border-border bg-background" />
            </div>
            <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:opacity-90">
              {t("sendMessage")}
            </button>
          </form>
        </div>

        <div className="space-y-4 text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Email</h3>
            <p>contact@linguacenter.com</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">{t("contactInfo")}</h3>
            <p>123 Language Street, Education City</p>
          </div>
        </div>
      </div>
    </div>
  );
}
