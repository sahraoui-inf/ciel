"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface DeptRef { id: string; name: string; nameAr: string | null }
interface StaffData {
  id: string; name: string; email: string; phone: string | null; isActive: boolean; createdAt: string; updatedAt: string;
  departments: DeptRef[];
}

export default function StaffDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const router = useRouter();

  const [staff, setStaff] = useState<StaffData | null>(null);
  const [allDepts, setAllDepts] = useState<DeptRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => setAllDepts(d.departments || []));
  }, []);

  useEffect(() => {
    fetch(`/api/staff/${id}`).then(r => r.json()).then(d => {
      if (!d.staff) { router.push(`/${locale}/staff`); return }
      setStaff(d.staff);
      setForm({
        name: d.staff.name || "", email: d.staff.email || "",
        phone: d.staff.phone || "", password: "", confirmPassword: "",
      });
      setSelectedDepts(d.staff.departments?.map((d: DeptRef) => d.id) || []);
      setLoading(false);
    });
  }, [id]);

  function toggleDept(deptId: string) {
    setSelectedDepts(prev => prev.includes(deptId) ? prev.filter(x => x !== deptId) : [...prev, deptId]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.password && form.password !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (form.password && form.password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name, email: form.email, phone: form.phone || null,
      departmentIds: selectedDepts,
    };
    if (form.password) body.password = form.password;

    const res = await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (res.ok) {
      const d = await res.json();
      setStaff(d.staff);
      setEditing(false);
      setForm({ name: d.staff.name, email: d.staff.email, phone: d.staff.phone || "", password: "", confirmPassword: "" });
      setSelectedDepts(d.staff.departments?.map((d: DeptRef) => d.id) || []);
      setMessage({ type: "success", text: "Staff updated successfully" });
    } else {
      const d = await res.json();
      setMessage({ type: "error", text: d.error || "Failed to update" });
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this staff member? They will be deactivated and converted to Student role.")) return;
    setMessage(null);
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    if (res.ok) router.push(`/${locale}/staff`);
    else { const d = await res.json(); setMessage({ type: "error", text: d.error || "Delete failed" }); }
  }

  async function toggleActive() {
    if (!staff) return;
    setMessage(null);
    const body: Record<string, unknown> = { isActive: !staff.isActive };
    body.departmentIds = selectedDepts;
    const res = await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setStaff(d.staff);
      setSelectedDepts(d.staff.departments?.map((d: DeptRef) => d.id) || []);
      setMessage({ type: "success", text: `Staff ${d.staff.isActive ? "activated" : "deactivated"}` });
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!staff) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/${locale}/staff`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Staff</Link>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
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
                <label className="block text-sm font-medium mb-1">New Password (leave blank to keep)</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Assigned Departments</label>
              <div className="flex flex-wrap gap-2">
                {allDepts.map(d => {
                  const label = locale === "ar" && d.nameAr ? d.nameAr : d.name;
                  const sel = selectedDepts.includes(d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        sel
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                      }`}>
                      {label}
                    </button>
                  );
                })}
                {allDepts.length === 0 && <p className="text-sm text-muted-foreground">No departments available.</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => {
                setEditing(false);
                setForm({ name: staff.name, email: staff.email, phone: staff.phone || "", password: "", confirmPassword: "" });
                setSelectedDepts(staff.departments?.map(d => d.id) || []);
              }}
                className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {staff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{staff.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${staff.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {staff.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">Admin</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div><label className="text-sm text-muted-foreground">Email</label><p className="font-medium">{staff.email}</p></div>
              <div><label className="text-sm text-muted-foreground">Phone</label><p className="font-medium">{staff.phone || "—"}</p></div>
              <div className="sm:col-span-2">
                <label className="text-sm text-muted-foreground">Departments</label>
                <p className="font-medium">
                  {staff.departments?.length
                    ? staff.departments.map(d => locale === "ar" && d.nameAr ? d.nameAr : d.name).join(", ")
                    : "None assigned"}
                </p>
              </div>
              <div><label className="text-sm text-muted-foreground">Created</label><p className="font-medium">{new Date(staff.createdAt).toLocaleDateString()}</p></div>
              <div><label className="text-sm text-muted-foreground">Last Updated</label><p className="font-medium">{new Date(staff.updatedAt).toLocaleDateString()}</p></div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90">Edit</button>
              <button onClick={toggleActive}
                className={`px-4 py-2 border rounded-md text-sm ${staff.isActive ? "border-orange-300 text-orange-600 hover:bg-orange-50" : "border-green-300 text-green-600 hover:bg-green-50"}`}>
                {staff.isActive ? "Deactivate" : "Activate"}
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50">Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
