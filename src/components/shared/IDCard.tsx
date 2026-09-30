"use client";

import { useRef, useEffect, useState } from "react";
import * as QRCode from "qrcode";

type IDCardProps = {
  type: "student" | "teacher";
  firstName: string;
  lastName: string;
  course?: string;
  enrollmentNumber?: string;
  profileUrl: string;
  photoUrl?: string;
  siteName?: string;
  logoUrl?: string;
  website?: string;
};

export default function IDCard({
  type, firstName, lastName, course, enrollmentNumber,
  profileUrl, photoUrl, siteName, logoUrl, website,
}: IDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrSvg, setQrSvg] = useState("");
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
    QRCode.toString(profileUrl, { type: "svg", width: 64, margin: 0, color: { dark: "#1e293b" } })
      .then(setQrSvg)
      .catch(() => {});
  }, [profileUrl]);

  const displayName = `${firstName} ${lastName}`.trim() || "—";
  const initial = (firstName || lastName || "?").charAt(0).toUpperCase();

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = cardRef.current?.outerHTML || "";
    printWindow.document.write(`
      <html>
        <head><title>ID Card - ${displayName}</title>
        <style>
          @page { margin: 0; size: 85.6mm 54mm; }
          body { margin: 0; width: 85.6mm; height: 54mm; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .id-card { width: 85.6mm; height: 54mm; background: #fff; overflow: hidden; display: flex; flex-direction: column; }
          .ic-header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 3mm 4mm; display: flex; align-items: center; gap: 2.5mm; flex-shrink: 0; }
          .ic-header .logo { width: 9mm; height: 9mm; border-radius: 1.5mm; background: #fff; object-fit: contain; padding: 0.6mm; flex-shrink: 0; }
          .ic-header .logo-fallback { width: 9mm; height: 9mm; border-radius: 1.5mm; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 3.6mm; color: #fff; flex-shrink: 0; }
          .ic-header h1 { margin: 0; font-size: 4.2mm; font-weight: 700; color: #fff; letter-spacing: 0.2px; }
          .ic-header .subtitle { font-size: 2mm; color: rgba(255,255,255,0.85); letter-spacing: 0.4px; text-transform: uppercase; }
          .ic-header .badge { margin-left: auto; background: rgba(255,255,255,0.22); padding: 0.8mm 2.5mm; border-radius: 3mm; font-size: 2.1mm; font-weight: 600; color: #fff; text-transform: uppercase; letter-spacing: 0.3px; }
          .ic-body { padding: 3mm 4mm; display: flex; gap: 3.5mm; flex: 1; min-height: 0; }
          .ic-photo { width: 18mm; height: 18mm; border-radius: 2mm; object-fit: cover; border: 0.4mm solid #e2e8f0; flex-shrink: 0; align-self: center; }
          .ic-photo-fallback { width: 18mm; height: 18mm; border-radius: 2mm; background: linear-gradient(135deg, #2563eb, #1d4ed8); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 7mm; font-weight: 700; flex-shrink: 0; align-self: center; }
          .ic-info { flex: 1; display: flex; flex-direction: column; gap: 1.2mm; justify-content: center; min-width: 0; }
          .ic-field { display: flex; align-items: baseline; gap: 1.5mm; }
          .ic-field .il { font-size: 2mm; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2px; min-width: 10mm; flex-shrink: 0; }
          .ic-field .iv { font-size: 2.8mm; font-weight: 500; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .ic-field .iv.name { font-size: 3.4mm; font-weight: 700; }
          .ic-field .iv.mono { font-family: 'Courier New', monospace; font-weight: 700; }
          .ic-footer { display: flex; align-items: center; gap: 2.5mm; padding: 1.5mm 4mm 2mm; border-top: 0.4mm solid #e2e8f0; flex-shrink: 0; }
          .ic-footer .qr svg { width: 8mm; height: 8mm; display: block; }
          .ic-footer .enr { font-size: 2.1mm; color: #475569; font-family: 'Courier New', monospace; font-weight: 700; }
          .ic-footer .site { font-size: 2mm; color: #94a3b8; font-weight: 500; margin-left: auto; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <div>
      <div
        ref={cardRef}
        className="id-card"
        style={{ width: "85.6mm", height: "54mm", background: "#fff", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: "2mm", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}
      >
        {/* Header: logo + platform name */}
        <div className="ic-header" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "3mm 4mm", display: "flex", alignItems: "center", gap: "2.5mm", flexShrink: 0 }}>
          {logoUrl && !logoBroken ? (
            <img
              src={logoUrl}
              alt=""
              crossOrigin="anonymous"
              onError={() => setLogoBroken(true)}
              style={{ width: "9mm", height: "9mm", borderRadius: "1.5mm", background: "#fff", objectFit: "contain", padding: "0.6mm", flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: "9mm", height: "9mm", borderRadius: "1.5mm", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "3.6mm", color: "#fff", flexShrink: 0 }}>
              LC
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "4.2mm", fontWeight: 700, color: "#fff", letterSpacing: "0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {siteName || "LinguaCenter"}
            </h1>
            <div className="subtitle" style={{ fontSize: "2mm", color: "rgba(255,255,255,0.85)", letterSpacing: "0.4px", textTransform: "uppercase" }}>
              Student ID Card
            </div>
          </div>
          <span className="badge" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.22)", padding: "0.8mm 2.5mm", borderRadius: "3mm", fontSize: "2.1mm", fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: "0.3px" }}>
            {type}
          </span>
        </div>

        {/* Body: photo + first/last name + course */}
        <div className="ic-body" style={{ padding: "3mm 4mm", display: "flex", gap: "3.5mm", flex: 1, minHeight: 0 }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              crossOrigin="anonymous"
              className="ic-photo"
              style={{ width: "18mm", height: "18mm", borderRadius: "2mm", objectFit: "cover", border: "0.4mm solid #e2e8f0", flexShrink: 0, alignSelf: "center" }}
            />
          ) : (
            <div
              className="ic-photo-fallback"
              style={{ width: "18mm", height: "18mm", borderRadius: "2mm", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "7mm", fontWeight: 700, flexShrink: 0, alignSelf: "center" }}
            >
              {initial}
            </div>
          )}

          <div className="ic-info" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.2mm", justifyContent: "center", minWidth: 0 }}>
            <div className="ic-field" style={{ display: "flex", alignItems: "baseline", gap: "1.5mm" }}>
              <span className="il" style={{ fontSize: "2mm", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2px", minWidth: "10mm", flexShrink: 0 }}>Last</span>
              <span className="iv name" style={{ fontSize: "3.4mm", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lastName || "—"}</span>
            </div>
            <div className="ic-field" style={{ display: "flex", alignItems: "baseline", gap: "1.5mm" }}>
              <span className="il" style={{ fontSize: "2mm", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2px", minWidth: "10mm", flexShrink: 0 }}>First</span>
              <span className="iv" style={{ fontSize: "2.8mm", fontWeight: 500, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{firstName || "—"}</span>
            </div>
            {course && (
              <div className="ic-field" style={{ display: "flex", alignItems: "baseline", gap: "1.5mm" }}>
                <span className="il" style={{ fontSize: "2mm", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2px", minWidth: "10mm", flexShrink: 0 }}>Course</span>
                <span className="iv" style={{ fontSize: "2.8mm", fontWeight: 500, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{course}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: QR + enrollment number */}
        <div className="ic-footer" style={{ display: "flex", alignItems: "center", gap: "2.5mm", padding: "1.5mm 4mm 2mm", borderTop: "0.4mm solid #e2e8f0", flexShrink: 0 }}>
          {qrSvg && <div className="qr" style={{ width: "8mm", height: "8mm", lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />}
          {enrollmentNumber && (
            <span className="enr" style={{ fontSize: "2.1mm", color: "#475569", fontFamily: "'Courier New', monospace", fontWeight: 700 }}>
              N° {enrollmentNumber}
            </span>
          )}
          <span className="site" style={{ fontSize: "2mm", color: "#94a3b8", fontWeight: 500, marginLeft: "auto" }}>
            {website || "lingua-center.com"}
          </span>
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <button onClick={handlePrint} className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 shadow-sm transition-all">
          Print ID Card
        </button>
      </div>
    </div>
  );
}
