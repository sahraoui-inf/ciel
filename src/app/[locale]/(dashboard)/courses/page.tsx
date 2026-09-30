import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ departmentId?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect(`/${locale}/login`);

  let userRole = "";
  try {
    const { payload } = await jwtVerify(token, secret);
    userRole = payload.role as string;
  } catch { redirect(`/${locale}/login`); }
  if (userRole !== "SuperAdmin" && userRole !== "Admin") redirect(`/${locale}/dashboard`);
  const canManage = userRole === "SuperAdmin" || userRole === "Admin";

  const where: Record<string, unknown> = {};
  if (sp.departmentId) where.departmentId = sp.departmentId;

  const courses = await prisma.course.findMany({
    where,
    include: { language: true, level: true, department: true, _count: { select: { classGroups: true } } },
    orderBy: { createdAt: "desc" },
  });

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  function isRegistrationActive(c: { registrationOpen: boolean; registrationStart: Date | null; registrationEnd: Date | null }) {
    const now = new Date();
    return c.registrationOpen &&
      (!c.registrationStart || now >= c.registrationStart) &&
      (!c.registrationEnd || now <= c.registrationEnd);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Courses</h1>
        {canManage && <Link href={`/${locale}/courses/new`} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90">Create Course</Link>}
      </div>

      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <select name="departmentId" defaultValue={sp.departmentId || ""}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          <option value="">All departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}{d.nameAr ? ` (${d.nameAr})` : ""}</option>
          ))}
        </select>
        <button type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
          Filter
        </button>
        {sp.departmentId && (
          <Link href={`/${locale}/courses`}
            className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent">
            Clear
          </Link>
        )}
      </form>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Code</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Department</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Level</th>
              <th className="text-left p-3 font-medium">Groups</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Registration</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3"><Link href={`/${locale}/courses/${c.id}`} className="text-primary hover:underline">{c.name}</Link></td>
                <td className="p-3 text-muted-foreground max-sm:hidden">{c.code}</td>
                <td className="p-3 max-sm:hidden">{c.department ? (locale === "ar" && c.department.nameAr ? c.department.nameAr : c.department.name) : "—"}</td>
                <td className="p-3 max-sm:hidden">{c.level.name}</td>
                <td className="p-3">{c._count.classGroups}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${c.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 max-sm:hidden">
                  <span className={`px-2 py-1 rounded-full text-xs ${isRegistrationActive(c) ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-gray-100 text-gray-800"}`}>
                    {isRegistrationActive(c) ? "Open" : "Closed"}
                  </span>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No courses yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
