"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface TimeSlotBrief { id: string; name: string; nameAr: string | null; days: string; startTime: string; endTime: string }
interface ClassGroupTimeSlot { id: string; timeSlot: TimeSlotBrief }
interface TeacherUser { name: string }
interface TeacherProfile { user: TeacherUser }
interface StudentUser { name: string; email: string; phone: string | null }
interface StudentProfile { id: string; user: StudentUser; dateOfBirth: string | null; phone2: string | null; photo: string | null; fatherName: string | null; fatherPhone: string | null }
interface EnrollmentForGroup { id: string; status: string; enrolledAt: string; student: StudentProfile }
interface GroupCourse { id: string; name: string; code: string; level: { name: string; code: string }; language: { name: string } }
interface ClassGroup { id: string; name: string; room: string | null; startDate: string | null; endDate: string | null; maxCapacity: number; isActive: boolean; createdAt: string; course: GroupCourse; teacher: TeacherProfile; timeSlots: ClassGroupTimeSlot[]; _count: { enrollments: number }; _enrolledStudents?: EnrollmentForGroup[] }

const DAY_NAMES: Record<string, string> = {
  "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat"
};

export default function TeacherGroupsPage() {
  const t = useTranslations("teachers");
  const ct = useTranslations("common");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [studentsByGroup, setStudentsByGroup] = useState<Record<string, EnrollmentForGroup[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/classgroups")
      .then(r => r.json())
      .then(d => { setGroups(d.groups || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggleGroup(groupId: string) {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
      return;
    }
    setExpandedGroup(groupId);
    if (!studentsByGroup[groupId]) {
      setLoadingStudents(prev => ({ ...prev, [groupId]: true }));
      fetch(`/api/enrollments?classGroupId=${groupId}`)
        .then(r => r.json())
        .then(d => {
          setStudentsByGroup(prev => ({ ...prev, [groupId]: d.enrollments || [] }));
          setLoadingStudents(prev => ({ ...prev, [groupId]: false }));
        })
        .catch(() => setLoadingStudents(prev => ({ ...prev, [groupId]: false })));
    }
  }

  function formatTimeSlots(timeSlots: ClassGroupTimeSlot[]) {
    return timeSlots.map(ts => {
      const s = ts.timeSlot;
      const days = s.days.split(",").map(d => DAY_NAMES[d.trim()] || `Day ${d}`).join(", ");
      return { label: locale === "ar" && s.nameAr ? s.nameAr : s.name, detail: `${days} ${s.startTime} - ${s.endTime}` };
    });
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

  if (loading) return <p className="text-muted-foreground">{ct("loading")}</p>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t("myGroups")}</h1>
        <p className="text-muted-foreground text-sm">{groups.length} group{groups.length !== 1 ? "s" : ""} assigned</p>
      </div>

      {groups.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{t("noGroups")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => {
            const slots = formatTimeSlots(group.timeSlots);
            const enrolled = group._count.enrollments;
            const fillPct = group.maxCapacity > 0 ? Math.round((enrolled / group.maxCapacity) * 100) : 0;
            const isExpanded = expandedGroup === group.id;
            const students = studentsByGroup[group.id] || [];
            const isLoadingStudents = loadingStudents[group.id];

            return (
              <div key={group.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Group header card */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-semibold">{group.name}</h2>
                        {!group.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {group.course.name}
                        <span className="mx-2">·</span>
                        {group.course.level.name}
                        <span className="mx-2">·</span>
                        {group.course.language.name}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => router.push(`/${locale}/attendance?groupId=${group.id}`)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20">
                        Attendance
                      </button>
                      <button onClick={() => router.push(`/${locale}/grades?groupId=${group.id}`)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20">
                        Grades
                      </button>
                    </div>
                  </div>

                  {/* Quick info chips */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    {group.room && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                        Room {group.room}
                      </span>
                    )}
                    {group.startDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        {new Date(group.startDate).toLocaleDateString()}{group.endDate ? ` — ${new Date(group.endDate).toLocaleDateString()}` : ""}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                      </svg>
                      {enrolled}/{group.maxCapacity} students
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fillPct >= 100 ? "bg-red-500" : fillPct >= 75 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  </div>

                  {/* Time slots */}
                  {slots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {slots.map((sl, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-background border border-border rounded-md px-3 py-1.5 text-xs">
                          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          <span className="font-medium text-foreground">{sl.label}</span>
                          <span className="text-muted-foreground">{sl.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expand students toggle */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {isExpanded ? "Hide students" : `View ${enrolled} student${enrolled !== 1 ? "s" : ""}`}
                  </button>
                </div>

                {/* Expanded student list */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {isLoadingStudents ? (
                      <p className="p-4 text-sm text-muted-foreground">{ct("loading")}</p>
                    ) : students.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">{t("noStudents")}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Student</th>
                              <th className="text-left p-3 font-medium max-sm:hidden">Email</th>
                              <th className="text-left p-3 font-medium max-sm:hidden">Phone</th>
                              <th className="text-left p-3 font-medium">Status</th>
                              <th className="text-left p-3 font-medium max-sm:hidden">Enrolled</th>
                              <th className="text-right p-3 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(enr => (
                              <tr key={enr.id} className="border-t border-border hover:bg-muted/30">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {enr.student.photo ? (
                                      <img src={enr.student.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                                        {enr.student.user.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="font-medium truncate max-w-[120px] sm:max-w-none">{enr.student.user.name}</span>
                                  </div>
                                </td>
                                <td className="p-3 max-sm:hidden text-muted-foreground text-xs">{enr.student.user.email}</td>
                                <td className="p-3 max-sm:hidden text-muted-foreground text-xs">{enr.student.user.phone || enr.student.phone2 || "—"}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(enr.status)}`}>
                                    {enr.status}
                                  </span>
                                </td>
                                <td className="p-3 max-sm:hidden text-xs text-muted-foreground">
                                  {new Date(enr.enrolledAt).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => router.push(`/${locale}/students/${enr.student.id}`)}
                                    className="text-primary hover:underline text-xs"
                                  >
                                    Profile
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
