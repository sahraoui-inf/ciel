"use client";

import { useEffect, useState } from "react";

interface Faq {
  id: string;
  questionEn: string;
  questionAr: string | null;
  answerEn: string;
  answerAr: string | null;
  order: number;
  isActive: boolean;
}

export default function FaqManager() {
  const [items, setItems] = useState<Faq[]>([]);
  const [edit, setEdit] = useState<Partial<Faq> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/cms/faq?publishedOnly=false");
    const data = await res.json();
    setItems(data.faqs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    const isNew = !edit.id;
    const url = isNew ? "/api/cms/faq" : `/api/cms/faq/${edit.id}`;
    await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    setEdit(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/api/cms/faq/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">FAQ</h2>
        <button onClick={() => setEdit({ questionEn: "", questionAr: "", answerEn: "", answerAr: "", order: 0 })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          Add FAQ
        </button>
      </div>

      {edit && (
        <div className="mb-8 p-4 border border-border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">{edit.id ? "Edit FAQ" : "New FAQ"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Question (EN)</label>
              <input value={edit.questionEn || ""} onChange={(e) => setEdit({ ...edit, questionEn: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Question (AR)</label>
              <input value={edit.questionAr || ""} onChange={(e) => setEdit({ ...edit, questionAr: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Answer (EN)</label>
              <textarea value={edit.answerEn || ""} onChange={(e) => setEdit({ ...edit, answerEn: e.target.value })}
                rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Answer (AR)</label>
              <textarea value={edit.answerAr || ""} onChange={(e) => setEdit({ ...edit, answerAr: e.target.value })}
                rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm">Order</label>
              <input type="number" value={edit.order ?? 0}
                onChange={(e) => setEdit({ ...edit, order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
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
              <th className="text-left py-2 px-3">Order</th>
              <th className="text-left py-2 px-3">Question (EN)</th>
              <th className="text-left py-2 px-3 max-sm:hidden">Answer</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No FAQs</td></tr>
            ) : items.map((faq) => (
              <tr key={faq.id} className="border-b border-border hover:bg-accent/50">
                <td className="py-2 px-3 text-xs">{faq.order}</td>
                <td className="py-2 px-3">{faq.questionEn}</td>
                <td className="py-2 px-3 max-sm:hidden text-xs text-muted-foreground truncate max-w-xs">{faq.answerEn.substring(0, 60)}...</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${faq.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {faq.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <button onClick={() => setEdit(faq)} className="text-primary hover:underline text-xs mr-2">Edit</button>
                  <button onClick={() => remove(faq.id)} className="text-destructive hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
