"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Certificate {
  id: string; certificateNumber: string; issueDate: string; expirationDate: string; status: string;
  level: { name: string; language: { name: string } };
}
interface Attendance { id: string; date: string; status: string }
interface Grade { id: string; score: number; exam: { name: string; maxScore: number } }
interface TimeSlotBrief { id: string; name: string; nameAr: string | null; days: string; startTime: string; endTime: string }
interface ClassGroupTimeSlot { id: string; timeSlot: TimeSlotBrief }
interface Enrollment {
  id: string; status: string; enrolledAt: string;
  classGroup: { name: string; startDate: string | null; endDate: string | null; course: { name: string; language: { name: string }; level: { name: string } }; teacher: { user: { name: string } }; timeSlots: ClassGroupTimeSlot[] };
  attendances: Attendance[]; grades: Grade[];
}
interface StudentProfile {
  user: { id: string; name: string; email: string; phone: string | null };
  dateOfBirth: string | null; birthPlace: string | null; nationalId: string | null; emergencyContact: string | null;
  guardianName: string | null; guardianPhone: string | null;
  photo: string | null; phone2: string | null; bloodType: string | null;
  fatherName: string | null; fatherPhone: string | null;
  status: string | null; faculty: string | null; university: string | null;
  doctorType: string | null; sector: string | null; establishment: string | null;
  enrollments: Enrollment[]; certificates: Certificate[];
}

interface ClassGroup {
  id: string; name: string; isActive: boolean;
  course: { name: string; language: { name: string }; level: { name: string } };
  timeSlots: ClassGroupTimeSlot[];
}
interface TeacherProfile {
  id: string; specialization: string | null; hireDate: string | null; hourlyRate: number; photo: string | null;
  department: { id: string; name: string; nameAr: string | null } | null;
  user: { id: string; name: string; email: string; phone: string | null };
  classGroups: ClassGroup[];
}

const DAY_NAMES: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };

