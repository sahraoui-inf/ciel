"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Department { id: string; name: string; nameAr: string | null }

export default function NewTeacherPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    departmentId: "", specialization: "", hourlyRate: "0", hireDate: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments || []));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (form.password !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      setSaving(false);
      return;
    }

    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        password: form.password,
        departmentId: form.departmentId || null,
        specialization: form.specialization || null,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        hireDate: form.hireDate || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/${locale}/teachers/${data.teacher.id}`);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to create teacher" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${locale}/teachers`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Teachers</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Create Teacher</h1>

      {message && (
        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={save} className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameAr ? ` (${d.nameAr})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Specialization</label>
            <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hourly Rate (DA)</label>
            <input type="number" step="0.01" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hire Date</label>
            <input type="date" value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required minLength={6} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 text-sm">
          {saving ? "Creating..." : "Create Teacher"}
        </button>
      </form>
    </div>
  );
}
