"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function NewTimeSlotPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleDay(d: string) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (selectedDays.length === 0) { setError("Select at least one day"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/timeslots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, nameAr: nameAr || null, days: selectedDays.join(","), startTime, endTime }),
    });
    setSaving(false);
    if (res.ok) router.push(`/${locale}/timeslots`);
    else { const d = await res.json(); setError(d.error || "Failed to create"); }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link href={`/${locale}/timeslots`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to Time Slots</Link>
        <h1 className="text-2xl font-bold mt-2">New Time Slot</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
        {error && <div className="p-3 bg-red-100 text-red-800 rounded text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dimanche-Mardi 09:00-11:00"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name (Arabic)</label>
          <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="الأحد-الثلاثاء 09:00-11:00"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => (
              <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border ${selectedDays.includes(d.value) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50">
          {saving ? "Creating..." : "Create Time Slot"}
        </button>
      </form>
    </div>
  );
}
