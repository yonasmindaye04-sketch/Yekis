import { useState } from "react";
import { RefreshCw, Pin } from "lucide-react";
import { opsApi } from "../opsApi";
import { PageHead, useToast } from "../components/ui";

export default function FeaturedTalent() {
  const toast = useToast();
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try { await fn(); toast(message); } catch (e) { toast(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(false); }
  };
  return <div className="fade">
    <PageHead title="Featured Talent" sub="Manage the people promoted on the public landing page." />
    <div className="card" style={{ maxWidth: 720 }}>
      <h3>Pin a freelancer</h3>
      <p className="muted">Use the user ID from the Users console. Pinning is recorded in the audit log.</p>
      <input className="inp" placeholder="Freelancer user ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input className="inp" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input className="inp" placeholder="Internal note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || !userId.trim()} onClick={() => void run(() => opsApi.pinFeaturedUser(userId.trim(), category.trim(), notes.trim() || undefined), "Freelancer pinned.")}><Pin size={14} /> Pin freelancer</button>
    </div>
    <div className="card" style={{ maxWidth: 720, marginTop: 16 }}>
      <h3>Carousel maintenance</h3>
      <p className="muted">Rebuilds the public featured-talent cache from staff pins, ratings, and recent verification.</p>
      <button className="btn btn-ghost" disabled={busy} onClick={() => void run(opsApi.refreshFeaturedCarousel, "Featured carousel refreshed.")}><RefreshCw size={14} /> Refresh carousel</button>
    </div>
  </div>;
}
