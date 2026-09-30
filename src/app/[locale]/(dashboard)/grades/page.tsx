"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface ClassGroup {
  id: string; name: string;
  course: { name: string };
}
interface Exam {
  id: string; name: string; maxScore: number; date: string | null;
  _count?: { grades: number };
}
interface Grade {
  id: string; score: number;
  enrollment: { id: string; student: { user: { name: string } } };
  exam: { id: string; name: string; maxScore: number };
}

export default function GradesPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [role, setRole] = useState("");
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showNewExam, setShowNewExam] = useState(false);
  const [newExam, setNewExam] = useState({ name: "", maxScore: "100", date: "" });

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
        setClassGroups((data.profile?.classGroups || []).map((g: { id: string; name: string; course: { name: string } }) => g));
      });
    } else {
      fetch("/api/classgroups").then(r => r.json()).then(d => {
        setClassGroups((d.groups || []).map((g: { id: string; name: string; course: { name: string } }) => g));
      });
    }
  }, [role]);

  useEffect(() => {
    if (!selectedGroup) { setExams([]); setSelectedExam(""); return; }
    fetch(`/api/exams?classGroupId=${selectedGroup}`).then(r => r.json()).then(d => {
      setExams(d.exams || []);
    });
    // Load student names for this group
    fetch(`/api/students?classGroupId=${selectedGroup}`).then(r => r.json()).then(d => {
      const names: Record<string, string> = {};
      (d.students || []).forEach((s: { enrollments: { id: string }[]; user: { name: string } }) => {
        s.enrollments?.forEach((e: { id: string }) => { names[e.id] = s.user.name; });
      });
      setStudentNames(names);
    });
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedExam) { setGrades([]); return; }
    setLoading(true);
    fetch(`/api/grades?examId=${selectedExam}`)
      .then(r => r.json())
      .then(d => {
        const gs = d.grades || [];
        setGrades(gs);
        const inputs: Record<string, string> = { ...gradeInputs };
        gs.forEach((g: Grade) => { inputs[g.enrollment.id] = String(g.score); });
        setGradeInputs(inputs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedExam]);

  async function createExam() {
    if (!newExam.name) return;
    setSaving(true);
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classGroupId: selectedGroup,
        name: newExam.name,
        maxScore: parseFloat(newExam.maxScore) || 100,
        date: newExam.date || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Exam created" });
      setShowNewExam(false);
      setNewExam({ name: "", maxScore: "100", date: "" });
      fetch(`/api/exams?classGroupId=${selectedGroup}`).then(r => r.json()).then(d => setExams(d.exams || []));
    } else {
      const d = await res.json();
      setMessage({ type: "error", text: d.error || "Failed to create exam" });
    }
  }

  async function saveGrade(enrollmentId: string, examId: string) {
    const score = parseFloat(gradeInputs[enrollmentId]);
    if (isNaN(score)) return;
    setSaving(true);
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, examId, score }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Grade saved" });
      fetch(`/api/grades?examId=${selectedExam}`).then(r => r.json()).then(d => {
        setGrades(d.grades || []);
      });
    } else {
      const d = await res.json();
      setMessage({ type: "error", text: d.error || "Failed to save grade" });
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Grades</h1>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid sm:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium mb-1">Exam</label>
            <div className="flex gap-2">
              <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} disabled={!selectedGroup}
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm disabled:opacity-50">
                <option value="">Select...</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e._count?.grades || 0} graded)</option>
                ))}
              </select>
              {selectedGroup && (
                <button onClick={() => setShowNewExam(true)}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 whitespace-nowrap">
                  + New Exam
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewExam && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-semibold">Create New Exam</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Exam Name</label>
              <input value={newExam.name} onChange={e => setNewExam({ ...newExam, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" placeholder="e.g. Midterm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Score</label>
              <input type="number" step="0.5" value={newExam.maxScore}
                onChange={e => setNewExam({ ...newExam, maxScore: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={newExam.date}
                onChange={e => setNewExam({ ...newExam, date: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewExam(false)}
              className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">Cancel</button>
            <button onClick={createExam} disabled={saving || !newExam.name}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? "Creating..." : "Create Exam"}
            </button>
          </div>
        </div>
      )}

      {selectedExam && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-4">
            Grades for {exams.find(e => e.id === selectedExam)?.name || selectedExam}
          </h3>

          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : Object.keys(gradeInputs).length === 0 && grades.length === 0 ? (
            <p className="text-muted-foreground text-sm">No students enrolled in this group.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Student</th>
                    <th className="text-left p-3 font-medium">Score</th>
                    <th className="text-left p-3 font-medium">Max</th>
                    <th className="text-center p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gradeInputs).map(([enrollmentId, score]) => {
                    const existingGrade = grades.find(g => g.enrollment.id === enrollmentId);
                    const studentName = existingGrade?.enrollment.student.user.name
                      || studentNames[enrollmentId]
                      || "Student";
                    const examMax = exams.find(e => e.id === selectedExam)?.maxScore || 100;
                    return (
                      <tr key={enrollmentId} className="border-t border-border">
                        <td className="p-3 font-medium">{studentName}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.5"
                            max={examMax}
                            value={score}
                            onChange={e => setGradeInputs(prev => ({ ...prev, [enrollmentId]: e.target.value }))}
                            className="w-24 px-2 py-1 rounded border border-border bg-background text-sm"
                            placeholder="Score"
                          />
                        </td>
                        <td className="p-3 text-muted-foreground">{examMax}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => saveGrade(enrollmentId, selectedExam)}
                            disabled={saving || !score}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:opacity-90 disabled:opacity-50">
                            {saving ? "..." : existingGrade ? "Update" : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
