"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TimeSlotBrief { id: string; name: string; nameAr: string | null; days: string; startTime: string; endTime: string }
interface ClassGroupTimeSlot { id: string; timeSlot: TimeSlotBrief }
interface ClassGroup {
  id: string; name: string; isActive: boolean;
  course: { name: string; language: { name: string }; level: { name: string } };
  timeSlots: ClassGroupTimeSlot[];
}
interface Payout {
  id: string; amount: number; description: string; createdAt: string;
}
interface Department { id: string; name: string; nameAr: string | null }
interface User {
  id: string; name: string; email: string; phone: string | null; isActive: boolean;
}
interface Teacher {
  id: string; departmentId: string | null; specialization: string | null;
  hireDate: string | null; hourlyRate: number; isActive: boolean; createdAt: string;
  photo: string | null;
  user: User; department: Department | null; classGroups: ClassGroup[]; payouts: Payout[];
}

interface DepartmentOption { id: string; name: string; nameAr: string | null }

const DAY_NAMES: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };

export default function TeacherDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const router = useRouter();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/teachers/${id}`);
    if (!res.ok) { router.push(`/${locale}/teachers`); return }
    const data = await res.json();
    setTeacher(data.teacher);
    const t = data.teacher;
    setForm({
      name: t.user.name || "",
      email: t.user.email || "",
      phone: t.user.phone || "",
      password: "",
      departmentId: t.departmentId || "",
      specialization: t.specialization || "",
      hourlyRate: String(t.hourlyRate),
      hireDate: t.hireDate ? t.hireDate.substring(0, 10) : "",
      isActive: t.isActive ? "true" : "false",
      photo: t.photo || "",
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments || []));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = {};
    if (form.name) body.name = form.name;
    if (form.email) body.email = form.email;
    body.phone = form.phone || "";
    if (form.password) body.password = form.password;
    body.departmentId = form.departmentId || null;
    body.specialization = form.specialization || "";
    body.hourlyRate = parseFloat(form.hourlyRate) || 0;
    body.hireDate = form.hireDate || null;
    body.isActive = form.isActive === "true";
    if (form.photo) body.photo = form.photo;

    const res = await fetch(`/api/teachers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Teacher updated successfully" });
      setEdit(false);
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to update teacher" });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/${locale}/teachers`);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to delete teacher" });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!teacher) return null;

  const deptName = teacher.department
    ? (locale === "ar" && teacher.department.nameAr ? teacher.department.nameAr : teacher.department.name)
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/${locale}/teachers`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Teachers</Link>
        <div className="flex gap-2">
          {!edit && (
            <>
              <button onClick={() => { setEdit(true); setMessage(null); }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Edit
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">{edit ? "Edit Teacher" : teacher.user.name}</h1>

      {message && (
        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-6 p-4 border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">
            Are you sure you want to delete this teacher? The user will be converted to inactive Student role.
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
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
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
                <option value="">No department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameAr ? ` (${d.nameAr})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password (leave blank to keep current)</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" minLength={6} />
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
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Photo</label>
              <div className="flex items-center gap-3">
                {form.photo && <img src={form.photo} alt="preview" className="h-14 w-14 rounded-full object-cover border" />}
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (res.ok) setForm({ ...form, photo: data.url });
                }} className="text-sm" />
              </div>
            </div>
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
        <>
          <div className="bg-card border border-border rounded-lg p-6 space-y-4 mb-6">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {teacher.photo && (
                <div className="sm:col-span-2 flex items-center gap-3 mb-1">
                  <img src={teacher.photo} alt="" className="h-14 w-14 rounded-full object-cover border" />
                </div>
              )}
              <div><span className="text-muted-foreground">Email:</span> {teacher.user.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {teacher.user.phone || "—"}</div>
              <div><span className="text-muted-foreground">Department:</span> {deptName || "—"}</div>
              <div><span className="text-muted-foreground">Specialization:</span> {teacher.specialization || "—"}</div>
              <div><span className="text-muted-foreground">Hourly Rate:</span> DA {teacher.hourlyRate.toFixed(2)}</div>
              <div><span className="text-muted-foreground">Hire Date:</span> {teacher.hireDate ? new Date(teacher.hireDate).toLocaleDateString() : "—"}</div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className={`px-2 py-0.5 rounded-full text-xs ${teacher.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                  {teacher.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Class Groups ({teacher.classGroups.length})</h2>
            {teacher.classGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No class groups assigned.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Group</th>
                      <th className="text-left p-3 font-medium max-sm:hidden">Course</th>
                      <th className="text-left p-3 font-medium max-sm:hidden">Schedule</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacher.classGroups.map(cg => (
                      <tr key={cg.id} className="border-t border-border">
                        <td className="p-3"><Link href={`/${locale}/class-groups/${cg.id}`} className="text-primary hover:underline">{cg.name}</Link></td>
                        <td className="p-3 max-sm:hidden">{cg.course.name} ({cg.course.language.name} - {cg.course.level.name})</td>
                        <td className="p-3 max-sm:hidden">
                          {cg.timeSlots.length > 0 ? cg.timeSlots.map(ts => ts.timeSlot.name).join(", ") : "—"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${cg.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                            {cg.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {teacher.payouts.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Payout History ({teacher.payouts.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacher.payouts.map(p => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="p-3">DA {p.amount.toFixed(2)}</td>
                        <td className="p-3">{p.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
