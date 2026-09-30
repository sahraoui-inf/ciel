"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Dept { id: string; name: string; nameAr: string | null }

export default function NewStaffPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [departments, setDepartments] = useState<Dept[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments || []));
  }, []);

  function toggleDept(id: string) {
    setSelectedDepts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.password !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (form.password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, email: form.email, phone: form.phone || null,
        password: form.password, departmentIds: selectedDepts,
      }),
    });
    setSaving(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/${locale}/staff/${data.staff.id}`);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to create staff" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${locale}/staff`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Staff</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Add Staff Member</h1>

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
          <div></div>
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Assigned Departments</label>
          <div className="flex flex-wrap gap-2">
            {departments.map(d => {
              const label = locale === "ar" && d.nameAr ? d.nameAr : d.name;
              const selected = selectedDepts.includes(d.id);
              return (
                <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                  }`}>
                  {label}
                </button>
              );
            })}
            {departments.length === 0 && <p className="text-sm text-muted-foreground">No departments available. Create one first.</p>}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 text-sm">
          {saving ? "Creating..." : "Create Staff Member"}
        </button>
      </form>
    </div>
  );
}
