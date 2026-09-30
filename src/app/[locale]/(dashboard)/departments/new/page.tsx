"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function NewDepartmentPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [form, setForm] = useState({
    name: "", nameAr: "", code: "", description: "", descriptionAr: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        nameAr: form.nameAr || null,
        code: form.code,
        description: form.description || null,
        descriptionAr: form.descriptionAr || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/${locale}/departments/${data.department.id}`);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to create department" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${locale}/departments`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Departments</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Create Department</h1>

      {message && (
        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={save} className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name (English) *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name (Arabic)</label>
            <input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code *</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description (English)</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description (Arabic)</label>
          <textarea value={form.descriptionAr} onChange={e => setForm({ ...form, descriptionAr: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 text-sm">
          {saving ? "Creating..." : "Create Department"}
        </button>
      </form>
    </div>
  );
}
