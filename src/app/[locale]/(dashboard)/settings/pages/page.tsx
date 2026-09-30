"use client";

import { useEffect, useState } from "react";

interface CmsPage {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  contentEn: string | null;
  contentAr: string | null;
  isPublished: boolean;
  updatedAt: string;
}

export default function PagesManager() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [edit, setEdit] = useState<Partial<CmsPage> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/cms/pages");
    const data = await res.json();
    setPages(data.pages || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    const isNew = !edit.id;
    const url = isNew ? "/api/cms/pages" : `/api/cms/pages/${edit.slug}`;
    const method = isNew ? "POST" : "PUT";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
    setEdit(null);
    load();
  }

  async function togglePublish(page: CmsPage) {
    await fetch(`/api/cms/pages/${page.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !page.isPublished }),
    });
    load();
  }

  async function remove(slug: string) {
    if (!confirm("Delete this page?")) return;
    await fetch(`/api/cms/pages/${slug}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">CMS Pages</h2>
        <button onClick={() => setEdit({ slug: "", titleEn: "", titleAr: "", contentEn: "", contentAr: "" })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          Create Page
        </button>
      </div>

      {edit && (
        <div className="mb-8 p-4 border border-border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">{edit.id ? "Edit Page" : "New Page"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Slug</label>
              <input value={edit.slug || ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
                disabled={!!edit.id} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
            </div>
            <div />
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
          </div>
          <div>
            <label className="block text-sm">Content (EN)</label>
            <textarea value={edit.contentEn || ""} onChange={(e) => setEdit({ ...edit, contentEn: e.target.value })}
              rows={5} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm">Content (AR)</label>
            <textarea value={edit.contentAr || ""} onChange={(e) => setEdit({ ...edit, contentAr: e.target.value })}
              rows={5} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
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
              <th className="text-left py-2 px-3">Slug</th>
              <th className="text-left py-2 px-3">Title (EN)</th>
              <th className="text-left py-2 px-3 max-sm:hidden">Status</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No pages yet</td></tr>
            ) : pages.map((page) => (
              <tr key={page.id} className="border-b border-border hover:bg-accent/50">
                <td className="py-2 px-3 font-mono text-xs">{page.slug}</td>
                <td className="py-2 px-3">{page.titleEn}</td>
                <td className="py-2 px-3 max-sm:hidden">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${page.isPublished ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {page.isPublished ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <button onClick={() => setEdit(page)} className="text-primary hover:underline text-xs mr-2">Edit</button>
                  <button onClick={() => togglePublish(page)} className="text-xs mr-2 text-muted-foreground hover:text-foreground">
                    {page.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => remove(page.slug)} className="text-destructive hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