export default function ProfilePage() {
  const t = useTranslations("enroll");
  const ct = useTranslations("common");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadStudent() {
    const res = await fetch("/api/students/profile");
    if (!res.ok) { router.push(`/${locale}/login`); return }
    const data = await res.json();
    setStudentProfile(data.profile);
    const p = data.profile;
    setForm({
      name: p.user.name || "", email: p.user.email || "", phone: p.user.phone || "",
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.substring(0, 10) : "",
      birthPlace: p.birthPlace || "",
      nationalId: p.nationalId || "", emergencyContact: p.emergencyContact || "",
      guardianName: p.guardianName || "", guardianPhone: p.guardianPhone || "",
      photo: p.photo || "", phone2: p.phone2 || "", bloodType: p.bloodType || "",
      fatherName: p.fatherName || "", fatherPhone: p.fatherPhone || "",
      status: p.status || "", faculty: p.faculty || "", university: p.university || "",
      doctorType: p.doctorType || "", sector: p.sector || "", establishment: p.establishment || "",
    });
  }

  async function loadTeacher() {
    const res = await fetch("/api/teachers/profile");
    if (!res.ok) { router.push(`/${locale}/login`); return }
    const data = await res.json();
    setTeacherProfile(data.profile);
    const p = data.profile;
    setForm({
      name: p.user.name || "", email: p.user.email || "", phone: p.user.phone || "",
      specialization: p.specialization || "", hourlyRate: String(p.hourlyRate),
      hireDate: p.hireDate ? p.hireDate.substring(0, 10) : "", photo: p.photo || "",
    });
  }

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (!data.user) { router.push(`/${locale}/login`); return }
      setRole(data.user.role);
      if (data.user.role === "Student") loadStudent();
      else if (data.user.role === "Teacher") loadTeacher();
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, string> = {};
    for (const [key, val] of Object.entries(form)) {
      if (val) body[key] = val;
      else body[key] = "";
    }
    const endpoint = role === "Teacher" ? "/api/teachers/profile" : "/api/students/profile";
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Profile updated successfully" });
      setEdit(false);
      if (role === "Teacher") loadTeacher(); else loadStudent();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to update profile" });
    }
  }

  function daysUntilExpiry(date: string): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  /** ID card is granted only by a validated enrollment whose course period covers today. */
  function idCardState() {
    if (!studentProfile) return { active: [] as Enrollment[], pendingCount: 0, validUntil: null as string | null };
    const now = Date.now();
    const active = studentProfile.enrollments.filter(e => {
      if (e.status !== "Active") return false;
      const s = e.classGroup.startDate ? new Date(e.classGroup.startDate).getTime() : null;
      const en = e.classGroup.endDate ? new Date(e.classGroup.endDate).getTime() : null;
      return (s === null || now >= s) && (en === null || now <= en);
    });
    const pendingCount = studentProfile.enrollments.filter(e => e.status === "Pending").length;
    const dates = active.map(e => e.classGroup.endDate).filter((d): d is string => !!d).sort();
    return { active, pendingCount, validUntil: dates.length ? dates[dates.length - 1] : null };
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800", Pending: "bg-yellow-100 text-yellow-800",
      Completed: "bg-blue-100 text-blue-800", Dropped: "bg-gray-100 text-gray-800",
      Valid: "bg-green-100 text-green-800", Expired: "bg-red-100 text-red-800",
      Revoked: "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || "bg-gray-100 text-gray-800"}`}>{status}</span>;
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

  if (!role) return <p className="text-muted-foreground">{ct("loading")}</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">My Profile</h2>
          <button onClick={() => { setEdit(!edit); setMessage(null) }}
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">
            {edit ? "Cancel" : "Edit"}
          </button>
        </div>

        {role === "Teacher" ? renderTeacherForm() : renderStudentForm()}
      </div>

      {role === "Student" && studentProfile && renderStudentSections()}
      {role === "Teacher" && teacherProfile && renderTeacherSections()}

      {role === "Student" && (
        <div className="text-center">
          <button onClick={() => router.push(`/${locale}/enroll`)}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90">
            {t("enrollButton")}
          </button>
        </div>
      )}
    </div>
  );

  function renderTeacherForm() {
    if (edit) {
      return (
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
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      );
    }
    if (!teacherProfile) return null;
    const deptName = teacherProfile.department
      ? (locale === "ar" && teacherProfile.department.nameAr ? teacherProfile.department.nameAr : teacherProfile.department.name)
      : null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          {teacherProfile.photo
            ? <img src={teacherProfile.photo} alt="" className="h-16 w-16 rounded-full object-cover border" />
            : <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                {teacherProfile.user.name.charAt(0).toUpperCase()}
              </div>
          }
          <div>
            <h3 className="text-lg font-semibold">{teacherProfile.user.name}</h3>
            <span className="text-sm text-muted-foreground">{deptName || teacherProfile.specialization || "Teacher"}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{teacherProfile.user.email}</span></div>
          <div><span className="text-muted-foreground">Phone:</span> {teacherProfile.user.phone || "—"}</div>
          <div><span className="text-muted-foreground">Department:</span> {deptName || "—"}</div>
          <div><span className="text-muted-foreground">Specialization:</span> {teacherProfile.specialization || "—"}</div>
          <div><span className="text-muted-foreground">Hourly Rate:</span> DA {teacherProfile.hourlyRate.toFixed(2)}</div>
          <div><span className="text-muted-foreground">Hire Date:</span> {teacherProfile.hireDate ? new Date(teacherProfile.hireDate).toLocaleDateString() : "—"}</div>
        </div>
      </div>
    );
  }

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

  function renderStudentForm() {
    if (edit) {
      return (
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
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <option key={t} value={t}>{t}</option>)}
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

          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      );
    }
    if (!studentProfile) return null;
    return (
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{studentProfile.user.name}</span></div>
        <div><span className="text-muted-foreground">Email:</span> {studentProfile.user.email}</div>
        <div><span className="text-muted-foreground">Phone:</span> {studentProfile.user.phone || "—"}</div>
            <div><span className="text-muted-foreground">Date of Birth:</span> {studentProfile.dateOfBirth ? new Date(studentProfile.dateOfBirth).toLocaleDateString() : "—"}</div>
            <div><span className="text-muted-foreground">Birth Place:</span> {studentProfile.birthPlace || "—"}</div>
            <div><span className="text-muted-foreground">National ID:</span> {studentProfile.nationalId || "—"}</div>
        <div><span className="text-muted-foreground">Emergency Contact:</span> {studentProfile.emergencyContact || "—"}</div>
        <div><span className="text-muted-foreground">Guardian:</span> {studentProfile.guardianName ? `${studentProfile.guardianName} (${studentProfile.guardianPhone || "—"})` : "—"}</div>
        <div className="sm:col-span-2 border-t border-border pt-3 mt-3">
          <h3 className="font-semibold text-sm mb-2">Additional Info</h3>
        </div>
        {studentProfile.photo && <div><span className="text-muted-foreground">Photo:</span> <img src={studentProfile.photo} alt="" className="inline h-10 w-10 rounded-full object-cover ml-1" /></div>}
        <div><span className="text-muted-foreground">Secondary Phone:</span> {studentProfile.phone2 || "—"}</div>
        <div><span className="text-muted-foreground">Blood Type:</span> {studentProfile.bloodType || "—"}</div>
        <div><span className="text-muted-foreground">Father Name:</span> {studentProfile.fatherName || "—"}</div>
        <div><span className="text-muted-foreground">Father Phone:</span> {studentProfile.fatherPhone || "—"}</div>
        <div className="sm:col-span-2 border-t border-border pt-3 mt-3">
          <h3 className="font-semibold text-sm mb-2">Statut</h3>
        </div>
        <div><span className="text-muted-foreground">Statut:</span> {studentProfile.status || "—"}</div>
        {(studentProfile.status === "Étudiant Interne" || studentProfile.status === "Enseignant Universitaire" || studentProfile.status === "Administratif") && (
          <div><span className="text-muted-foreground">Faculté:</span> {(() => {
            const f = FACULTIES.find(f => f.value === studentProfile.faculty);
            return f ? (locale === "ar" ? f.labelAr : f.labelFr) : (studentProfile.faculty || "—");
          })()}</div>
        )}
        {studentProfile.status === "Étudiant Externe" && (
          <div><span className="text-muted-foreground">Université:</span> {studentProfile.university || "—"}</div>
        )}
        {studentProfile.status === "Médecin" && (
          <>
            <div><span className="text-muted-foreground">Type:</span> {studentProfile.doctorType || "—"}</div>
            <div><span className="text-muted-foreground">Secteur:</span> {studentProfile.sector || "—"}</div>
            {studentProfile.sector === "Public" && (
              <div className="sm:col-span-2"><span className="text-muted-foreground">Établissement:</span> {studentProfile.establishment || "—"}</div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderStudentSections() {
    if (!studentProfile) return null;
    const card = idCardState();
    return (
      <>
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3">My ID Card</h2>
          {card.active.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Available for {card.active.length} validated course{card.active.length > 1 ? "s" : ""}
                {card.validUntil ? ` — valid until ${new Date(card.validUntil).toLocaleDateString()}` : ""}.
              </p>
              <Link href={`/${locale}/id-card`}
                className="inline-block px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                View &amp; Print ID Card
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {card.pendingCount > 0
                ? `Your ID card unlocks once your ${card.pendingCount} pending enrollment${card.pendingCount > 1 ? "s are" : " is"} validated.`
                : "Your ID card unlocks once an enrollment is validated and its course period starts."}
            </p>
          )}
        </div>

        {studentProfile.certificates.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">My Certificates</h2>
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
                  {studentProfile.certificates.map((cert) => {
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

        {studentProfile.enrollments.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">My Enrollments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3">Course</th>
                    <th className="text-left py-2 px-3">Class Group</th>
                    <th className="text-left py-2 px-3 max-sm:hidden">Teacher</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3 max-sm:hidden">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {studentProfile.enrollments.map((enr) => (
                    <tr key={enr.id} className="border-b border-border">
                      <td className="py-2 px-3">{enr.classGroup.course.name}</td>
                      <td className="py-2 px-3">{enr.classGroup.name}</td>
                      <td className="py-2 px-3 max-sm:hidden text-xs">{enr.classGroup.teacher?.user?.name || "—"}</td>
                      <td className="py-2 px-3">{statusBadge(enr.status)}</td>
                      <td className="py-2 px-3 max-sm:hidden text-xs">{new Date(enr.enrolledAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {studentProfile.enrollments.filter(e => e.attendances.length > 0).length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Attendance</h3>
                {studentProfile.enrollments.filter(e => e.attendances.length > 0).map(enr => (
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

            {studentProfile.enrollments.filter(e => e.grades.length > 0).length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Grades</h3>
                {studentProfile.enrollments.filter(e => e.grades.length > 0).map(enr => (
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
          </div>
        )}
      </>
    );
  }

  function renderTeacherSections() {
    if (!teacherProfile) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">My Class Groups ({teacherProfile.classGroups.length})</h2>
        {teacherProfile.classGroups.length === 0 ? (
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
                {teacherProfile.classGroups.map(cg => (
                  <tr key={cg.id} className="border-t border-border">
                    <td className="p-3 font-medium">{cg.name}</td>
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
    );
  }
}
