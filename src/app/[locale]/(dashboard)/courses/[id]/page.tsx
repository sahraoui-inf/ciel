"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Level { id: string; name: string; departmentId: string | null }
interface Department { id: string; name: string; nameAr: string | null }
interface TimeSlotBrief { id: string; name: string; nameAr: string | null; days: string; startTime: string; endTime: string }
interface ClassGroupTimeSlot { id: string; timeSlot: TimeSlotBrief }
interface TeacherBrief { user: { name: string } }
interface ClassGroup {
  id: string; name: string; teacherId: string; room: string | null;
  maxCapacity: number; startDate: string | null; endDate: string | null;
  isActive: boolean;
  teacher: TeacherBrief | null; timeSlots: ClassGroupTimeSlot[];
  _count: { enrollments: number };
}
interface Course {
  id: string; name: string; code: string; description: string | null;
  maxStudents: number; registrationOpen: boolean;
  registrationStart: string | null; registrationEnd: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
  level: Level; department: Department | null;
  classGroups: ClassGroup[];
}

interface TeacherOption { id: string; name: string }
interface TimeSlotOption { id: string; name: string; nameAr: string | null; days: string; startTime: string; endTime: string; isActive: boolean }

const DAY_NAMES: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };

function formatSlot(s: TimeSlotBrief) {
  const days = s.days.split(",").map(d => DAY_NAMES[d.trim()] || `Day ${d}`).join(",");
  return `${s.name} (${days} ${s.startTime}-${s.endTime})`;
}

