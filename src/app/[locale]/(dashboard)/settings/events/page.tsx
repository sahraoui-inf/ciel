"use client";

import { useEffect, useState } from "react";

interface Event {
  id: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  date: string | null;
  location: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export default function EventsManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [edit, setEdit] = useState<Partial<Event> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/cms/events?publishedOnly=false");
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    const isNew = !edit.id;
    const url = isNew ? "/api/cms/events" : `/api/cms/events/${edit.id}`;
    await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    setEdit(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/cms/events/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Events</h2>
        <button onClick={() => setEdit({ titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", location: "", imageUrl: "" })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          Create Event
        </button>
      </div>

      {edit && (
        <div className="mb-8 p-4 border border-border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">{edit.id ? "Edit Event" : "New Event"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Title (EN)</label>
              <input value={edit.titleEn || ""} onChange={(e) => setEdit({ ...edit, titleEn: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Title (AR)</label>
              <input value={edit.titleAr || ""} onChange={(e) => setEdit({ ...edit, titleAr: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Date</label>
              <input type="date" value={edit.date ? edit.date.substring(0, 10) : ""}
                onChange={(e) => setEdit({ ...edit, date: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Location</label>
              <input value={edit.location || ""} onChange={(e) => setEdit({ ...edit, location: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm">Image URL</label>
              <input value={edit.imageUrl || ""} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm">Description (EN)</label>
            <textarea value={edit.descriptionEn || ""} onChange={(e) => setEdit({ ...edit, descriptionEn: e.target.value })}
              rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm">Description (AR)</label>
            <textarea value={edit.descriptionAr || ""} onChange={(e) => setEdit({ ...edit, descriptionAr: e.target.value })}
              rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Save</button>
            <button onClick={() => setEdit(null)} className="px-4 py-2 border border-border rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3">Title</th>
              <th className="text-left py-2 px-3 max-sm:hidden">Date</th>
              <th className="text-left py-2 px-3 max-sm:hidden">Location</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No events</td></tr>
            ) : events.map((ev) => (
              <tr key={ev.id} className="border-b border-border hover:bg-accent/50">
                <td className="py-2 px-3">{ev.titleEn}</td>
                <td className="py-2 px-3 max-sm:hidden text-xs text-muted-foreground">
                  {ev.date ? new Date(ev.date).toLocaleDateString() : "—"}
                </td>
                <td className="py-2 px-3 max-sm:hidden text-xs text-muted-foreground">{ev.location || "—"}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ev.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {ev.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <button onClick={() => setEdit(ev)} className="text-primary hover:underline text-xs mr-2">Edit</button>
                  <button onClick={() => remove(ev.id)} className="text-destructive hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
