"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface ClassGroup {
  id: string; name: string;
  course: { name: string };
}
interface StudentEnrollment {
  id: string;
  student: { id: string; user: { name: string } };
  classGroup: { id: string };
}

export default function AttendancePage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [role, setRole] = useState("");
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [existingRecords, setExistingRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<{ id: string; classGroups: ClassGroup[] } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (!data.user) { router.push(`/${locale}/login`); return }
      setRole(data.user.role);
      if (data.user.role === "Student") { router.push(`/${locale}/dashboard`); return }
    });
  }, []);

  useEffect(() => {
    if (!role || role === "Student") return;
    if (role === "Teacher") {
      fetch("/api/teachers/profile").then(r => r.json()).then(data => {
        setTeacherProfile(data.profile);
        setClassGroups((data.profile?.classGroups || []).map((g: { id: string; name: string; course: { name: string } }) => g));
      });
    } else {
      fetch("/api/classgroups").then(r => r.json()).then(d => {
        setClassGroups((d.groups || []).map((g: { id: string; name: string; course: { name: string } }) => g));
      });
    }
  }, [role]);

  useEffect(() => {
    if (!selectedGroup || !date) return;
    setLoading(true);
    // Load students in this group
    fetch(`/api/students?classGroupId=${selectedGroup}`)
      .then(r => r.json())
      .then(data => {
        const students = data.students || [];
        setEnrollments(students);
        // Check existing attendance for this date + group
        fetch(`/api/attendance?classGroupId=${selectedGroup}&date=${date}`)
          .then(r => r.json())
          .then(attData => {
            const records: Record<string, string> = {};
            (attData.records || []).forEach((r: { enrollmentId: string; status: string }) => {
              records[r.enrollmentId] = r.status;
            });
            setExistingRecords(records);
            setAttendanceMap({ ...records });
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, [selectedGroup, date]);

  async function saveAttendance() {
    setSaving(true);
    setMessage(null);

    const records = Object.entries(attendanceMap).map(([enrollmentId, status]) => ({
      enrollmentId,
      date,
      status,
    }));

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Attendance saved successfully" });
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to save attendance" });
    }
  }

  function setAllStatus(status: string) {
    const map: Record<string, string> = {};
    enrollments.forEach(e => { map[e.id] = status; });
    setAttendanceMap(map);
  }

  const statuses = ["Present", "Absent", "Late", "Excused"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Mark Attendance</h1>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class Group</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
              <option value="">Select...</option>
              {classGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name} — {g.course.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
        </div>

        {enrollments.length > 0 && (
          <div className="flex gap-2 mb-4">
            <span className="text-xs text-muted-foreground self-center">Set all:</span>
            {statuses.map(s => (
              <button key={s} onClick={() => setAllStatus(s)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  s === "Present" ? "border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30" :
                  s === "Absent" ? "border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30" :
                  s === "Late" ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/30" :
                  "border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading students...</p>
      ) : !selectedGroup ? (
        <p className="text-muted-foreground text-sm">Select a class group to mark attendance.</p>
      ) : enrollments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No students enrolled in this group.</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Student</th>
                {statuses.map(s => (
                  <th key={s} className="text-center p-3 font-medium">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrollments.map(enr => (
                <tr key={enr.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-3 font-medium">{enr.student?.user?.name || "Unknown"}</td>
                  {statuses.map(s => (
                    <td key={s} className="text-center p-3">
                      <input
                        type="radio"
                        name={`att-${enr.id}`}
                        checked={(attendanceMap[enr.id] || existingRecords[enr.id] || "Present") === s}
                        onChange={() => setAttendanceMap(prev => ({ ...prev, [enr.id]: s }))}
                        className="accent-primary cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 flex justify-end">
            <button onClick={saveAttendance} disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