export default function CourseDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [levels, setLevels] = useState<Level[]>([]);
  const [filteredLevels, setFilteredLevels] = useState<Level[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotOption[]>([]);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: "", teacherId: "", room: "", maxCapacity: "30",
    startDate: "", endDate: "", isActive: "true",
  });
  const [selectedTimeSlotIds, setSelectedTimeSlotIds] = useState<string[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/courses/${id}`);
    if (!res.ok) { router.push(`/${locale}/courses`); return }
    const data = await res.json();
    setCourse(data.course);
    const c = data.course;
    setForm({
      name: c.name || "", code: c.code || "", description: c.description || "",
      levelId: c.level.id,
      departmentId: c.department?.id || "",
      maxStudents: String(c.maxStudents || 0),
      registrationOpen: c.registrationOpen ? "true" : "false",
      registrationStart: c.registrationStart ? c.registrationStart.substring(0, 16) : "",
      registrationEnd: c.registrationEnd ? c.registrationEnd.substring(0, 16) : "",
      isActive: c.isActive ? "true" : "false",
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

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
    fetch("/api/teachers").then(r => r.json()).then(d => {
      if (d.teachers) setTeachers(d.teachers.map((t: { id: string; user: { name: string } }) => ({ id: t.id, name: t.user.name })));
    });
    fetch("/api/timeslots").then(r => r.json()).then(d => setTimeSlots(d.timeSlots?.filter((s: TimeSlotOption) => s.isActive) || []));
  }, []);

  useEffect(() => {
    if (form.departmentId) {
      setFilteredLevels(levels.filter(l => l.departmentId === form.departmentId));
      if (course && course.department?.id !== form.departmentId) {
        setForm(prev => ({ ...prev, levelId: "" }));
      }
    } else {
      setFilteredLevels(levels);
    }
  }, [form.departmentId, levels]);

  function toggleTimeSlot(tsId: string) {
    setSelectedTimeSlotIds(prev => prev.includes(tsId) ? prev.filter(x => x !== tsId) : [...prev, tsId]);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = {
      name: form.name, code: form.code, description: form.description,
      levelId: form.levelId,
      departmentId: form.departmentId || null,
      maxStudents: parseInt(form.maxStudents) || 0,
      registrationOpen: form.registrationOpen === "true",
      registrationStart: form.registrationStart || null,
      registrationEnd: form.registrationEnd || null,
      isActive: form.isActive === "true",
    };
    const res = await fetch(`/api/courses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Course updated successfully" });
      setEdit(false);
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to update course" });
    }
  }

  function resetGroupForm() {
    setGroupForm({ name: "", teacherId: "", room: "", maxCapacity: "30", startDate: "", endDate: "", isActive: "true" });
    setSelectedTimeSlotIds([]);
    setEditGroupId(null);
    setShowGroupForm(false);
  }

  function openEditGroup(g: ClassGroup) {
    setGroupForm({
      name: g.name, teacherId: g.teacherId, room: g.room || "",
      maxCapacity: String(g.maxCapacity), startDate: g.startDate ? g.startDate.substring(0, 10) : "",
      endDate: g.endDate ? g.endDate.substring(0, 10) : "", isActive: g.isActive ? "true" : "false",
    });
    setSelectedTimeSlotIds(g.timeSlots.map(ts => ts.timeSlot.id));
    setEditGroupId(g.id);
    setShowGroupForm(true);
  }

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault();
    setGroupSaving(true);
    const url = editGroupId ? `/api/classgroups/${editGroupId}` : "/api/classgroups";
    const method = editGroupId ? "PUT" : "POST";
    const body = {
      courseId: id,
      name: groupForm.name,
      teacherId: groupForm.teacherId,
      room: groupForm.room || null,
      maxCapacity: parseInt(groupForm.maxCapacity) || 30,
      startDate: groupForm.startDate || null,
      endDate: groupForm.endDate || null,
      isActive: groupForm.isActive === "true",
      timeSlotIds: selectedTimeSlotIds,
    };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setGroupSaving(false);
    if (res.ok) {
      resetGroupForm();
      load();
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("Delete this class group?")) return;
    const res = await fetch(`/api/classgroups/${groupId}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!course) return <p className="text-muted-foreground">Course not found</p>;

  const now = new Date();
  const registrationActive = course.registrationOpen &&
    (!course.registrationStart || now >= new Date(course.registrationStart)) &&
    (!course.registrationEnd || now <= new Date(course.registrationEnd));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-2">
        <Link href={`/${locale}/courses`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Courses</Link>
        <button onClick={() => { setEdit(!edit); setMessage(null) }}
          className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">
          {edit ? "Cancel" : "Edit Course"}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h2 className="text-xl font-semibold">{course.name}</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs ${course.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
            {course.isActive ? "Active" : "Inactive"}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${registrationActive ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}`}>
            {registrationActive ? "Registration Open" : "Registration Closed"}
          </span>
        </div>

        {edit ? (
          <form onSubmit={save} className="space-y-4">
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
                <label className="block text-sm font-medium mb-1">Level</label>
                <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                  <option value="">Select level</option>
                  {filteredLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Course Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Students</label>
                <input type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: e.target.value })}
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
              <div className="sm:col-span-2 border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Registration Window</h3>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Registration Open</label>
                <select value={form.registrationOpen} onChange={e => setForm({ ...form, registrationOpen: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div></div>
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
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} />
            </div>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Code:</span> <span className="font-mono">{course.code}</span></div>
            <div><span className="text-muted-foreground">Department:</span> {course.department ? (locale === "ar" && course.department.nameAr ? course.department.nameAr : course.department.name) : "—"}</div>
            <div><span className="text-muted-foreground">Level:</span> {course.level.name}</div>
            <div><span className="text-muted-foreground">Max Students:</span> {course.maxStudents}</div>
            <div><span className="text-muted-foreground">Registration:</span>
              <span className={registrationActive ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                {registrationActive ? "Open" : "Closed"}
              </span>
            </div>
            <div><span className="text-muted-foreground">Start Date:</span> {formatDate(course.registrationStart)}</div>
            <div><span className="text-muted-foreground">End Date:</span> {formatDate(course.registrationEnd)}</div>
            <div><span className="text-muted-foreground">Created:</span> {new Date(course.createdAt).toLocaleDateString()}</div>
            {course.description && <div className="sm:col-span-2"><span className="text-muted-foreground">Description:</span> {course.description}</div>}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Class Groups ({course.classGroups.length})</h2>
          {!showGroupForm && (
            <button onClick={() => { resetGroupForm(); setShowGroupForm(true) }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
              + Add Group
            </button>
          )}
        </div>

        {showGroupForm && (
          <form onSubmit={saveGroup} className="mb-6 p-4 border border-border rounded-md bg-muted/30 space-y-3">
            <h3 className="font-semibold text-sm">{editGroupId ? "Edit Class Group" : "New Class Group"}</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Group Name</label>
                <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Teacher</label>
                <select value={groupForm.teacherId} onChange={e => setGroupForm({ ...groupForm, teacherId: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" required>
                  <option value="">Select teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Room</label>
                <input value={groupForm.room} onChange={e => setGroupForm({ ...groupForm, room: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Max Capacity</label>
                <input type="number" value={groupForm.maxCapacity} onChange={e => setGroupForm({ ...groupForm, maxCapacity: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Start Date</label>
                <input type="date" value={groupForm.startDate} onChange={e => setGroupForm({ ...groupForm, startDate: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <input type="date" value={groupForm.endDate} onChange={e => setGroupForm({ ...groupForm, endDate: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select value={groupForm.isActive} onChange={e => setGroupForm({ ...groupForm, isActive: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {/* Time Slot multi-select */}
            <div>
              <label className="block text-xs font-medium mb-2">Time Slots</label>
              <div className="flex flex-wrap gap-2">
                {timeSlots.map(ts => (
                  <button key={ts.id} type="button" onClick={() => toggleTimeSlot(ts.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border ${selectedTimeSlotIds.includes(ts.id) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"}`}>
                    {ts.name}
                    {ts.nameAr && <span className="ml-1 opacity-70">({ts.nameAr})</span>}
                  </button>
                ))}
              </div>
              {timeSlots.length === 0 && <p className="text-xs text-muted-foreground mt-1">No time slots available. Create them first in Time Slots management.</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={groupSaving}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:opacity-90 disabled:opacity-50">
                {groupSaving ? "Saving..." : editGroupId ? "Update Group" : "Create Group"}
              </button>
              <button type="button" onClick={resetGroupForm}
                className="px-4 py-1.5 border border-border rounded text-sm text-muted-foreground hover:bg-accent">
                Cancel
              </button>
            </div>
          </form>
        )}

        {course.classGroups.length === 0 ? (
          <p className="text-muted-foreground text-sm">No class groups</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3 max-sm:hidden">Teacher</th>
                  <th className="text-left py-2 px-3 max-sm:hidden">Room</th>
                  <th className="text-left py-2 px-3">Students</th>
                  <th className="text-left py-2 px-3 max-sm:hidden">Time Slots</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {course.classGroups.map(g => (
                  <tr key={g.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{g.name}</td>
                    <td className="py-2 px-3 max-sm:hidden">{g.teacher?.user?.name || "—"}</td>
                    <td className="py-2 px-3 max-sm:hidden">{g.room || "—"}</td>
                    <td className="py-2 px-3">{g._count?.enrollments ?? 0}/{g.maxCapacity}</td>
                    <td className="py-2 px-3 max-sm:hidden text-xs">
                      {g.timeSlots.map(ts => ts.timeSlot.name).join(", ") || "—"}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${g.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                        {g.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditGroup(g)}
                          className="text-xs text-primary hover:underline">Edit</button>
                        <button onClick={() => deleteGroup(g.id)}
                          className="text-xs text-red-600 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
