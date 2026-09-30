"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Department { id: string; name: string; nameAr: string | null }
interface Language { id: string; name: string }

export default function NewLevelPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [form, setForm] = useState({
    departmentId: "", languageId: "", name: "", code: "", order: "0", description: "", price: "0",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments || []));
    fetch("/api/languages").then(r => r.json()).then(d => setLanguages(d.languages || []));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        departmentId: form.departmentId || null,
        languageId: form.languageId,
        name: form.name,
        code: form.code,
        order: parseInt(form.order) || 0,
        description: form.description || null,
        price: parseFloat(form.price) || 0,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/${locale}/levels/${data.level.id}`);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to create level" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${locale}/levels`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Levels</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Create Level</h1>

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
              <option value="">No department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameAr ? ` (${d.nameAr})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Language *</label>
            <select value={form.languageId} onChange={e => setForm({ ...form, languageId: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required>
              <option value="">Select language</option>
              {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code *</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Order *</label>
            <input type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ($)</label>
            <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 text-sm">
          {saving ? "Creating..." : "Create Level"}
        </button>
      </form>
    </div>
  );
}
