/* ────────────────────────────────────────────────────────────────────────
   EvidenceViewer.tsx — full-screen evidence overlay: zoom / rotate / drag
   with keyboard support (← → navigate, Esc close).

   Documents are REAL. Each doc carries the backend KycDocument id; the
   viewer exchanges it for a short-lived signed URL via
   GET /api/v1/kyc/documents/:documentId/url and renders the image/object
   the object store returns. Nothing here is a mockup.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import type { MouseEvent as RMouseEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Loader2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ViewerDoc } from "../opsTypes";
import { opsApi } from "../opsApi";

export type { ViewerDoc };

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
  const [url, setUrl] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const d = docs[idx];
  const docKey = d ? `${d.id ?? d.url ?? ""}#${d.t}` : "";

  /* Reset the viewport whenever the displayed document changes. Done during
     render (React's "adjust state on prop change" pattern) rather than in an
     effect, which would double-render on every navigation. */
  const [lastKey, setLastKey] = useState(docKey);
  if (lastKey !== docKey) {
    setLastKey(docKey);
    setScale(1);
    setRot(0);
    setPos({ x: 0, y: 0 });
  }

  const nav = useCallback(
    (dir: number) => {
      setIdx((i) => Math.max(0, Math.min(docs.length - 1, i + dir)));
    },
    [docs.length],
  );

  /* Resolve the current document. A direct `url` (e.g. a milestone
     deliverable) is used as-is; a KycDocument `id` is exchanged for a
     short-lived signed URL. Nothing is mocked. */
  useEffect(() => {
    if (!d) return;
    if (d.url) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setUrl(d.url);
      setLoadErr(null);
      setLoading(false);
      return;
    }
    if (!d.id) {
      setUrl(null);
      setLoadErr("This document has no viewable source.");
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadErr(null);
    setUrl(null);
    opsApi
      .kycDocumentUrl(d.id)
      .then((r) => {
        if (alive) setUrl(r.url);
      })
      .catch((e: unknown) => {
        if (alive) {
          setLoadErr(e instanceof Error ? e.message : "Could not load document");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [d]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowRight") { e.preventDefault(); nav(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); nav(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, onClose]);

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
            {d.name ? ` · ${d.name}` : ""}
          </div>
        </div>
        <div className="viewer-controls">
          <button title="Zoom out" onClick={() => setScale((s) => Math.max(0.5, s - 0.5))}><ZoomOut size={18} /></button>
          <button title="Zoom in" onClick={() => setScale((s) => Math.min(4, s + 0.5))}><ZoomIn size={18} /></button>
          <button title="Rotate" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={18} /></button>
          {url ? (
            <a
              className="v-link"
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Open the underlying file in a new tab"
            >
              <ExternalLink size={16} />
            </a>
          ) : null}
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
          {loading ? (
            <div className="viewer-status">
              <Loader2 size={22} className="spin" /> Fetching a secure link…
            </div>
          ) : loadErr ? (
            <div className="viewer-status err">
              <FileWarning size={22} />
              <div style={{ marginTop: 8 }}>{loadErr}</div>
              <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 6 }}>
                Signed links expire after 300 seconds.
              </div>
            </div>
          ) : url ? (
            <img className="viewer-img" src={url} alt={d.t} draggable={false} />
          ) : null}
        </div>
      </div>
      {docs.length > 1 ? (
        <div className="viewer-thumbs">
          {docs.map((dd, i) => (
            <button
              key={`${dd.id ?? dd.k}-${i}`}
              className={`thumb-btn ${i === idx ? "active" : ""}`}
              onClick={() => setIdx(i)}
            >
              {dd.t}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
