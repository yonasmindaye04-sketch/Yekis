import { useState } from "react";
import { Check, RefreshCw, Search, X } from "lucide-react";
import { opsApi, opsListApi } from "../opsApi";
import { useListPage } from "../opsList";
import type { RawGigModeration } from "../opsBackend";
import { Empty, ErrorBox, FilterSelect, LoadingBox, PageHead, Pager, Pill, useToast, Button, Card } from "../components/ui";

const money = (minor: number) => `${(minor / 100).toLocaleString()} ETB`;

export default function GigModeration() {
  const toast = useToast();
  const [status, setStatus] = useState("DRAFT");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useListPage<RawGigModeration>(
    (p) => opsListApi.gigs({ ...p, status }),
    25,
    [status],
  );
  const active = list.rows.find((g) => g.id === selected) ?? null;

  const decide = async (next: "ACTIVE" | "REJECTED") => {
    if (!active || busy) return;
    if (next === "REJECTED" && reason.trim().length < 10) {
      toast("Add a rejection reason of at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      await opsApi.moderateGig(active.id, next, reason.trim() || undefined);
      toast(next === "ACTIVE" ? "Gig approved and published." : "Gig rejected.");
      setSelected(null);
      setReason("");
      list.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update gig");
    } finally {
      setBusy(false);
    }
  };

  if (list.loading && list.rows.length === 0) return <LoadingBox />;
  if (list.error && list.rows.length === 0) return <ErrorBox error={list.error} reload={list.reload} />;

  return (
    <div className="fade">
      <PageHead
        title="Gig Moderation"
        sub="Review listings before they become visible to clients."
        right={<Button variant="outline" onClick={list.reload}><RefreshCw size={14} /> Refresh</Button>}
      />
      <Card className="card filters">
        <div className="f-search"><Search size={15} /><input placeholder="Search title or freelancer…" value={list.search} onChange={(e) => list.setSearch(e.target.value)} /></div>
        <FilterSelect value={status} onChange={setStatus} options={["DRAFT", "ACTIVE", "REJECTED", "PAUSED", "ARCHIVED"]} allLabel="All statuses" label="Gig status" />
      </Card>
      <div className="queue-wrap">
        <div className="queue-list">
          {list.rows.length === 0 ? <Card className="card" style={{ padding: 36, textAlign: "center" }}><Empty>No gigs in this queue.</Empty></Card> : list.rows.map((gig) => (
            <button key={gig.id} className={`q-card ${selected === gig.id ? "selected" : ""}`} onClick={() => setSelected(gig.id)}>
              <div className="q-head"><strong>{gig.title}</strong><Pill s={gig.status} /></div>
              <div className="q-sub"><span className="subject">{gig.freelancer.displayName || gig.freelancer.email}</span><span className="q-date">{new Date(gig.updatedAt).toLocaleDateString()}</span></div>
              <div className="q-sub" style={{ marginTop: 5 }}>{gig.category.replaceAll("_", " ")}</div>
            </button>
          ))}
          <Pager page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} unit="gigs" />
        </div>
        <Card className="queue-detail card">
          {active ? <>
            <div className="qd-head"><h3 style={{ margin: 0 }}>{active.title}</h3><div className="qd-meta">{active.freelancer.email} · {active.status}</div></div>
            <div className="qd-body">
              <p>{active.description}</p>
              <p><strong>Category:</strong> {active.category.replaceAll("_", " ")}</p>
              <p><strong>Packages:</strong> {active.packages.map((p) => `${p.tier} ${money(p.priceMinor)} / ${p.deliveryDays}d`).join(" · ") || "None"}</p>
              <textarea className="inp" rows={4} placeholder="Reason for rejection or internal moderation note…" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button disabled={busy} onClick={() => void decide("ACTIVE")}><Check size={14} /> Approve & publish</Button>
                <Button variant="destructive" disabled={busy} onClick={() => void decide("REJECTED")}><X size={14} /> Reject</Button>
              </div>
            </div>
          </> : <div className="qd-body"><Empty>Select a gig to review.</Empty></div>}
        </Card>
      </div>
    </div>
  );
}
