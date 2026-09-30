import Link from "next/link";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const tabs = [
    { href: "/settings", label: "General" },
    { href: "/settings/pages", label: "Pages" },
    { href: "/settings/events", label: "Events" },
    { href: "/settings/testimonials", label: "Testimonials" },
    { href: "/settings/faq", label: "FAQ" },
    { href: "/settings/media", label: "Media" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">CMS Settings</h1>
      <nav className="flex flex-wrap gap-2 mb-8 border-b border-border pb-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/${locale}${tab.href}`}
            className="px-4 py-2 text-sm rounded-t-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
