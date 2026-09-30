"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Level { id: string; name: string; order: number; departmentId: string | null }
interface Department { id: string; name: string; nameAr: string | null }

export default function NewCoursePage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [levels, setLevels] = useState<Level[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredLevels, setFilteredLevels] = useState<Level[]>([]);
  const [form, setForm] = useState<Record<string, string>>({
    levelId: "", departmentId: "", name: "", code: "", description: "",
    maxStudents: "0", registrationOpen: "true",
    registrationStart: "", registrationEnd: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      const role = d?.user?.role;
      if (role !== "SuperAdmin" && role !== "Admin") router.push(`/${locale}/dashboard`);
    }).catch(() => router.push(`/${locale}/login`));
  }, [locale, router]);

  useEffect(() => {
    fetch("/api/levels").then(r => r.json()).then(d => {
      const arr = d.levels || [];
      setLevels(arr);
      setFilteredLevels(arr);
    });
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments || []));
  }, []);

  useEffect(() => {
    if (form.departmentId) {
      setFilteredLevels(levels.filter(l => l.departmentId === form.departmentId));
      setForm(prev => ({ ...prev, levelId: "" }));
    } else {
      setFilteredLevels(levels);
    }
  }, [form.departmentId, levels]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = {
      levelId: form.levelId,
      departmentId: form.departmentId || null,
      name: form.name,
      code: form.code,
      description: form.description,
      maxStudents: parseInt(form.maxStudents) || 0,
      registrationOpen: form.registrationOpen === "true",
      registrationStart: form.registrationStart || null,
      registrationEnd: form.registrationEnd || null,
    };
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/${locale}/courses/${data.course.id}`);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to create course" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${locale}/courses`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Courses</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Create Course</h1>

      {message && (
        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={save} className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameAr ? ` (${d.nameAr})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Level</label>
            <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required>
              <option value="">Select level</option>
              {filteredLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Course Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Students</label>
            <input type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} />
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-semibold mb-3">Registration Window</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Registration Open</label>
              <select value={form.registrationOpen} onChange={e => setForm({ ...form, registrationOpen: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="datetime-local" value={form.registrationStart} onChange={e => setForm({ ...form, registrationStart: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="datetime-local" value={form.registrationEnd} onChange={e => setForm({ ...form, registrationEnd: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 text-sm">
          {saving ? "Creating..." : "Create Course"}
        </button>
      </form>
    </div>
  );
}
