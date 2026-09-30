"use client";

import { useEffect, useState } from "react";

interface MediaItem {
  id: string;
  url: string;
  type: string;
  alt: string | null;
  createdAt: string;
}

export default function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("Image");

  async function load() {
    const res = await fetch("/api/cms/media");
    const data = await res.json();
    setItems(data.media || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!url) return;
    await fetch("/api/cms/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, alt, type }),
    });
    setUrl("");
    setAlt("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this media?")) return;
    await fetch(`/api/cms/media/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Media Gallery</h2>

      <div className="mb-8 p-4 border border-border rounded-lg bg-card space-y-3">
        <h3 className="font-semibold text-sm">Add Media</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs mb-1">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 rounded-md border border-border bg-background text-sm">
              <option>Image</option>
              <option>Video</option>
              <option>Document</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">Alt Text</label>
            <input value={alt} onChange={(e) => setAlt(e.target.value)}
              className="w-40 px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <button onClick={add} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Add</button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No media uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative border border-border rounded-lg overflow-hidden bg-card">
              {item.type === "Image" ? (
                <img src={item.url} alt={item.alt || ""} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-muted-foreground text-xs">
                  {item.type}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => remove(item.id)}
                  className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs">
                  Delete
                </button>
              </div>
              {item.alt && (
                <p className="p-1 text-xs text-muted-foreground truncate">{item.alt}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
