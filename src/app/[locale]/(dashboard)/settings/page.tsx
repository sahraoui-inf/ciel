"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const keys = [
    { key: "site_name", label: "Site Name", type: "text" },
    { key: "site_description", label: "Site Description", type: "textarea" },
    { key: "hero_image_url", label: "Hero Background Image", type: "image" },
    { key: "favicon_url", label: "Favicon URL", type: "text" },
    { key: "logo_url", label: "Logo URL", type: "text" },
    { key: "primary_color", label: "Primary Color", type: "color" },
    { key: "secondary_color", label: "Secondary Color", type: "color" },
    { key: "font_family", label: "Font Family", type: "text" },
  ];

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) setSettings(d.settings);
    });
  }, []);

  async function saveSetting(key: string) {
    setSaving(key);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: settings[key] || "" }),
    });
    setSaving(null);
  }

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(key: string, file: File | null) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      update(key, data.url);
      await saveSetting(key);
    }
    setUploading(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-muted-foreground text-sm">Manage global site settings. These affect the public-facing website.</p>
      {keys.map(({ key, label, type }) => (
        <div key={key} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">{label}</label>
            {type === "image" ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={settings[key] || ""}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder="Image URL or upload below"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm mb-2"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUpload(key, e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                  {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                </div>
                {settings[key] && (
                  <img src={settings[key]} alt={label} className="mt-2 h-32 w-full object-cover rounded-md border border-border" />
                )}
              </div>
            ) : type === "textarea" ? (
              <textarea
                value={settings[key] || ""}
                onChange={(e) => update(key, e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
            ) : (
              <input
                type={type}
                value={settings[key] || ""}
                onChange={(e) => update(key, e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
            )}
          </div>
          <button
            onClick={() => saveSetting(key)}
            disabled={saving === key}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {saving === key ? "Saving..." : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}
