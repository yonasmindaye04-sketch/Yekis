/* ────────────────────────────────────────────────────────────────────────
   EvidenceViewer.tsx — full-screen evidence overlay: zoom / rotate / drag
   with keyboard support (← → navigate, Esc close). The "scans" are fake
   document mockups rendered in JSX (same look as the HTML prototype).
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import type { MouseEvent as RMouseEvent } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { KycDoc } from "../opsTypes";

export interface ViewerDoc extends KycDoc {
  name?: string;
  doc?: string;
  tin?: string;
}

function FakeDoc({ d }: { d: ViewerDoc }) {
  if (d.k === "license")
    return (
      <div className="fdoc">
        <div className="fdoc-band" />
        <div className="fdoc-head">
          <div className="fh-t">Federal Democratic Republic of Ethiopia<br />Business License</div>
          <div className="fh-b">MoTRA</div>
        </div>
        <div className="fdoc-body">
          <div className="fdoc-fields">
            <div className="fdoc-field"><div className="ff-k">Trade Name</div><div className="ff-v">{d.name || "Sample Trade PLC"}</div></div>
            <div className="fdoc-field"><div className="ff-k">License Number</div><div className="ff-v">BR-4471-A / 2016</div></div>
            <div className="fdoc-field"><div className="ff-k">Main Business Activity</div><div className="ff-v">Software development &amp; design services</div></div>
            <div className="fdoc-field"><div className="ff-k">Valid Until</div><div className="ff-v">12 Meskerem 2017 E.C.</div></div>
          </div>
          <div className="fdoc-foot">
            <div className="fdoc-sig">Authorized signature</div>
            <div className="fdoc-stamp">OFFICIAL<br />SEAL</div>
          </div>
        </div>
      </div>
    );
  if (d.k === "tin")
    return (
      <div className="fdoc">
        <div className="fdoc-band" />
        <div className="fdoc-head">
          <div className="fh-t">Taxpayer Identification Number<br />Certificate</div>
          <div className="fh-b">MoR</div>
        </div>
        <div className="fdoc-body">
          <div className="fdoc-fields">
            <div className="fdoc-field"><div className="ff-k">Taxpayer Name</div><div className="ff-v">{d.name || "Sample Taxpayer"}</div></div>
            <div className="fdoc-field"><div className="ff-k">TIN</div><div className="ff-v mono">{d.tin || "0012345678"}</div></div>
            <div className="fdoc-field"><div className="ff-k">Registration Date</div><div className="ff-v">04 / 07 / 2015 E.C.</div></div>
            <div className="fdoc-field"><div className="ff-k">Tax Category</div><div className="ff-v">Category “A” — Business Income</div></div>
          </div>
          <div className="fdoc-foot">
            <div className="fdoc-sig">Registrar signature</div>
            <div className="fdoc-stamp">MINISTRY OF<br />REVENUE</div>
          </div>
        </div>
      </div>
    );
  if (d.k === "selfie")
    return (
      <div className="fdoc">
        <div className="fdoc-band" />
        <div className="fdoc-head">
          <div className="fh-t">Identity Selfie Verification</div>
          <div className="fh-b">LIVE CAPTURE</div>
        </div>
        <div className="fdoc-body">
          <div className="fdoc-row">
            <div className="fdoc-photo" style={{ width: 150, height: 180 }}>
              <Camera size={40} />
            </div>
            <div className="fdoc-fields">
              <div className="fdoc-field"><div className="ff-k">Status</div><div className="ff-v" style={{ color: "#15803d" }}>Liveness passed</div></div>
              <div className="fdoc-field"><div className="ff-k">Face Match</div><div className="ff-v">97.4% confidence</div></div>
              <div className="fdoc-field"><div className="ff-k">Captured</div><div className="ff-v">Jan 15, 2024 · 09:04</div></div>
              <div className="fdoc-field"><div className="ff-k">Device</div><div className="ff-v">Android · Addis Ababa</div></div>
            </div>
          </div>
        </div>
      </div>
    );
  const back = d.k === "id-back";
  return (
    <div className="fdoc">
      <div className="fdoc-band" />
      <div className="fdoc-head">
        <div className="fh-t">Federal Democratic Republic of Ethiopia<br />National ID (Fayda)</div>
        <div className="fh-b">{back ? "BACK" : "FRONT"}</div>
      </div>
      <div className="fdoc-body">
        <div className="fdoc-row">
          <div className="fdoc-photo"><Camera size={34} /></div>
          <div className="fdoc-fields">
            <div className="fdoc-field"><div className="ff-k">Full Name</div><div className="ff-v">{d.name || "Sample Citizen"}</div></div>
            <div className="fdoc-field"><div className="ff-k">Fayda Number</div><div className="ff-v mono">{d.doc || "FAY-8842-0021"}</div></div>
            <div className="fdoc-field"><div className="ff-k">Date of Birth</div><div className="ff-v">— / — / 1992</div></div>
            <div className="fdoc-field"><div className="ff-k">Valid Until</div><div className="ff-v">2029</div></div>
          </div>
        </div>
        <div className="fdoc-foot">
          <div className="fdoc-sig">Holder signature</div>
          <div className="fdoc-stamp">NATIONAL ID<br />PROGRAM</div>
        </div>
      </div>
      <div className="fdoc-mrz">
        {`ID<ETH${(d.doc || "FAY88420021").replace(/[^A-Z0-9]/g, "")}`}
        <br />
        9201014M2901011&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;04
      </div>
    </div>
  );
}

export default function EvidenceViewer({
  docs,
  startIdx = 0,
  onClose,
}: {
  docs: ViewerDoc[];
  startIdx?: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number } | null>(null);

  const nav = useCallback(
    (dir: number) => {
      setIdx((i) => Math.max(0, Math.min(docs.length - 1, i + dir)));
      setScale(1);
      setRot(0);
      setPos({ x: 0, y: 0 });
    },
    [docs.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowRight") { e.preventDefault(); nav(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); nav(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, onClose]);

  const d = docs[idx];
  if (!d) return null;

  const onMove = (e: RMouseEvent) => {
    if (!drag) return;
    setPos({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
  };
  const onUp = () => setDrag(null);

  return (
    <div className="viewer-overlay">
      <div className="viewer-header">
        <div>
          <h3>{d.t}</h3>
          <div className="viewer-count">
            {idx + 1} of {docs.length} · zoom {Math.round(scale * 100)}% · rotation {rot}°
          </div>
        </div>
        <div className="viewer-controls">
          <button title="Zoom out" onClick={() => setScale((s) => Math.max(0.5, s - 0.5))}><ZoomOut size={18} /></button>
          <button title="Zoom in" onClick={() => setScale((s) => Math.min(4, s + 0.5))}><ZoomIn size={18} /></button>
          <button title="Rotate" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={18} /></button>
          <span className="v-div" />
          <button title="Close (Esc)" onClick={onClose}><X size={18} /></button>
        </div>
      </div>
      <div
        className={`viewer-stage ${drag ? "dragging" : ""}`}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      >
        {docs.length > 1 ? (
          <>
            <button className="nav-arrow prev" disabled={idx === 0} onClick={() => nav(-1)}>
              <ChevronLeft size={26} />
            </button>
            <button className="nav-arrow next" disabled={idx === docs.length - 1} onClick={() => nav(1)}>
              <ChevronRight size={26} />
            </button>
          </>
        ) : null}
        <div
          className="viewer-doc"
          style={{
            transform: `translate(${pos.x}px,${pos.y}px) scale(${scale}) rotate(${rot}deg)`,
            cursor: drag ? "grabbing" : "grab",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setDrag({ sx: e.clientX - pos.x, sy: e.clientY - pos.y });
          }}
        >
          <FakeDoc d={d} />
        </div>
      </div>
      {docs.length > 1 ? (
        <div className="viewer-thumbs">
          {docs.map((dd, i) => (
            <button
              key={`${dd.k}-${i}`}
              className={`thumb-btn ${i === idx ? "active" : ""}`}
              onClick={() => {
                setIdx(i);
                setScale(1);
                setRot(0);
                setPos({ x: 0, y: 0 });
              }}
            >
              {dd.t}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
