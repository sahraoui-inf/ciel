"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Student {
  id: string;
  dateOfBirth: string | null;
  birthPlace: string | null;
  photo: string | null;
  user: { id: string; name: string; email?: string; phone?: string | null; isActive?: boolean };
  enrollments: { id: string; status: string; classGroup: { id: string; name: string; course: { name: string } } }[];
}

export default function StudentsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [classGroupFilter, setClassGroupFilter] = useState("");
  const [classGroups, setClassGroups] = useState<{ id: string; name: string; course: { name: string } }[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (!data.user) { router.push(`/${locale}/login`); return }
      setRole(data.user.role);
      if (data.user.role === "Student") { router.push(`/${locale}/dashboard`); return }
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    if (!role || role === "Student") return;
    setLoading(true);
    const params = new URLSearchParams();
    if (classGroupFilter) params.set("classGroupId", classGroupFilter);
    if (search) params.set("name", search);
    fetch(`/api/students?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setStudents(d.students || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [role, classGroupFilter, search]);

  useEffect(() => {
    if (role === "Teacher") {
      fetch("/api/teachers/profile")
        .then(r => r.json())
        .then(data => {
          const groups = data.profile?.classGroups || [];
          setClassGroups(groups.map((g: { id: string; name: string; course: { name: string } }) => g));
        })
        .catch(() => {});
    } else {
      fetch("/api/classgroups")
        .then(r => r.json())
        .then(d => setClassGroups((d.groups || []).map((g: { id: string; name: string; course: { name: string } }) => g)))
        .catch(() => {});
    }
  }, [role]);

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Dropped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      Expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || "bg-gray-100 text-gray-800"}`}>{status}</span>;
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full ps-9 pe-9 py-2 rounded-md border border-border bg-background text-sm"
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <select value={classGroupFilter} onChange={e => setClassGroupFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          <option value="">All groups</option>
          {classGroups.map(g => (
            <option key={g.id} value={g.id}>{g.name} — {g.course.name}</option>
          ))}
        </select>
      </div>

      {students.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {search ? `No students found for "${search}".` : "No students found."}
        </p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                {role !== "Teacher" && <th className="text-left p-3 font-medium max-sm:hidden">Email</th>}
                {role !== "Teacher" && <th className="text-left p-3 font-medium max-sm:hidden">Phone</th>}
                <th className="text-left p-3 font-medium max-sm:hidden">DOB</th>
                {role !== "Teacher" && <th className="text-left p-3 font-medium max-sm:hidden">Status</th>}
                <th className="text-left p-3 font-medium">Enrollments</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/${locale}/students/${s.id}`)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {s.photo ? (
                        <img src={s.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {s.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <Link href={`/${locale}/students/${s.id}`} className="text-primary hover:underline font-medium">
                        {s.user.name}
                      </Link>
                    </div>
                  </td>
                  {role !== "Teacher" && <td className="p-3 max-sm:hidden text-muted-foreground">{s.user.email || "—"}</td>}
                  {role !== "Teacher" && <td className="p-3 max-sm:hidden text-muted-foreground">{s.user.phone || "—"}</td>}
                  <td className="p-3 max-sm:hidden text-muted-foreground">
                    {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : "—"}
                  </td>
                  {role !== "Teacher" && (
                    <td className="p-3 max-sm:hidden">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${s.user.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                        {s.user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.enrollments || []).slice(0, 2).map(e => (
                        <span key={e.id}>{statusBadge(e.status)}</span>
                      ))}
                      {(s.enrollments || []).length > 2 && <span className="text-xs text-muted-foreground">+{s.enrollments.length - 2}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
