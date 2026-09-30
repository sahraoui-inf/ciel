"use client";

import { useEffect, useState } from "react";

interface Testimonial {
  id: string;
  studentName: string;
  contentEn: string;
  contentAr: string | null;
  rating: number;
  isActive: boolean;
}

export default function TestimonialsManager() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [edit, setEdit] = useState<Partial<Testimonial> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/cms/testimonials?publishedOnly=false");
    const data = await res.json();
    setItems(data.testimonials || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    const isNew = !edit.id;
    const url = isNew ? "/api/cms/testimonials" : `/api/cms/testimonials/${edit.id}`;
    await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    setEdit(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch(`/api/cms/testimonials/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Testimonials</h2>
        <button onClick={() => setEdit({ studentName: "", contentEn: "", contentAr: "", rating: 5 })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          Add Testimonial
        </button>
      </div>

      {edit && (
        <div className="mb-8 p-4 border border-border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">{edit.id ? "Edit Testimonial" : "New Testimonial"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Student Name</label>
              <input value={edit.studentName || ""} onChange={(e) => setEdit({ ...edit, studentName: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Rating (1-5)</label>
              <input type="number" min={1} max={5} value={edit.rating ?? 5}
                onChange={(e) => setEdit({ ...edit, rating: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm">Content (EN)</label>
            <textarea value={edit.contentEn || ""} onChange={(e) => setEdit({ ...edit, contentEn: e.target.value })}
              rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm">Content (AR)</label>
            <textarea value={edit.contentAr || ""} onChange={(e) => setEdit({ ...edit, contentAr: e.target.value })}
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
              <th className="text-left py-2 px-3">Student</th>
              <th className="text-left py-2 px-3 max-sm:hidden">Content</th>
              <th className="text-left py-2 px-3">Rating</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No testimonials</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-accent/50">
                <td className="py-2 px-3">{item.studentName}</td>
                <td className="py-2 px-3 max-sm:hidden text-xs text-muted-foreground truncate max-w-xs">
                  {item.contentEn.substring(0, 80)}...
                </td>
                <td className="py-2 px-3">{Array(item.rating).fill("★").join("")}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${item.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {item.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <button onClick={() => setEdit(item)} className="text-primary hover:underline text-xs mr-2">Edit</button>
                  <button onClick={() => remove(item.id)} className="text-destructive hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
