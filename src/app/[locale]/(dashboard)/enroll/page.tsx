"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ReceiptViewer from "@/components/shared/ReceiptViewer";

interface Department { id: string; name: string; nameAr: string | null }
interface Level { id: string; name: string; code: string; order: number }
interface Course { id: string; name: string; description: string | null; registrationOpen: boolean; registrationStart: string | null; registrationEnd: string | null; level: Level }
interface TimeSlotBrief { id: string; name: string; nameAr: string | null; days: string; startTime: string; endTime: string }
interface ClassGroupTimeSlot { id: string; timeSlot: TimeSlotBrief }
interface ClassGroup { id: string; name: string; maxCapacity: number; teacher: { user: { name: string } }; timeSlots: ClassGroupTimeSlot[]; _enrollCount?: number }
interface EnrollmentRecord { id: string; status: string; enrolledAt: string; expiresAt: string | null; paymentProofUrl: string | null; classGroup: { name: string; course: { name: string } } }

const DAY_NAMES: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };

function formatTimeSlots(timeSlots: ClassGroupTimeSlot[]) {
  return timeSlots.map(ts => {
    const s = ts.timeSlot;
    const days = s.days.split(",").map(d => DAY_NAMES[d.trim()] || `Day ${d}`).join(", ");
    return { label: s.name, detail: `${days} ${s.startTime} - ${s.endTime}` };
  });
}

