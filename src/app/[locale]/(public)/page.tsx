import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { isRtlLocale } from "@/app/i18n";

function IconAdmin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  );
}

function IconSchool() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
  );
}

function IconHub() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
  );
}

async function getContent(locale: string) {
  const events = await prisma.event.findMany({
    where: { isActive: true },
    orderBy: { date: "asc" },
    take: 3,
  });

  const testimonials = await prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const faqs = await prisma.faq.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    take: 4,
  });

  const siteName = (await prisma.systemSetting.findUnique({ where: { key: "site_name" } }))?.value || "LinguaCenter";
  const siteDesc = (await prisma.systemSetting.findUnique({ where: { key: "site_description" } }))?.value || "";
  const heroImage = (await prisma.systemSetting.findUnique({ where: { key: "hero_image_url" } }))?.value || "";

  const courses = await prisma.course.findMany({
    where: { isActive: true },
    include: { language: true, level: true, _count: { select: { classGroups: true } } },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  return { events, testimonials, faqs, siteName, siteDesc, courses, heroImage };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public" });
  const rtl = isRtlLocale(locale);

  const { events, testimonials, faqs, siteName, siteDesc, courses, heroImage } = await getContent(locale);

  return (
    <div className={rtl ? "rtl" : "ltr"}>
      {/* Hero */}
      <section className="relative min-h-[600px] flex items-center overflow-hidden bg-[#161616]">
        {heroImage && (
          <div className="absolute inset-0 z-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url("${heroImage}")` }} />
        )}
        <div className="absolute inset-0 z-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.15'%3E%3Cg%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 py-20 lg:w-2/3">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {rtl ? <>مرحباً بكم في {siteName} - <br /><span className="text-blue-300">مستقبل التعليم الذكي</span></> : <>Welcome to {siteName} - <br /><span className="text-blue-300">The Future of Smart Learning</span></>}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
            {siteDesc || (rtl ? "نظام متكامل لإدارة مراكز التعليم يجمع بين الكفاءة الإدارية والابتكار التعليمي. نوفر أدوات ذكية للمعلمين، الطلاب، وأولياء الأمور في منصة واحدة متطورة." : "An integrated learning management system combining administrative efficiency with educational innovation. We provide smart tools for teachers, students, and parents in one advanced platform.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/${locale}/register`} className="inline-flex items-center justify-center min-w-[160px] min-h-[48px] bg-primary text-white px-6 py-3 text-lg font-semibold hover:bg-primary/90 transition-colors">
              {rtl ? "ابدأ الآن" : "Get Started"}
            </Link>
            <Link href={`/${locale}/courses`} className="inline-flex items-center justify-center min-w-[160px] min-h-[48px] border border-primary text-white px-6 py-3 text-lg font-semibold hover:bg-white/10 transition-colors">
              {rtl ? "استكشف المزيد" : "Explore More"}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 md:px-12 lg:px-24 bg-surface">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-2">{rtl ? "أركان منظومتنا الذكية" : "Pillars of Our Smart System"}</h2>
          <div className="h-1 w-24 bg-primary" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-muted p-6 transition-all hover:shadow-md">
            <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center mb-6">
              <IconAdmin />
            </div>
            <h3 className="text-xl font-bold mb-4">{rtl ? "الإدارة الذكية" : "Smart Administration"}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {rtl ? "أدوات متطورة لإدارة التسجيل، الجداول الدراسية، وشؤون الموظفين بدقة متناهية وبضغطة زر واحدة." : "Advanced tools for managing registration, schedules, and staff with precision at the click of a button."}
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><IconCheck className="text-primary" /> {rtl ? "أتمتة السجلات" : "Record Automation"}</li>
              <li className="flex items-center gap-2"><IconCheck className="text-primary" /> {rtl ? "تقارير مالية دقيقة" : "Accurate Financial Reports"}</li>
            </ul>
          </div>
          <div className="bg-muted p-6 transition-all hover:shadow-md">
            <div className="w-12 h-12 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center justify-center mb-6">
              <IconSchool />
            </div>
            <h3 className="text-xl font-bold mb-4">{rtl ? "بيئة تعليمية متطورة" : "Advanced Learning Environment"}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {rtl ? "منصة تعليمية تفاعلية تمكن المعلمين من تقديم محتوى إبداعي وتساعد الطلاب على التحصيل الدراسي بذكاء." : "An interactive platform empowering teachers to deliver creative content and helping students achieve academic excellence."}
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><IconCheck className="text-green-600" /> {rtl ? "فصول افتراضية" : "Virtual Classrooms"}</li>
              <li className="flex items-center gap-2"><IconCheck className="text-green-600" /> {rtl ? "مكتبة رقمية شاملة" : "Comprehensive Digital Library"}</li>
            </ul>
          </div>
          <div className="bg-muted p-6 transition-all hover:shadow-md">
            <div className="w-12 h-12 bg-secondary text-secondary-foreground flex items-center justify-center mb-6">
              <IconHub />
            </div>
            <h3 className="text-xl font-bold mb-4">{rtl ? "تواصل مستمر" : "Continuous Communication"}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {rtl ? "ربط مباشر بين المركز والمنزل لضمان متابعة لحظية لمستوى الطالب وسلوكه وأنشطته التعليمية." : "Direct connection between the center and home for real-time monitoring of student performance, behavior, and activities."}
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><IconCheck className="text-secondary" /> {rtl ? "تنبيهات فورية" : "Instant Notifications"}</li>
              <li className="flex items-center gap-2"><IconCheck className="text-secondary" /> {rtl ? "دردشة آمنة" : "Secure Chat"}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Access Portals */}
      <section className="py-16 px-6 md:px-12 lg:px-24 bg-muted">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 bg-primary p-8 flex flex-col justify-between min-h-[280px]">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">{rtl ? "الدخول السريع للبوابات" : "Quick Access Portals"}</h2>
              <p className="text-blue-200 max-w-md">{rtl ? "اختر بوابتك المخصصة للوصول إلى الخدمات التعليمية والإدارية بكل سهولة." : "Choose your dedicated portal to access educational and administrative services with ease."}</p>
            </div>
            <div className="flex gap-4 mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/20"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
          <Link href={`/${locale}/login`} className="bg-surface p-6 flex flex-col justify-between group hover:bg-primary/5 transition-colors border border-border">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary group-hover:scale-110 transition-transform"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M13 13l-3-3 3-3"/><path d="M10 10h7"/></svg>
            <span className="text-xl font-bold mt-12">{rtl ? "بوابة الطالب" : "Student Portal"}</span>
          </Link>
          <Link href={`/${locale}/login`} className="bg-surface p-6 flex flex-col justify-between group hover:bg-primary/5 transition-colors border border-border">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary group-hover:scale-110 transition-transform"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            <span className="text-xl font-bold mt-12">{rtl ? "بوابة المعلم" : "Teacher Portal"}</span>
          </Link>
          <Link href={`/${locale}/login`} className="bg-surface p-6 flex flex-col justify-between group hover:bg-primary/5 transition-colors border border-border lg:col-start-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary group-hover:scale-110 transition-transform"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-xl font-bold mt-12">{rtl ? "بوابة ولي الأمر" : "Parent Portal"}</span>
          </Link>
          <Link href={`/${locale}/login`} className="bg-surface p-6 flex flex-col justify-between group hover:bg-primary/5 transition-colors border border-border">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary group-hover:scale-110 transition-transform"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span className="text-xl font-bold mt-12">{rtl ? "الإدارة" : "Administration"}</span>
          </Link>
        </div>
      </section>

      {/* Courses */}
      {courses.length > 0 && (
        <section className="py-16 px-6 md:px-12 lg:px-24 bg-surface">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t("ourCourses")}</h2>
              <div className="h-1 w-24 bg-primary" />
            </div>
            <Link href={`/${locale}/courses`} className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
              {t("viewAll")}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={rtl ? "rotate-180" : ""}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.id} className="border border-border group">
                <div className="p-6">
                  <span className="text-xs text-muted-foreground mb-2 block">{course.language.name} &middot; {course.level.name}</span>
                  <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">{course.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{course._count.classGroups} {rtl ? "مجموعة" : "groups"}</span>
                    <Link href={`/${locale}/courses/${course.id}`} className="text-primary hover:underline font-medium">{t("viewCourse")}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section className="py-16 px-6 md:px-12 lg:px-24 bg-muted">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t("upcomingEvents")}</h2>
              <div className="h-1 w-24 bg-primary" />
            </div>
            <Link href={`/${locale}/events`} className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
              {t("viewAll")}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={rtl ? "rotate-180" : ""}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const title = locale === "ar" && event.titleAr ? event.titleAr : event.titleEn;
              const desc = locale === "ar" && event.descriptionAr ? event.descriptionAr : event.descriptionEn;
              return (
                <div key={event.id} className="border border-border group bg-surface">
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {event.imageUrl ? (
                      <img src={event.imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </div>
                    )}
                    {event.location && (
                      <span className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1">{event.location}</span>
                    )}
                  </div>
                  <div className="p-6">
                    {event.date && (
                      <span className="text-xs text-muted-foreground mb-2 block">{new Date(event.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                    )}
                    <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">{title}</h3>
                    {desc && <p className="text-sm text-muted-foreground line-clamp-2">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 px-6 md:px-12 lg:px-24 bg-surface">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2">{t("whatStudentsSay")}</h2>
            <div className="h-1 w-24 bg-primary" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(item => (
              <div key={item.id} className="border border-border p-6">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={i < item.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={i < item.rating ? "text-yellow-500" : "text-muted-foreground"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ))}
                </div>
                <p className="text-muted-foreground mb-3 text-sm">
                  {locale === "ar" && item.contentAr ? item.contentAr : item.contentEn}
                </p>
                <p className="font-semibold text-sm">— {item.studentName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-16 px-6 md:px-12 lg:px-24 bg-muted">
          <div className="max-w-3xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-2">{t("faq")}</h2>
              <div className="h-1 w-24 bg-primary" />
            </div>
            <div className="space-y-4">
              {faqs.map(faq => {
                const question = locale === "ar" && faq.questionAr ? faq.questionAr : faq.questionEn;
                const answer = locale === "ar" && faq.answerAr ? faq.answerAr : faq.answerEn;
                return (
                  <details key={faq.id} className="bg-surface border border-border p-4 group">
                    <summary className="cursor-pointer font-medium text-sm flex items-center justify-between">
                      {question}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-open:rotate-180 transition-transform"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <p className="mt-3 text-muted-foreground text-sm">{answer}</p>
                  </details>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <Link href={`/${locale}/faq`} className="text-primary hover:underline text-sm font-medium">{t("viewAll")}</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
