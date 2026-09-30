"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Department {
  id: string; name: string; nameAr: string | null; code: string;
  description: string | null; descriptionAr: string | null;
  isActive: boolean; createdAt: string;
}

export default function DepartmentDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const router = useRouter();

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/departments/${id}`);
    if (!res.ok) { router.push(`/${locale}/departments`); return }
    const data = await res.json();
    setDepartment(data.department);
    const d = data.department;
    setForm({
      name: d.name || "",
      nameAr: d.nameAr || "",
      code: d.code || "",
      description: d.description || "",
      descriptionAr: d.descriptionAr || "",
      isActive: d.isActive ? "true" : "false",
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = {};
    if (form.name) body.name = form.name;
    body.nameAr = form.nameAr || "";
    if (form.code) body.code = form.code;
    body.description = form.description || "";
    body.descriptionAr = form.descriptionAr || "";
    body.isActive = form.isActive === "true";

    const res = await fetch(`/api/departments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Department updated successfully" });
      setEdit(false);
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to update department" });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/${locale}/departments`);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to delete department" });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!department) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/${locale}/departments`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Departments</Link>
        {!edit && (
          <div className="flex gap-2">
            <button onClick={() => { setEdit(true); setMessage(null); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Edit
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              Delete
            </button>
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold mb-6">{edit ? "Edit Department" : department.name}</h1>

      {message && (
        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-6 p-4 border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">
            Are you sure you want to delete this department?
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80">
              Cancel
            </button>
          </div>
        </div>
      )}

      {edit ? (
        <form onSubmit={save} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name (English)</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name (Arabic)</label>
              <input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
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
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={() => { setEdit(false); setMessage(null); load(); }}
              className="px-6 py-2 bg-muted text-muted-foreground rounded-md font-medium hover:bg-muted/80 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Department Information</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {department.name}</div>
            <div><span className="text-muted-foreground">Name (Arabic):</span> {department.nameAr || "—"}</div>
            <div><span className="text-muted-foreground">Code:</span> {department.code}</div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className={`px-2 py-0.5 rounded-full text-xs ${department.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                {department.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {department.description && (
              <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {department.description}</div>
            )}
            {department.descriptionAr && (
              <div className="col-span-2"><span className="text-muted-foreground">Description (Arabic):</span> {department.descriptionAr}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
