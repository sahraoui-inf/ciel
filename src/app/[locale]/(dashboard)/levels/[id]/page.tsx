"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Department { id: string; name: string; nameAr: string | null }
interface Language { id: string; name: string }

interface LevelData {
  id: string;
  name: string;
  code: string;
  order: number;
  description: string | null;
  price: number;
  isActive: boolean;
  languageId: string;
  departmentId: string | null;
  language: Language;
  department: Department | null;
}

export default function LevelDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const router = useRouter();

  const [level, setLevel] = useState<LevelData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ departmentId: "", languageId: "", name: "", code: "", order: "0", description: "", price: "0", isActive: true });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/levels/${id}`).then(r => r.json()).then(d => {
      if (d.level) {
        setLevel(d.level);
        setForm({
          departmentId: d.level.departmentId || "",
          languageId: d.level.languageId,
          name: d.level.name,
          code: d.level.code,
          order: String(d.level.order),
          description: d.level.description || "",
          price: String(d.level.price),
          isActive: d.level.isActive,
        });
      }
    });
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments || []));
    fetch("/api/languages").then(r => r.json()).then(d => setLanguages(d.languages || []));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch(`/api/levels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        departmentId: form.departmentId || null,
        languageId: form.languageId,
        name: form.name,
        code: form.code,
        order: parseInt(form.order) || 0,
        description: form.description || null,
        price: parseFloat(form.price) || 0,
        isActive: form.isActive,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setLevel(d.level);
      setEditing(false);
      setMessage({ type: "success", text: "Level updated." });
    } else {
      const d = await res.json();
      setMessage({ type: "error", text: d.error || "Failed to update" });
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this level?")) return;
    setMessage(null);
    const res = await fetch(`/api/levels/${id}`, { method: "DELETE" });
    if (res.ok) router.push(`/${locale}/levels`);
    else { const d = await res.json(); setMessage({ type: "error", text: d.error || "Delete failed" }); }
  }

  if (!level) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${locale}/levels`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Levels</Link>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
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
                  <option value="">Select</option>
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
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>

            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Save</button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 border border-border rounded-md text-sm">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="text-sm text-muted-foreground">Name</label><p className="font-medium">{level.name}</p></div>
              <div><label className="text-sm text-muted-foreground">Code</label><p className="font-medium">{level.code}</p></div>
              <div><label className="text-sm text-muted-foreground">Department</label><p className="font-medium">{level.department ? (locale === "ar" && level.department.nameAr ? level.department.nameAr : level.department.name) : "—"}</p></div>
              <div><label className="text-sm text-muted-foreground">Language</label><p className="font-medium">{level.language?.name}</p></div>
              <div><label className="text-sm text-muted-foreground">Order</label><p className="font-medium">{level.order}</p></div>
              <div><label className="text-sm text-muted-foreground">Price</label><p className="font-medium">${level.price.toFixed(2)}</p></div>
            </div>
            {level.description && <div><label className="text-sm text-muted-foreground">Description</label><p>{level.description}</p></div>}
            <div>
              <span className={`px-3 py-1 rounded-full text-sm ${level.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {level.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Edit</button>
              <button onClick={handleDelete}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-md text-sm hover:bg-red-50">Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
