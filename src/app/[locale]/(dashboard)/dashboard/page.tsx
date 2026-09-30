"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ReceiptViewer from "@/components/shared/ReceiptViewer";

type DashboardData = {
  user: { id: string; name: string; role: string };
  studentCount?: number;
  courseCount?: number;
  teacherCount?: number;
  pendingEnrollments?: number;
  myGroups?: number;
  myStudents?: number;
  myEnrollmentsCount?: number;
};

type PendingEnrollment = {
  id: string;
  expiresAt: string | null;
  enrolledAt: string;
  paymentProofUrl: string | null;
  student: { user: { name: string; email: string } };
  classGroup: { name: string; course: { name: string; language: { name: string } } };
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const ct = useTranslations("common");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingList, setPendingList] = useState<PendingEnrollment[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => router.push(`/${locale}/login`));
  }, []);

  useEffect(() => {
    if (data?.user.role === "SuperAdmin" || data?.user.role === "Admin") {
      fetch("/api/enrollments/pending")
        .then(r => r.json())
        .then(d => setPendingList(d.enrollments || []))
        .catch(() => {});
    }
  }, [data]);

  async function handleConfirm(enrollmentId: string, newStatus: string) {
    setFeedback(null);
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const result = await res.json();
    if (!res.ok) {
      setFeedback(result.error || "Operation failed");
      return;
    }
    setPendingList(prev => prev.filter(e => e.id !== enrollmentId));
  }

  if (!data) return <p className="text-muted-foreground">{ct("loading")}</p>;

  const { user } = data;

  const cards: Array<{ label: string; value: string | number; color: string; action?: { label: string; href: string } }> = [];

  if (user.role === "SuperAdmin" || user.role === "Admin") {
    cards.push(
      { label: "Total Students", value: data.studentCount ?? "—", color: "bg-blue-500", action: { label: "View", href: `/${locale}/students` } },
      { label: "Active Courses", value: data.courseCount ?? "—", color: "bg-green-500", action: { label: "View", href: `/${locale}/courses` } },
      { label: "Teachers", value: data.teacherCount ?? "—", color: "bg-purple-500", action: { label: "View", href: `/${locale}/teachers` } },
      { label: "Pending Enrollments", value: data.pendingEnrollments ?? pendingList.length, color: "bg-orange-500", action: { label: "Review", href: `#pending` } },
    );
  } else if (user.role === "Teacher") {
    cards.push(
      { label: "My Groups", value: data.myGroups ?? "—", color: "bg-green-500", action: { label: "View", href: `/${locale}/groups` } },
      { label: "My Students", value: data.myStudents ?? "—", color: "bg-blue-500", action: { label: "View", href: `/${locale}/students` } },
      { label: "Attendance", value: "Mark", color: "bg-purple-500", action: { label: "Go", href: `/${locale}/attendance` } },
      { label: "Grades", value: "Enter", color: "bg-orange-500", action: { label: "Go", href: `/${locale}/grades` } },
    );
  } else if (user.role === "Student") {
    cards.push(
      { label: "My Enrollments", value: data.myEnrollmentsCount ?? "—", color: "bg-blue-500", action: { label: "View", href: `/${locale}/enroll` } },
      { label: "My Profile", value: "Edit", color: "bg-green-500", action: { label: "Open", href: `/${locale}/profile` } },
      { label: "Certificates", value: "View", color: "bg-purple-500", action: { label: "Go", href: `/${locale}/profile` } },
      { label: "Enroll in Course", value: "New", color: "bg-orange-500", action: { label: "Enroll", href: `/${locale}/enroll` } },
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t("welcome", { name: user.name })}</h1>
        <p className="text-muted-foreground text-sm capitalize">{user.role}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 flex flex-col">
            <div className={`w-10 h-10 ${card.color} rounded-md mb-3 flex items-center justify-center text-white text-sm font-bold`}>
              {typeof card.value === "number" ? card.value : card.value.toString()[0]}
            </div>
            <p className="text-2xl font-bold mb-1">{card.value}</p>
            <p className="text-sm text-muted-foreground mb-3">{card.label}</p>
            {card.action && (
              <button onClick={() => router.push(card.action!.href)} className="mt-auto text-sm text-primary hover:underline text-left">
                {card.action.label} →
              </button>
            )}
          </div>
        ))}
      </div>

      {(user.role === "SuperAdmin" || user.role === "Admin") && pendingList.length > 0 && (
        <div id="pending" className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Enrollment Requests ({pendingList.length})</h2>

          {feedback && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">{feedback}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Student</th>
                  <th className="text-left py-2 px-3 max-sm:hidden">Course</th>
                  <th className="text-left py-2 px-3">Group</th>
                  <th className="text-left py-2 px-3 max-sm:hidden">Date</th>
                  <th className="text-left py-2 px-3 max-sm:hidden">Expires In</th>
                  <th className="text-left py-2 px-3">Receipt</th>
                  <th className="text-right py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((enr) => (
                  <tr key={enr.id} className="border-b border-border">
                    <td className="py-2 px-3">{enr.student.user.name}</td>
                    <td className="py-2 px-3 max-sm:hidden">{enr.classGroup.course.name}</td>
                    <td className="py-2 px-3">{enr.classGroup.name}</td>
                    <td className="py-2 px-3 max-sm:hidden text-xs">{new Date(enr.enrolledAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3 max-sm:hidden text-xs">
                      {enr.expiresAt ? <CountdownTimer expiresAt={enr.expiresAt} /> : "—"}
                    </td>
                    <td className="py-2 px-3">
                      {enr.paymentProofUrl ? (
                        <button onClick={() => setReceiptUrl(enr.paymentProofUrl)}
                          className="text-primary hover:underline text-xs">View</button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <button onClick={() => handleConfirm(enr.id, "Active")}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs mr-1 hover:bg-green-200">
                        Approve
                      </button>
                      <button onClick={() => handleConfirm(enr.id, "Dropped")}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200">
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {user.role === "Admin" && (
          <>
            <ActionCard label="Verify Registrations" desc="Review and approve pending enrollment requests" href={`/${locale}/dashboard`} />
            <ActionCard label="Manage Class Groups" desc="Assign students to groups and teachers" href={`/${locale}/courses`} />
            <ActionCard label="Print ID Cards" desc="Generate student ID cards with QR & barcode" href={`/${locale}/students`} />
            <ActionCard label="Generate Reports" desc="Export department reports (coming soon)" href="#" />
          </>
        )}
        {user.role === "Teacher" && (
          <>
            <ActionCard label="Mark Attendance" desc="Record daily attendance for your groups" href={`/${locale}/attendance`} />
            <ActionCard label="Enter Grades" desc="Record exam scores for your students" href={`/${locale}/grades`} />
            <ActionCard label="My Schedule" desc="View your teaching schedule" href={`/${locale}/schedules`} />
          </>
        )}
        {user.role === "Student" && (
          <>
            <ActionCard label="Enroll in Course" desc="Browse available courses and enroll" href={`/${locale}/enroll`} />
            <ActionCard label="My Profile" desc="Edit personal info and view academic file" href={`/${locale}/profile`} />
            <ActionCard label="My Schedule" desc="View your class schedule" href={`/${locale}/schedules`} />
            <ActionCard label="My ID Card" desc="View and print your digital ID card" href={`/${locale}/id-card`} />
          </>
        )}
      </div>

      {receiptUrl && <ReceiptViewer url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
    </div>
  );
}

function ActionCard({ label, desc, href }: { label: string; desc: string; href: string }) {
  const router = useRouter();
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col">
      <h3 className="font-semibold mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground mb-4 flex-1">{desc}</p>
      <button onClick={() => router.push(href)} className="text-sm text-primary hover:underline text-left">
        Go →
      </button>
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
