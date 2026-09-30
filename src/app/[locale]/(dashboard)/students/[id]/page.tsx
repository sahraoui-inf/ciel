"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReceiptViewer from "@/components/shared/ReceiptViewer";

interface Certificate {
  id: string; certificateNumber: string; issueDate: string; expirationDate: string; status: string;
  level: { name: string; language: { name: string } };
}
interface Attendance { id: string; date: string; status: string }
interface Grade { id: string; score: number; exam: { id: string; name: string; maxScore: number } }
interface Enrollment {
  id: string; status: string; enrolledAt: string; isConfirmedByTeacher: boolean; teacherNotes: string | null; paymentProofUrl: string | null;
  classGroup: { id: string; name: string; course: { name: string; language?: { name: string }; level?: { name: string } }; teacher: { user: { name: string } } };
  attendances: Attendance[]; grades: Grade[];
}
interface User { id: string; name: string; email?: string; phone?: string | null; isActive?: boolean }
interface Student {
  id: string;
  user: User;
  dateOfBirth: string | null;
  birthPlace: string | null;
  nationalId?: string | null;
  emergencyContact?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  notes?: string | null;
  photo: string | null;
  phone2?: string | null;
  bloodType?: string | null;
  fatherName?: string | null;
  fatherPhone?: string | null;
  status?: string | null;
  faculty?: string | null;
  university?: string | null;
  doctorType?: string | null;
  sector?: string | null;
  establishment?: string | null;
  enrollments: Enrollment[];
  certificates?: Certificate[];
}

