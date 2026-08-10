// === IMPORTS ===
import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";


// === INTERFACES & TYPES ===
export type EvidenceDocument = {
  id: string;
  title: string;
  urlFetcher: () => Promise<string>;
};

interface EvidenceViewerProps {
  documents: EvidenceDocument[];
  onClose: () => void;
}


// === MAIN COMPONENT ===
export function EvidenceViewer({ documents, onClose }: EvidenceViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Transform states
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activeDoc = documents[activeIndex];

  useEffect(() => {
    let isMounted = true;
    if (!activeDoc) return;

    setIsLoading(true);
    setHasError(false);
    setImageUrl(null);
    setScale(1);
    setRotation(0);
    setTranslate({ x: 0, y: 0 });

    activeDoc.urlFetcher()
      .then((url) => {
        if (isMounted) {
          setImageUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch secure url", err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeDoc]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setActiveIndex((prev) => Math.min(prev + 1, documents.length - 1));
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [documents.length, onClose]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.5, 0.5));
  const handleRotate = () => setRotation((r) => r + 90);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="evidence-viewer-overlay">
      <div className="evidence-viewer-header">
        <div>
          <h3>{activeDoc?.title || "Document"}</h3>
          <span className="evidence-count">{activeIndex + 1} of {documents.length}</span>
        </div>
        <div className="evidence-viewer-controls">
          <button onClick={handleZoomOut} aria-label="Zoom out"><ZoomOut size={20} /></button>
          <button onClick={handleZoomIn} aria-label="Zoom in"><ZoomIn size={20} /></button>
          <button onClick={handleRotate} aria-label="Rotate"><RotateCw size={20} /></button>
          <div className="divider"></div>
          <button onClick={onClose} aria-label="Close" className="close-btn"><X size={20} /></button>
        </div>
      </div>

      <div 
        className="evidence-viewer-stage" 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
      >
        {documents.length > 1 && (
          <button 
            className="nav-btn prev" 
            disabled={activeIndex === 0} 
            onClick={(e) => { e.stopPropagation(); setActiveIndex(a => a - 1); }}
          >
            <ChevronLeft size={32} />
          </button>
        )}

        <div className="evidence-viewer-content">
          {isLoading && (
            <div className="evidence-skeleton">
              <div className="spinner"></div>
              <p>Fetching secure document...</p>
            </div>
          )}
          {hasError && (
            <div className="evidence-error">
              <AlertTriangle size={48} />
              <p>Image failed to load — request re-upload.</p>
            </div>
          )}
          {!isLoading && !hasError && imageUrl && (
            <div 
              className="evidence-image-container"
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: isDragging ? "grabbing" : "grab"
              }}
              onMouseDown={handleMouseDown}
            >
              <img 
                src={imageUrl} 
                alt={activeDoc?.title} 
                draggable={false}
                onError={() => setHasError(true)}
              />
            </div>
          )}
        </div>

        {documents.length > 1 && (
          <button 
            className="nav-btn next" 
            disabled={activeIndex === documents.length - 1} 
            onClick={(e) => { e.stopPropagation(); setActiveIndex(a => a + 1); }}
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {documents.length > 1 && (
        <div className="evidence-viewer-thumbnails">
          {documents.map((doc, idx) => (
            <button 
              key={doc.id} 
              className={`thumbnail-btn ${idx === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(idx)}
            >
              {doc.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
