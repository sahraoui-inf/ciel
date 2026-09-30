"use client";

import { useEffect, useCallback } from "react";

interface Props {
  url: string;
  onClose: () => void;
}

export default function ReceiptViewer({ url, onClose }: Props) {
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] bg-background rounded-lg overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Payment Receipt</span>
          <button onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30 min-h-[300px]">
          {isImage ? (
            <img src={url} alt="Receipt" className="max-w-full max-h-[70vh] object-contain rounded" />
          ) : (
            <iframe src={url} className="w-full h-[70vh] rounded border-0" title="Receipt" />
          )}
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs border border-border rounded hover:bg-accent">
            Open in new tab
          </a>
          <button onClick={onClose}
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