export default function StudentDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const [teacherNotes, setTeacherNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [examsByGroup, setExamsByGroup] = useState<Record<string, { id: string; name: string; maxScore: number }[]>>({});
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [savingGrade, setSavingGrade] = useState<string | null>(null);

  async function load() {
    const me = await fetch("/api/auth/me").then(r => r.json());
    if (!me.user) { router.push(`/${locale}/login`); return }
    setRole(me.user.role);

    setLoading(true);
    const res = await fetch(`/api/students/${id}`);
    if (!res.ok) { router.push(`/${locale}/students`); return }
    const data = await res.json();
    setStudent(data.student);
    const s = data.student;
    setForm({
      name: s.user?.name || "", email: s.user?.email || "", phone: s.user?.phone || "",
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.substring(0, 10) : "",
      birthPlace: s.birthPlace || "",
      nationalId: s.nationalId || "", emergencyContact: s.emergencyContact || "",
      guardianName: s.guardianName || "", guardianPhone: s.guardianPhone || "",
      photo: s.photo || "", phone2: s.phone2 || "", bloodType: s.bloodType || "",
      fatherName: s.fatherName || "", fatherPhone: s.fatherPhone || "",
      notes: s.notes || "",
      status: s.status || "", faculty: s.faculty || "", university: s.university || "",
      doctorType: s.doctorType || "", sector: s.sector || "", establishment: s.establishment || "",
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!student || role !== "Teacher") return;
    student.enrollments.forEach(enr => {
      if (enr.teacherNotes) setTeacherNotes(prev => ({ ...prev, [enr.id]: enr.teacherNotes || "" }));
      loadExamsForGroup(enr.classGroup.id);
    });
  }, [student, role]);

  async function loadExamsForGroup(groupId: string) {
    if (examsByGroup[groupId]) return;
    const res = await fetch(`/api/exams?classGroupId=${groupId}`);
    const data = await res.json();
    setExamsByGroup(prev => ({ ...prev, [groupId]: (data.exams || []).map((e: { id: string; name: string; maxScore: number }) => e) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, string> = {};
    for (const [key, val] of Object.entries(form)) {
      if (val) body[key] = val;
      else body[key] = "";
    }
    const res = await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Student updated successfully" });
      setEdit(false);
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to update student" });
    }
  }

  async function toggleActive() {
    if (!student) return;
    const res = await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: student.user.name, email: student.user.email || "", phone: student.user.phone || "",
        dateOfBirth: student.dateOfBirth || "", birthPlace: student.birthPlace || "",
        nationalId: student.nationalId || "", emergencyContact: student.emergencyContact || "",
        guardianName: student.guardianName || "", guardianPhone: student.guardianPhone || "",
        photo: student.photo || "", phone2: student.phone2 || "", bloodType: student.bloodType || "",
        fatherName: student.fatherName || "", fatherPhone: student.fatherPhone || "",
        notes: student.notes || "",
        status: student.status || "", faculty: student.faculty || "", university: student.university || "",
        doctorType: student.doctorType || "", sector: student.sector || "", establishment: student.establishment || "",
        isActive: !student.user.isActive,
      }),
    });
    if (res.ok) { load(); }
  }

  async function saveTeacherNotes(enrollmentId: string) {
    setSavingNote(enrollmentId);
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherNotes: teacherNotes[enrollmentId] || "" }),
    });
    setSavingNote(null);
    if (res.ok) {
      setMessage({ type: "success", text: "Notes saved" });
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to save notes" });
    }
  }

  async function toggleCertConfirm(enrollmentId: string, currentValue: boolean) {
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isConfirmedByTeacher: !currentValue }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: !currentValue ? "Certificate confirmed" : "Certificate confirmation withdrawn" });
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Operation failed" });
    }
  }

  async function saveGrade(enrollmentId: string, examId: string) {
    const score = parseFloat(gradeValues[`${enrollmentId}:${examId}`]);
    if (isNaN(score)) return;
    setSavingGrade(`${enrollmentId}:${examId}`);
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, examId, score }),
    });
    setSavingGrade(null);
    if (res.ok) {
      setMessage({ type: "success", text: "Grade saved" });
      setGradeValues(prev => ({ ...prev, [`${enrollmentId}:${examId}`]: "" }));
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to save grade" });
    }
  }

  function daysUntilExpiry(date: string): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Dropped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      Valid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Revoked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Present: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Absent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Late: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Excused: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const FACULTIES = [
    { value: "FS", labelFr: "Faculté des Sciences", labelAr: "كلية العلوم" },
    { value: "FT", labelFr: "Faculté de Technologie", labelAr: "كلية التكنولوجيا" },
    { value: "FM", labelFr: "Faculté de Médecine", labelAr: "كلية الطب" },
    { value: "LLA", labelFr: "Faculté des Lettres et des Langues", labelAr: "كلية الآداب واللغات" },
    { value: "SEG", labelFr: "Faculté des Sciences Économiques, Commerciales et des Sciences de Gestion", labelAr: "كلية العلوم الاقتصادية والتجارية وعلوم التسيير" },
    { value: "DSP", labelFr: "Faculté de Droit et des Sciences Politiques", labelAr: "كلية الحقوق والعلوم السياسية" },
    { value: "FSHS", labelFr: "Faculté des Sciences Humaines et Sociales", labelAr: "كلية العلوم الإنسانية والاجتماعية" },
    { value: "SNV", labelFr: "Faculté des Sciences de la Nature et de la Vie", labelAr: "كلية علوم الطبيعة والحياة وعلوم الأرض والكون" },
    { value: "ISTA", labelFr: "Institut des Sciences et Techniques Appliquées", labelAr: "معهد العلوم والتقنيات التطبيقية" },
  ];

  function renderStatusFields() {
    const status = form.status;
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Statut</label>
          <select value={form.status} onChange={e => {
            setForm({ ...form, status: e.target.value, faculty: "", university: "", doctorType: "", sector: "", establishment: "" });
          }} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
            <option value="">Sélectionner...</option>
            <option value="Étudiant Interne">Étudiant Interne</option>
            <option value="Enseignant Universitaire">Enseignant Universitaire</option>
            <option value="Administratif">Administratif</option>
            <option value="Étudiant Externe">Étudiant Externe</option>
            <option value="Médecin">Médecin</option>
          </select>
        </div>

        {(status === "Étudiant Interne" || status === "Enseignant Universitaire" || status === "Administratif") && (
          <div>
            <label className="block text-sm font-medium mb-1">Quelle Faculté ? <span className="text-destructive">*</span></label>
            <select value={form.faculty} onChange={e => setForm({ ...form, faculty: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
              <option value="">Sélectionner...</option>
              {FACULTIES.map(f => <option key={f.value} value={f.value}>{locale === "ar" ? f.labelAr : f.labelFr}</option>)}
            </select>
          </div>
        )}

        {status === "Étudiant Externe" && (
          <div>
            <label className="block text-sm font-medium mb-1">Quelle Université ? <span className="text-destructive">*</span></label>
            <input value={form.university} onChange={e => setForm({ ...form, university: e.target.value })}
              placeholder="Nom de l'université"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
        )}

        {status === "Médecin" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type <span className="text-destructive">*</span></label>
              <select value={form.doctorType} onChange={e => setForm({ ...form, doctorType: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="">Sélectionner...</option>
                <option value="Généraliste">Généraliste</option>
                <option value="Spécialiste">Spécialiste</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Secteur <span className="text-destructive">*</span></label>
              <select value={form.sector} onChange={e => {
                setForm({ ...form, sector: e.target.value, establishment: "" });
              }} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="">Sélectionner...</option>
                <option value="Public">Public</option>
                <option value="Privé">Privé</option>
              </select>
            </div>

            {form.sector === "Public" && (
              <div>
                <label className="block text-sm font-medium mb-1">Hôpital ou Centre Médical ? <span className="text-destructive">*</span></label>
                <input value={form.establishment} onChange={e => setForm({ ...form, establishment: e.target.value })}
                  placeholder="Nom de l'établissement"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!student) return <p className="text-muted-foreground">Student not found</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/students`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Students</Link>
        </div>
        {role !== "Teacher" && (
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/students/${id}/id-card`} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">
              ID Card
            </Link>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Profile section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              {student.photo ? (
                <img src={student.photo} alt="" className="h-12 w-12 rounded-full object-cover border" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold">
                  {student.user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">{student.user.name}</h2>
                {role !== "Teacher" && student.user.isActive !== undefined && statusBadge(student.user.isActive ? "Active" : "Inactive")}
              </div>
            </div>
          </div>
          {role !== "Teacher" && (
            <div className="flex items-center gap-2">
              <button onClick={toggleActive}
                className={`px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent ${!student.user.isActive ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                {student.user.isActive ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => { setEdit(!edit); setMessage(null) }}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">
                {edit ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          )}
        </div>

        {role !== "Teacher" && edit ? (
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Birth Place</label>
                <input value={form.birthPlace} onChange={e => setForm({ ...form, birthPlace: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">National ID</label>
                <input value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Emergency Contact</label>
                <input value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guardian Name</label>
                <input value={form.guardianName} onChange={e => setForm({ ...form, guardianName: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guardian Phone</label>
                <input value={form.guardianPhone} onChange={e => setForm({ ...form, guardianPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div className="sm:col-span-2 border-t border-border pt-4">
                <h3 className="font-semibold mb-3">Additional Info</h3>
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
              <div>
                <label className="block text-sm font-medium mb-1">Secondary Phone</label>
                <input value={form.phone2} onChange={e => setForm({ ...form, phone2: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Blood Type</label>
                <select value={form.bloodType} onChange={e => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                  <option value="">Select...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Father Name</label>
                <input value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Father Phone</label>
                <input value={form.fatherPhone} onChange={e => setForm({ ...form, fatherPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3">Statut</h3>
              {renderStatusFields()}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" rows={3} />
            </div>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {role === "Teacher" ? (
              <>
                <div className="col-span-2 flex items-center gap-4 mb-2">
                  {student.photo ? (
                    <img src={student.photo} alt="" className="h-20 w-20 rounded-full object-cover border" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                      {student.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{student.user.name}</span></div>
                <div><span className="text-muted-foreground">Date of Birth:</span> {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—"}</div>
                <div><span className="text-muted-foreground">Place of Birth:</span> {student.birthPlace || "—"}</div>
              </>
            ) : (
              <>
                <div><span className="text-muted-foreground">Email:</span> {student.user.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {student.user.phone || "—"}</div>
                <div><span className="text-muted-foreground">Date of Birth:</span> {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—"}</div>
                <div><span className="text-muted-foreground">Birth Place:</span> {student.birthPlace || "—"}</div>
                <div><span className="text-muted-foreground">National ID:</span> {student.nationalId || "—"}</div>
                <div><span className="text-muted-foreground">Emergency Contact:</span> {student.emergencyContact || "—"}</div>
                <div><span className="text-muted-foreground">Guardian:</span> {student.guardianName ? `${student.guardianName} (${student.guardianPhone || "—"})` : "—"}</div>
                <div className="sm:col-span-2 border-t border-border pt-3 mt-3">
                  <h3 className="font-semibold text-sm mb-2">Additional Info</h3>
                </div>
                {student.photo && <div><span className="text-muted-foreground">Photo:</span> <img src={student.photo} alt="student" className="inline h-10 w-10 rounded-full object-cover ml-1" /></div>}
                <div><span className="text-muted-foreground">Secondary Phone:</span> {student.phone2 || "—"}</div>
                <div><span className="text-muted-foreground">Blood Type:</span> {student.bloodType || "—"}</div>
                <div><span className="text-muted-foreground">Father Name:</span> {student.fatherName || "—"}</div>
                <div><span className="text-muted-foreground">Father Phone:</span> {student.fatherPhone || "—"}</div>
                {student.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notes:</span> {student.notes}</div>}
                <div className="sm:col-span-2 border-t border-border pt-3 mt-3">
                  <h3 className="font-semibold text-sm mb-2">Statut</h3>
                </div>
                <div><span className="text-muted-foreground">Statut:</span> {student.status || "—"}</div>
                {(student.status === "Étudiant Interne" || student.status === "Enseignant Universitaire" || student.status === "Administratif") && (
                  <div><span className="text-muted-foreground">Faculté:</span> {(() => {
                    const f = FACULTIES.find(f => f.value === student.faculty);
                    return f ? (locale === "ar" ? f.labelAr : f.labelFr) : (student.faculty || "—");
                  })()}</div>
                )}
                {student.status === "Étudiant Externe" && (
                  <div><span className="text-muted-foreground">Université:</span> {student.university || "—"}</div>
                )}
                {student.status === "Médecin" && (
                  <>
                    <div><span className="text-muted-foreground">Type:</span> {student.doctorType || "—"}</div>
                    <div><span className="text-muted-foreground">Secteur:</span> {student.sector || "—"}</div>
                    {student.sector === "Public" && (
                      <div className="sm:col-span-2"><span className="text-muted-foreground">Établissement:</span> {student.establishment || "—"}</div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Teacher: Certificates not shown - data privacy */}
      {role !== "Teacher" && student.certificates && student.certificates.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Certificates</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Number</th>
                  <th className="text-left py-2 px-3">Level</th>
                  <th className="text-left py-2 px-3 max-sm:hidden">Issue Date</th>
                  <th className="text-left py-2 px-3">Expiry</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {student.certificates!.map((cert) => {
                  const daysLeft = daysUntilExpiry(cert.expirationDate);
                  return (
                    <tr key={cert.id} className="border-b border-border">
                      <td className="py-2 px-3 font-mono text-xs">{cert.certificateNumber}</td>
                      <td className="py-2 px-3">{cert.level.language.name} — {cert.level.name}</td>
                      <td className="py-2 px-3 max-sm:hidden text-xs">{new Date(cert.issueDate).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-xs">
                        {cert.status === "Valid" ? (
                          daysLeft > 0
                            ? <span className={daysLeft < 30 ? "text-red-600 font-medium" : ""}>{daysLeft} days</span>
                            : <span className="text-red-600">Expired</span>
                        ) : "—"}
                      </td>
                      <td className="py-2 px-3">{statusBadge(cert.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrollments - full view for admin, teacher view with actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Enrollments ({student.enrollments.length})</h2>
        {student.enrollments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No enrollments</p>
        ) : role === "Teacher" ? (
          <div className="space-y-6">
            {student.enrollments.map((enr) => (
              <div key={enr.id} className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{enr.classGroup.course.name} — {enr.classGroup.name}</h3>
                    <p className="text-xs text-muted-foreground">Teacher: {enr.classGroup.teacher?.user?.name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(enr.status)}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${enr.isConfirmedByTeacher ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      Cert: {enr.isConfirmedByTeacher ? "Confirmed" : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Attendance summary */}
                {enr.attendances.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Attendance ({enr.attendances.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {enr.attendances.slice(-5).map(a => (
                        <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                          {new Date(a.date).toLocaleDateString()} {statusBadge(a.status)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grades entry */}
                <div>
                  <p className="text-sm font-medium mb-2">Exams & Grades</p>
                  {!examsByGroup[enr.classGroup.id] ? (
                    <p className="text-xs text-muted-foreground">Loading exams...</p>
                  ) : examsByGroup[enr.classGroup.id]?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No exams created for this group yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1 px-2 text-xs">Exam</th>
                            <th className="text-left py-1 px-2 text-xs">Existing Grade</th>
                            <th className="text-left py-1 px-2 text-xs">Enter Grade</th>
                            <th className="py-1 px-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {examsByGroup[enr.classGroup.id]!.map(exam => {
                            const existingGrade = enr.grades.find(g => g.exam?.id === exam.id);
                            return (
                              <tr key={exam.id} className="border-b border-border">
                                <td className="py-1 px-2 text-xs">{exam.name}</td>
                                <td className="py-1 px-2 text-xs">
                                  {existingGrade
                                    ? <span className="font-medium">{existingGrade.score}/{exam.maxScore}</span>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </td>
                                <td className="py-1 px-2">
                                  <input
                                    type="number"
                                    max={exam.maxScore}
                                    step="0.5"
                                    placeholder={`0-${exam.maxScore}`}
                                    value={gradeValues[`${enr.id}:${exam.id}`] || ""}
                                    onChange={e => setGradeValues(prev => ({ ...prev, [`${enr.id}:${exam.id}`]: e.target.value }))}
                                    className="w-20 px-2 py-1 rounded border border-border bg-background text-xs"
                                  />
                                </td>
                                <td className="py-1 px-2">
                                  <button
                                    onClick={() => saveGrade(enr.id, exam.id)}
                                    disabled={savingGrade === `${enr.id}:${exam.id}` || !gradeValues[`${enr.id}:${exam.id}`]}
                                    className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:opacity-90 disabled:opacity-50">
                                    {savingGrade === `${enr.id}:${exam.id}` ? "..." : "Save"}
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

                {/* Teacher Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Pedagogical Notes</label>
                  <textarea
                    value={teacherNotes[enr.id] || ""}
                    onChange={e => setTeacherNotes(prev => ({ ...prev, [enr.id]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                    rows={2}
                    placeholder="Add your pedagogical observations..."
                  />
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => saveTeacherNotes(enr.id)}
                      disabled={savingNote === enr.id}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:opacity-90 disabled:opacity-50">
                      {savingNote === enr.id ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                </div>

                {/* Certificate confirmation */}
                {(enr.status === "Active" || enr.status === "Completed") && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-medium">Certificate Validation</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleCertConfirm(enr.id, enr.isConfirmedByTeacher)}
                        className={`px-4 py-1.5 rounded text-xs font-medium ${
                          enr.isConfirmedByTeacher
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border border-red-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300"
                        }`}>
                        {enr.isConfirmedByTeacher ? "Withdraw Confirmation" : "Confirm Certificate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3">Course</th>
                    <th className="text-left py-2 px-3">Class Group</th>
                    <th className="text-left py-2 px-3 max-sm:hidden">Teacher</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3 max-sm:hidden">Confirmed</th>
                    <th className="text-left py-2 px-3 max-sm:hidden">Enrolled</th>
                    <th className="text-left py-2 px-3">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {student.enrollments.map((enr) => (
                    <tr key={enr.id} className="border-b border-border">
                      <td className="py-2 px-3">{enr.classGroup.course.name}</td>
                      <td className="py-2 px-3">{enr.classGroup.name}</td>
                      <td className="py-2 px-3 max-sm:hidden text-xs">{enr.classGroup.teacher?.user?.name || "—"}</td>
                      <td className="py-2 px-3">{statusBadge(enr.status)}</td>
                      <td className="py-2 px-3 max-sm:hidden text-xs">{enr.isConfirmedByTeacher ? "Yes" : "No"}</td>
                      <td className="py-2 px-3 max-sm:hidden text-xs">{new Date(enr.enrolledAt).toLocaleDateString()}</td>
                      <td className="py-2 px-3">
                        {enr.paymentProofUrl ? (
                          <button onClick={() => setReceiptUrl(enr.paymentProofUrl)}
                            className="text-primary hover:underline text-xs">View</button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {student.enrollments.filter(e => e.attendances.length > 0).length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Attendance</h3>
                {student.enrollments.filter(e => e.attendances.length > 0).map(enr => (
                  <div key={enr.id} className="mb-4">
                    <p className="text-sm font-medium mb-1">{enr.classGroup.name}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1 px-2">Date</th>
                            <th className="text-left py-1 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enr.attendances.map(att => (
                            <tr key={att.id} className="border-b border-border">
                              <td className="py-1 px-2 text-xs">{new Date(att.date).toLocaleDateString()}</td>
                              <td className="py-1 px-2">{statusBadge(att.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {student.enrollments.filter(e => e.grades.length > 0).length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Grades</h3>
                {student.enrollments.filter(e => e.grades.length > 0).map(enr => (
                  <div key={enr.id} className="mb-4">
                    <p className="text-sm font-medium mb-1">{enr.classGroup.name}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1 px-2">Exam</th>
                            <th className="text-left py-1 px-2">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enr.grades.map(gr => (
                            <tr key={gr.id} className="border-b border-border">
                              <td className="py-1 px-2 text-xs">{gr.exam.name}</td>
                              <td className="py-1 px-2">{gr.score}/{gr.exam.maxScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {receiptUrl && <ReceiptViewer url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
    </div>
  );
}