export default function EnrollPage() {
  const t = useTranslations("enroll");
  const ct = useTranslations("common");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [pendingEnrollment, setPendingEnrollment] = useState<EnrollmentRecord | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const FIELD_LABELS: Record<string, string> = {
    dateOfBirth: t("fieldDateOfBirth"),
    status: t("fieldStatus"),
    faculty: t("fieldFaculty"),
    university: t("fieldUniversity"),
    doctorType: t("fieldDoctorType"),
    sector: t("fieldSector"),
    establishment: t("fieldEstablishment"),
  };

  const refreshEnrollments = useCallback(() => {
    fetch("/api/students/enrollments").then(r => r.json()).then(d => {
      const list: EnrollmentRecord[] = d.enrollments || [];
      setEnrollments(list);
      const pend = list.find(e => e.status === "Pending") || null;
      setPendingEnrollment(pend);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments || []));
    refreshEnrollments();
    fetch("/api/students/profile").then(r => {
      if (!r.ok) return null;
      return r.json();
    }).then(data => {
      if (!data?.profile) { setProfileComplete(false); return; }
      const p = data.profile;
      const profileData = {
        dateOfBirth: p.dateOfBirth || null,
        status: p.status || null,
        faculty: p.faculty || null,
        university: p.university || null,
        doctorType: p.doctorType || null,
        sector: p.sector || null,
        establishment: p.establishment || null,
      };
      const hasStatus = !!profileData.status;
      const hasDob = !!profileData.dateOfBirth;
      let statusComplete = false;
      const missing: string[] = [];
      if (hasDob === false) missing.push("dateOfBirth");
      if (!hasStatus) {
        missing.push("status");
        statusComplete = false;
      } else if (["Étudiant Interne", "Enseignant Universitaire", "Administratif"].includes(profileData.status!)) {
        statusComplete = !!profileData.faculty;
        if (!profileData.faculty) missing.push("faculty");
      } else if (profileData.status === "Étudiant Externe") {
        statusComplete = !!profileData.university;
        if (!profileData.university) missing.push("university");
      } else if (profileData.status === "Médecin") {
        const hasDoctorType = !!profileData.doctorType;
        const hasSector = !!profileData.sector;
        const hasEstablishment = profileData.sector === "Public" ? !!profileData.establishment : true;
        statusComplete = hasDoctorType && hasSector && hasEstablishment;
        if (!profileData.doctorType) missing.push("doctorType");
        if (!profileData.sector) missing.push("sector");
        if (profileData.sector === "Public" && !profileData.establishment) missing.push("establishment");
      }
      const complete = hasDob && hasStatus && statusComplete;
      setProfileComplete(complete);
      setMissingFields(missing);
    }).catch(() => setProfileComplete(false));
  }, [refreshEnrollments]);

  useEffect(() => {
    if (!pendingEnrollment?.expiresAt) { setCountdown(null); return; }
    const expiresAt = new Date(pendingEnrollment.expiresAt).getTime();
    const tick = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) { setCountdown("0h 0m"); refreshEnrollments(); return; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setCountdown(t("expiresIn", { hours, minutes }));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [pendingEnrollment, t, refreshEnrollments]);

  useEffect(() => {
    if (!selectedDept) { setCourses([]); setSelectedCourse(""); return }
    fetch(`/api/courses?departmentId=${selectedDept}&isActive=true`).then(r => r.json()).then(d => {
      setCourses(d.courses || []);
    });
  }, [selectedDept]);

  useEffect(() => {
    if (!selectedCourse) { setClassGroups([]); setSelectedGroup(""); return }
    setFetchingGroups(true);
    fetch(`/api/classgroups?courseId=${selectedCourse}`).then(r => r.json()).then(d => {
      const raw = d.groups || [];
      setClassGroups(raw.map((g: Record<string, unknown>) => ({ ...g, _enrollCount: (g as { _count: { enrollments: number } })._count?.enrollments || 0 })) as ClassGroup[]);
      setFetchingGroups(false);
    }).catch(() => setFetchingGroups(false));
  }, [selectedCourse]);

  const now = new Date();
  const selectedCourseData = courses.find(c => c.id === selectedCourse);
  const isRegistrationOpen = selectedCourseData?.registrationOpen &&
    (!selectedCourseData?.registrationStart || now >= new Date(selectedCourseData.registrationStart)) &&
    (!selectedCourseData?.registrationEnd || now <= new Date(selectedCourseData.registrationEnd));

  const canEnroll = selectedGroup && selectedCourse && isRegistrationOpen && !loading && !uploading && !pendingEnrollment && profileComplete === true;

  async function uploadPayment(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  }

  async function handleEnroll() {
    if (!canEnroll) return;
    setLoading(true);
    setMessage(null);

    try {
      let paymentProofUrl: string | null = null;
      if (paymentFile) {
        setUploading(true);
        paymentProofUrl = await uploadPayment(paymentFile);
        setUploading(false);
        if (!paymentProofUrl) {
          setMessage({ type: "error", text: "Failed to upload payment proof" });
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/students/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroupId: selectedGroup,
          departmentId: selectedDept,
          prerequisiteCertNumber: certNumber || undefined,
          paymentProofUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || t("error") });
        return;
      }

      setMessage({ type: "success", text: t("success") });
      setSelectedDept(""); setSelectedCourse(""); setSelectedGroup(""); setCertNumber(""); setPaymentFile(null);
      setCourses([]); setClassGroups([]);
      refreshEnrollments();
    } catch {
      setMessage({ type: "error", text: t("error") });
    } finally {
      setLoading(false);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Dropped: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Expired: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Enrollments table */}
      {enrollments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t("myEnrollments")}</h2>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">{t("courseInfo")}</th>
                  <th className="text-left p-3 font-medium">{t("status")}</th>
                  <th className="text-left p-3 font-medium max-sm:hidden">{t("enrolledOn")}</th>
                  <th className="text-left p-3 font-medium max-sm:hidden">Expiry</th>
                  <th className="text-left p-3 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enr) => (
                  <tr key={enr.id} className="border-t border-border hover:bg-muted/50">
                    <td className="p-3">{enr.classGroup.name} — {enr.classGroup.course.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(enr.status)}`}>
                        {enr.status === "Expired" ? t("expired") : enr.status}
                      </span>
                    </td>
                    <td className="p-3 max-sm:hidden text-xs text-muted-foreground">
                      {new Date(enr.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 max-sm:hidden text-xs text-muted-foreground">
                      {enr.status === "Pending" && enr.expiresAt ? (
                        <CountdownTimer expiresAt={enr.expiresAt} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      {enr.paymentProofUrl ? (
                        <button onClick={() => setReceiptUrl(enr.paymentProofUrl)}
                          className="text-primary hover:underline text-xs">View Receipt</button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending enrollment blocker */}
      {pendingEnrollment && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center space-y-3">
          <div className="text-amber-600 dark:text-amber-400 text-lg font-semibold">{t("pendingExists")}</div>
          <p className="text-sm text-amber-700 dark:text-amber-300">{t("pendingBlockMessage")}</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{countdown || t("expired")}</p>
          <p className="text-xs text-muted-foreground">
            {pendingEnrollment.classGroup.name} — {pendingEnrollment.classGroup.course.name}
          </p>
        </div>
      )}

      {/* Profile incomplete blocker */}
      {profileComplete === false && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center space-y-3">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold">{t("profileIncomplete")}</div>
          <p className="text-sm text-red-700 dark:text-red-300">{t("profileIncompleteMessage")}</p>
          {missingFields.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {missingFields.map(f => (
                <span key={f} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  {FIELD_LABELS[f] || f}
                </span>
              ))}
            </div>
          )}
          <button onClick={() => router.push(`/${locale}/profile`)}
            className="mt-3 px-6 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors">
            {t("completeProfile")}
          </button>
        </div>
      )}

      {/* Enrollment form */}
      {!pendingEnrollment && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t("title")}</h2>

          {message && (
            <div className={`p-4 rounded-md mb-4 text-sm ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
              {message.text}
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-6 space-y-5">
            {/* Department */}
            <div>
              <label className="block text-sm font-medium mb-1">{t("selectDepartment")}</label>
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="">{t("selectOption")}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameAr ? ` (${d.nameAr})` : ""}</option>)}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium mb-1">{t("selectCourse")}</label>
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} disabled={!selectedDept}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm disabled:opacity-50">
                <option value="">{t("selectOption")}</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id} disabled={!c.registrationOpen}>
                    {c.name} {c.level ? `(${c.level.name})` : ""} {c.registrationOpen ? "" : `— ${t("registrationClosed")}`}
                  </option>
                ))}
              </select>
              {selectedDept && courses.length === 0 && <p className="text-xs text-muted-foreground mt-1">{t("noCourses")}</p>}
            </div>

            {/* Registration window info */}
            {selectedCourseData && (
              <div className="p-4 bg-muted rounded-md text-sm space-y-1">
                <p><strong>{t("registrationStatus")}:</strong> {isRegistrationOpen ? (
                  <span className="text-green-600">{t("registrationOpen")}</span>
                ) : (
                  <span className="text-red-600">{t("registrationClosed")}</span>
                )}</p>
                {selectedCourseData.registrationStart && (
                  <p className="text-muted-foreground">{t("opensOn", { date: new Date(selectedCourseData.registrationStart).toLocaleDateString() })}</p>
                )}
                {selectedCourseData.registrationEnd && (
                  <p className="text-muted-foreground">{t("closesOn", { date: new Date(selectedCourseData.registrationEnd).toLocaleDateString() })}</p>
                )}
              </div>
            )}

            {/* Class Group — visual card comparison */}
            <div>
              <label className="block text-sm font-medium mb-3">{t("selectClassGroup")}</label>
              {fetchingGroups ? (
                <p className="text-sm text-muted-foreground">{ct("loading")}</p>
              ) : !selectedCourse || !isRegistrationOpen ? (
                <p className="text-sm text-muted-foreground">{t("selectOption")}</p>
              ) : classGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noGroups")}</p>
              ) : (
                <div className="grid gap-3">
                  {classGroups.map(g => {
                    const slots = formatTimeSlots(g.timeSlots);
                    const isSelected = selectedGroup === g.id;
                    const fill = (g._enrollCount ?? 0) / g.maxCapacity;
                    const isFull = (g._enrollCount ?? 0) >= g.maxCapacity;
                    const spotsLeft = g.maxCapacity - (g._enrollCount ?? 0);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => !isFull && setSelectedGroup(isSelected ? "" : g.id)}
                        disabled={isFull}
                        className={`w-full text-left rounded-lg border p-4 transition-all ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                            : isFull
                            ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                            : "border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: group info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{g.name}</span>
                              {isFull && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Full</span>
                              )}
                              {spotsLeft > 0 && spotsLeft <= 3 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{spotsLeft} left</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {g.teacher?.user?.name && `Teacher: ${g.teacher.user.name}`}
                              <span className="mx-2">·</span>
                              {t("capacity")}: {g._enrollCount ?? 0}/{g.maxCapacity}
                            </p>
                            {/* Time slots as visual schedule chips */}
                            {slots.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {slots.map((sl, i) => (
                                  <div key={i} className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs">
                                    <span className="font-medium text-foreground">{sl.label}</span>
                                    <span className="text-muted-foreground ml-1.5">{sl.detail}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Right: selection indicator */}
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                          }`}>
                            {isSelected && (
                              <svg className="w-full h-full text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {!fetchingGroups && selectedCourse && classGroups.length === 0 && <p className="text-xs text-muted-foreground mt-1">{t("noGroups")}</p>}
            </div>

            {/* Prerequisite cert */}
            <div>
              <label className="block text-sm font-medium mb-1">{t("prerequisiteCert")}</label>
              <input type="text" value={certNumber} onChange={e => setCertNumber(e.target.value)}
                placeholder="CERT-XXXX-XXXX"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
              <p className="text-xs text-muted-foreground mt-1">{t("prerequisiteHelp")}</p>
            </div>

            {/* Payment proof */}
            <div>
              <label className="block text-sm font-medium mb-1">Payment Proof (receipt / screenshot)</label>
              <input type="file" accept="image/*,.pdf" onChange={e => setPaymentFile(e.target.files?.[0] || null)}
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer hover:file:opacity-90" />
              {paymentFile && <p className="text-xs text-muted-foreground mt-1">{paymentFile.name} ({(paymentFile.size / 1024).toFixed(1)} KB)</p>}
            </div>

            <button onClick={handleEnroll} disabled={!canEnroll}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 text-sm">
              {uploading ? "Uploading payment proof..." : loading ? t("enrolling") : t("enrollButton")}
            </button>
          </div>
        </div>
      )}

      {receiptUrl && <ReceiptViewer url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
    </div>
  );
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const expiresAtMs = new Date(expiresAt).getTime();
    const tick = () => {
      const diff = expiresAtMs - Date.now();
      if (diff <= 0) { setDisplay("Expired"); return; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setDisplay(`${hours}h ${minutes}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <span className={display === "Expired" ? "text-red-500 font-medium" : ""}>{display}</span>;
}
