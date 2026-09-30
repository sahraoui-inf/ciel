"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TimeSlot {
  id: string; name: string; nameAr: string | null; days: string; startTime: string; endTime: string; isActive: boolean;
}

const DAY_NAMES: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };

function formatDays(days: string) {
  return days.split(",").map(d => DAY_NAMES[d.trim()] || `Day ${d}`).join(", ");
}

export default function TimeSlotsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/timeslots").then(r => r.json()).then(d => {
      setSlots(d.timeSlots || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(slot: TimeSlot) {
    await fetch(`/api/timeslots/${slot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...slot, isActive: !slot.isActive }),
    });
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, isActive: !s.isActive } : s));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this time slot? This will remove it from all class groups.")) return;
    await fetch(`/api/timeslots/${id}`, { method: "DELETE" });
    setSlots(prev => prev.filter(s => s.id !== id));
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Time Slots</h1>
        <Link href={`/${locale}/timeslots/new`} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90">
          + New Time Slot
        </Link>
      </div>

      {slots.length === 0 ? (
        <p className="text-muted-foreground">No time slots defined yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3 max-sm:hidden">Days</th>
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">
                    {s.name}
                    {s.nameAr && <span className="text-muted-foreground ml-1">({s.nameAr})</span>}
                  </td>
                  <td className="py-2 px-3 max-sm:hidden text-xs">{formatDays(s.days)}</td>
                  <td className="py-2 px-3 text-xs font-mono">{s.startTime} — {s.endTime}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => router.push(`/${locale}/timeslots/${s.id}`)}
                        className="px-3 py-1 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/5">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(s)}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${s.isActive ? "text-amber-600 border border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950" : "text-green-600 border border-green-300 hover:bg-green-50 dark:hover:bg-green-950"}`}>
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-950">
                        Delete
                      </button>
                    </div>
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
