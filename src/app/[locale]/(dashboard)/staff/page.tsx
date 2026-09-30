"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface DeptRef { id: string; name: string; nameAr: string | null }
interface StaffMember {
  id: string; name: string; email: string; phone: string | null; isActive: boolean; createdAt: string;
  departments: DeptRef[];
}

export default function StaffListPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");

  function load(query = "") {
    fetch(`/api/staff${query ? `?search=${encodeURIComponent(query)}` : ""}`)
      .then(r => r.json()).then(d => setStaff(d.staff || [])).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <Link href={`/${locale}/staff/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          + Add Staff
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
          className="flex-1 max-w-xs px-3 py-2 rounded-md border border-border bg-background text-sm" />
        <button type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); load() }}
            className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent">Clear</button>
        )}
      </form>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Email</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Departments</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium max-sm:hidden">Created</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3">
                  <Link href={`/${locale}/staff/${s.id}`} className="text-primary hover:underline font-medium">{s.name}</Link>
                </td>
                <td className="p-3 text-muted-foreground max-sm:hidden">{s.email}</td>
                <td className="p-3 max-sm:hidden">
                  {s.departments?.length
                    ? s.departments.map(d => locale === "ar" && d.nameAr ? d.nameAr : d.name).join(", ")
                    : "—"}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 max-sm:hidden text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No staff members found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
