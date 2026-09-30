import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export default async function LevelsPage({
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

  let currentRole = "Student";
  try { const p = await jwtVerify(token, secret); currentRole = (p.payload as { role?: string }).role || "Student"; } catch { redirect(`/${locale}/login`); }

  const where: Record<string, unknown> = {};
  if (sp.departmentId) where.departmentId = sp.departmentId;

  const levels = await prisma.level.findMany({
    where,
    include: { language: true, department: true },
    orderBy: [{ order: "asc" }],
  });

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const isSuperAdmin = currentRole === "SuperAdmin";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Levels</h1>
        {isSuperAdmin && (
          <Link href={`/${locale}/levels/new`} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            + Create Level
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
        <button type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
          Filter
        </button>
        {sp.departmentId && (
          <Link href={`/${locale}/levels`}
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
              <th className="text-left p-3 font-medium">Order</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Price</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {levels.map(l => (
              <tr key={l.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3"><Link href={`/${locale}/levels/${l.id}`} className="text-primary hover:underline">{l.name}</Link></td>
                <td className="p-3 text-muted-foreground max-sm:hidden">{l.code}</td>
                <td className="p-3 max-sm:hidden">{l.department ? (locale === "ar" && l.department.nameAr ? l.department.nameAr : l.department.name) : "—"}</td>
                <td className="p-3">{l.order}</td>
                <td className="p-3 max-sm:hidden">${l.price.toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${l.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {l.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {levels.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No levels found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
