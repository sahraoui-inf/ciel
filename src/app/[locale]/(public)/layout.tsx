import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  const pt = await getTranslations({ locale, namespace: "public" });

  const setting = await prisma.systemSetting.findUnique({ where: { key: "site_name" } });
  const siteName = setting?.value || "LinguaCenter";

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-bold text-primary">{siteName}</Link>

          <nav className="hidden md:flex gap-6 items-center">
            <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">{t("home")}</Link>
            <Link href={`/${locale}/about`} className="text-sm text-muted-foreground hover:text-foreground">{t("about")}</Link>
            <Link href={`/${locale}/events`} className="text-sm text-muted-foreground hover:text-foreground">{t("events")}</Link>
            <Link href={`/${locale}/gallery`} className="text-sm text-muted-foreground hover:text-foreground">{t("gallery")}</Link>
            <Link href={`/${locale}/faq`} className="text-sm text-muted-foreground hover:text-foreground">{t("faq")}</Link>
            <Link href={`/${locale}/contact`} className="text-sm text-muted-foreground hover:text-foreground">{t("contact")}</Link>
          </nav>

          <div className="flex gap-1 items-center">
            <ThemeToggle />
            <Link href={`/${locale}/login`} className="text-sm font-medium text-primary hover:underline">{t("login")}</Link>
            <Link href={`/${locale}/register`} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90">{t("register")}</Link>
          </div>

          <details className="md:hidden relative">
            <summary className="list-none cursor-pointer p-2 rounded-md hover:bg-accent">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </summary>
            <nav className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg p-2 space-y-1 z-50">
              <Link href={`/${locale}`} className="block px-3 py-2 rounded-md text-sm hover:bg-accent">{t("home")}</Link>
              <Link href={`/${locale}/about`} className="block px-3 py-2 rounded-md text-sm hover:bg-accent">{t("about")}</Link>
              <Link href={`/${locale}/events`} className="block px-3 py-2 rounded-md text-sm hover:bg-accent">{t("events")}</Link>
              <Link href={`/${locale}/gallery`} className="block px-3 py-2 rounded-md text-sm hover:bg-accent">{t("gallery")}</Link>
              <Link href={`/${locale}/faq`} className="block px-3 py-2 rounded-md text-sm hover:bg-accent">{t("faq")}</Link>
              <Link href={`/${locale}/contact`} className="block px-3 py-2 rounded-md text-sm hover:bg-accent">{t("contact")}</Link>
              <hr className="my-1 border-border" />
              <Link href={`/${locale}/login`} className="block px-3 py-2 rounded-md text-sm text-primary font-medium">{t("login")}</Link>
              <Link href={`/${locale}/register`} className="block px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground">{t("register")}</Link>
            </nav>
          </details>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8 bg-card">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-2">{siteName}</h3>
            <p className="text-sm text-muted-foreground">{pt("heroSubtitle")}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{pt("quickLinks")}</h4>
            <nav className="flex flex-col gap-1 text-sm text-muted-foreground">
              <Link href={`/${locale}/about`} className="hover:text-foreground">{t("about")}</Link>
              <Link href={`/${locale}/events`} className="hover:text-foreground">{t("events")}</Link>
              <Link href={`/${locale}/faq`} className="hover:text-foreground">{t("faq")}</Link>
              <Link href={`/${locale}/contact`} className="hover:text-foreground">{t("contact")}</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{pt("contactInfo")}</h4>
            <p className="text-sm text-muted-foreground">contact@linguacenter.com</p>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-border text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteName}. {pt("allRightsReserved")}
        </div>
      </footer>
    </div>
  );
}
