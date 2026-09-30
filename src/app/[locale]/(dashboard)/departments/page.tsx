import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-in-production");

export default async function DepartmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect(`/${locale}/login`);

  let currentRole = "Student";
  try { const p = await jwtVerify(token, secret); currentRole = (p.payload as { role?: string }).role || "Student"; } catch { redirect(`/${locale}/login`); }

  const departments = await prisma.department.findMany({ orderBy: { createdAt: "desc" } });
  const isSuperAdmin = currentRole === "SuperAdmin";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Departments</h1>
        {isSuperAdmin && (
          <Link href={`/${locale}/departments/new`} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            + Create Department
          </Link>
        )}
      </div>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Arabic Name</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Code</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(d => (
              <tr key={d.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3"><Link href={`/${locale}/departments/${d.id}`} className="text-primary hover:underline">{d.name}</Link></td>
                <td className="p-3 text-muted-foreground max-sm:hidden">{d.nameAr || "—"}</td>
                <td className="p-3 max-sm:hidden">{d.code}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${d.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No departments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
