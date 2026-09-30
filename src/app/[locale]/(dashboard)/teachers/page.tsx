import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export default async function TeachersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ departmentId?: string; name?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect(`/${locale}/login`);

  let currentRole = "Student";
  try { const p = await jwtVerify(token, secret); currentRole = (p.payload as { role?: string }).role || "Student"; } catch { redirect(`/${locale}/login`); }

  const where: Record<string, unknown> = {};
  if (sp.departmentId) where.departmentId = sp.departmentId;
  if (sp.name) where.user = { name: { contains: sp.name } };

  const teachers = await prisma.teacherProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
      department: true,
      _count: { select: { classGroups: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  const isSuperAdmin = currentRole === "SuperAdmin";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teachers</h1>
        {isSuperAdmin && (
          <Link href={`/${locale}/teachers/new`} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            + Create Teacher
          </Link>
        )}
      </div>

      <form method="get" className="flex flex-wrap gap-3 mb-6">
        <select name="departmentId" defaultValue={sp.departmentId || ""}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          <option value="">All departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}{d.nameAr ? ` (${d.nameAr})` : ""}</option>
          ))}
        </select>
        <input type="text" name="name" defaultValue={sp.name || ""}
          placeholder="Search by name..."
          className="px-3 py-2 rounded-md border border-border bg-background text-sm min-w-[200px]" />
        <button type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
          Filter
        </button>
        {(sp.departmentId || sp.name) && (
          <Link href={`/${locale}/teachers`}
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
              <th className="text-left p-3 font-medium max-sm:hidden">Email</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Department</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Specialization</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Hourly Rate</th>
              <th className="text-left p-3 font-medium">Groups</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3"><Link href={`/${locale}/teachers/${t.id}`} className="text-primary hover:underline">{t.user.name}</Link></td>
                <td className="p-3 text-muted-foreground max-sm:hidden">{t.user.email}</td>
                <td className="p-3 max-sm:hidden">{t.department ? (locale === "ar" && t.department.nameAr ? t.department.nameAr : t.department.name) : "—"}</td>
                <td className="p-3 max-sm:hidden">{t.specialization || "—"}</td>
                <td className="p-3 max-sm:hidden">DA {t.hourlyRate.toFixed(2)}</td>
                <td className="p-3">{t._count.classGroups}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${t.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
