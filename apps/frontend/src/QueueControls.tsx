// === IMPORTS ===
import React, { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";


// === INTERFACES & TYPES ===
export type PaginationState = {
  page: number;
  pageSize: number;
  search: string;
  [key: string]: any; // custom filters like status, etc.
};

export type QueueMeta = {
  total: number;
  page: number;
  pageSize: number;
};

type QueueControlsProps = {
  meta: QueueMeta | null;
  state: PaginationState;
  onChange: (newState: PaginationState) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  customFilters?: React.ReactNode;
};


// === MAIN COMPONENT ===
export function QueueControls({ 
  meta, 
  state, 
  onChange, 
  onRefresh, 
  isRefreshing, 
  lastUpdated, 
  customFilters 
}: QueueControlsProps) {
  const [searchInput, setSearchInput] = useState(state.search || "");
  const [timeAgo, setTimeAgo] = useState("");

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== state.search) {
        onChange({ ...state, search: searchInput, page: 1 });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput, state, onChange]);

  // Ticker for last updated
  useEffect(() => {
    if (!lastUpdated) return;
    const updateTimeAgo = () => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diff < 60) setTimeAgo(`${diff}s ago`);
      else setTimeAgo(`${Math.floor(diff / 60)}m ago`);
    };
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;

  const handlePrev = () => {
    if (state.page > 1) onChange({ ...state, page: state.page - 1 });
  };

  const handleNext = () => {
    if (state.page < totalPages) onChange({ ...state, page: state.page + 1 });
  };

  return (
    <div className="queue-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <div className="search-bar" style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>
          {customFilters}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Last updated: {timeAgo}
            </span>
          )}
          <button 
            className="btn-outline" 
            onClick={onRefresh} 
            disabled={isRefreshing}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? "spin" : ""} />
            Refresh
          </button>
        </div>

      </div>

      {meta && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {((state.page - 1) * meta.pageSize) + 1} to {Math.min(state.page * meta.pageSize, meta.total)} of {meta.total} entries
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              className="btn-outline" 
              onClick={handlePrev} 
              disabled={state.page <= 1}
              style={{ padding: '0.3rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.9rem' }}>Page {state.page} of {totalPages}</span>
            <button 
              className="btn-outline" 
              onClick={handleNext} 
              disabled={state.page >= totalPages}
              style={{ padding: '0.3rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
