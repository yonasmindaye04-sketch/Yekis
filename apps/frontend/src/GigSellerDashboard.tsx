// === IMPORTS ===
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Pause, Plus, Star, Trash2 } from "lucide-react";
import {
  api,
  type CreateGigPayload,
  type Gig,
} from "./api/client";

// === HELPERS ===
const CATEGORIES = [
  { value: "WEB_APP_DEVELOPMENT", label: "Web App Development" },
  { value: "GRAPHIC_DESIGN", label: "Graphic Design" },
  { value: "DIGITAL_MARKETING", label: "Digital Marketing" },
  { value: "CONTENT_WRITING", label: "Content Writing" },
  { value: "TRANSLATION", label: "Translation" },
  { value: "DATA_ENTRY", label: "Data Entry" },
] as const;

const TIERS = ["BASIC", "STANDARD", "PREMIUM"] as const;
type Tier = (typeof TIERS)[number];

interface PackageDraft {
  tier: Tier;
  title: string;
  description: string;
  deliveryDays: string;
  revisionsIncluded: string;
  price: string;
}

const emptyPackage = (tier: Tier): PackageDraft => ({
  tier,
  title: "",
  description: "",
  deliveryDays: "3",
  revisionsIncluded: "1",
  price: "",
});

interface Draft {
  title: string;
  category: string;
  description: string;
  tags: string;
  maxRevisions: string;
  packages: PackageDraft[];
}

const emptyDraft = (): Draft => ({
  title: "",
  category: CATEGORIES[0].value,
  description: "",
  tags: "",
  maxRevisions: "2",
  packages: [emptyPackage("BASIC")],
});

/** ETB cents. Rejects anything that is not a positive number of cents so the
 *  user gets an inline message instead of a 400 from the API. */
function toMinor(etb: string): number | null {
  const n = Number(etb);
  if (!etb.trim() || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const formatBirr = (minor: number) =>
  `ETB ${(minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Mirrors CreateGigInput in packages/schemas so errors surface here rather
 *  than as an opaque validation failure. */
function validate(d: Draft): string | null {
  if (d.title.trim().length < 5) return "Title must be at least 5 characters.";
  if (d.title.trim().length > 120) return "Title cannot exceed 120 characters.";
  if (d.description.trim().length < 20)
    return "Description must be at least 20 characters — buyers need to know what they get.";
  if (d.description.trim().length > 5000)
    return "Description cannot exceed 5000 characters.";

  const tags = d.tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length > 20) return "At most 20 tags.";

  const used = new Set<Tier>();
  for (const p of d.packages) {
    if (used.has(p.tier)) return "Each package tier can only be used once.";
    used.add(p.tier);
    if (p.title.trim().length < 2) return "Every package needs a title.";
    if (p.description.trim().length < 5)
      return "Every package needs a description of at least 5 characters.";
    const days = Number(p.deliveryDays);
    if (!Number.isInteger(days) || days < 1 || days > 365)
      return "Delivery days must be between 1 and 365.";
    const rev = Number(p.revisionsIncluded);
    if (!Number.isInteger(rev) || rev < 0 || rev > 20)
      return "Included revisions must be between 0 and 20.";
    if (toMinor(p.price) === null)
      return "Every package needs a price greater than zero, in ETB.";
  }
  return null;
}

function toPayload(d: Draft): CreateGigPayload {
  return {
    title: d.title.trim(),
    category: d.category,
    description: d.description.trim(),
    tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
    requirements: [],
    autoAcceptOrders: true,
    maxRevisions: Math.min(20, Math.max(0, Number(d.maxRevisions) || 0)),
    packages: d.packages.map((p) => ({
      tier: p.tier,
      title: p.title.trim(),
      description: p.description.trim(),
      deliveryDays: Number(p.deliveryDays),
      revisionsIncluded: Number(p.revisionsIncluded),
      priceMinor: toMinor(p.price)!,
    })),
  };
}

const STATUS_COPY: Record<string, { label: string; tone: string; hint: string }> = {
  DRAFT: {
    label: "Awaiting review",
    tone: "pending",
    hint: "Published? Our team reviews every gig before it goes live. You'll be notified once a decision is made.",
  },
  ACTIVE: {
    label: "Live",
    tone: "success",
    hint: "Visible in the marketplace and can be ordered.",
  },
  PAUSED: {
    label: "Paused",
    tone: "pending",
    hint: "Hidden from buyers. Archive it if you don't plan to relist.",
  },
  REJECTED: {
    label: "Not approved",
    tone: "error",
    hint: "Our team declined this gig. Edit the details and publish a new version.",
  },
  ARCHIVED: {
    label: "Archived",
    tone: "muted",
    hint: "No longer listed.",
  },
};

// === MAIN COMPONENT ===
export function GigSellerDashboard() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<Gig | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  /** Refresh after a mutation. Callers are event handlers, not effects. */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGigs(await api.listMyGigs());
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your gigs.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial fetch writes state only from the promise callbacks, never
     synchronously in the effect body — same pattern as Profile.tsx. */
  useEffect(() => {
    let alive = true;
    api
      .listMyGigs()
      .then((next) => {
        if (!alive) return;
        setGigs(next);
        setLoadError("");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setLoadError(
          e instanceof Error ? e.message : "Could not load your gigs.",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const startCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setError("");
    setNotice("");
  };

  const startEdit = (g: Gig) => {
    setEditing(g);
    setError("");
    setNotice("");
    setDraft({
      title: g.title,
      category: g.category,
      description: g.description ?? "",
      tags: (g.tags ?? []).join(", "),
      maxRevisions: String(g.maxRevisions ?? 2),
      // Packages cannot be changed after creation (UpdateGigInput omits them),
      // so they are shown read-only rather than silently dropped on save.
      packages: (g.packages ?? []).map((p) => ({
        tier: p.tier,
        title: p.title,
        description: p.description,
        deliveryDays: String(p.deliveryDays),
        revisionsIncluded: String(p.revisionsIncluded),
        price: (p.priceMinor / 100).toFixed(2),
      })),
    });
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setError("");
    setNotice("");
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const setPkg = <K extends keyof PackageDraft>(
    index: number,
    key: K,
    value: PackageDraft[K],
  ) => {
    setError("");
    setDraft((d) =>
      d
        ? {
            ...d,
            packages: d.packages.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
          }
        : d,
    );
  };

  const addPackage = () => {
    setDraft((d) => {
      if (!d) return d;
      const free = TIERS.find((t) => !d.packages.some((p) => p.tier === t));
      // The schema caps packages at 3 and there are exactly 3 tiers.
      if (!free || d.packages.length >= 3) return d;
      return { ...d, packages: [...d.packages, emptyPackage(free)] };
    });
  };

  const removePackage = (index: number) => {
    setDraft((d) =>
      d ? { ...d, packages: d.packages.filter((_, i) => i !== index) } : d,
    );
  };

  const save = async () => {
    if (!draft) return;
    const invalid = validate(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.updateGig(editing.id, {
          title: draft.title.trim(),
          category: draft.category,
          description: draft.description.trim(),
          tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
          maxRevisions: Math.min(20, Math.max(0, Number(draft.maxRevisions) || 0)),
        });
        setNotice("Gig updated.");
      } else {
        await api.createGig(toPayload(draft));
        setNotice(
          "Gig submitted for review. It appears in the marketplace once our team approves it.",
        );
      }
      setDraft(null);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your gig.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (g: Gig, status: "PAUSED" | "ARCHIVED") => {
    setError("");
    setNotice("");
    try {
      await api.setGigStatus(g.id, status);
      setNotice(status === "PAUSED" ? "Gig paused." : "Gig archived.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the gig status.");
    }
  };

  const totals = useMemo(
    () => ({
      live: gigs.filter((g) => g.status === "ACTIVE").length,
      pending: gigs.filter((g) => g.status === "DRAFT").length,
    }),
    [gigs],
  );

  // ── the editor takes over the whole view ──
  if (draft) {
    const readOnlyPackages = editing !== null;
    return (
      <section className="platform-content">
        <div className="content-toolbar">
          <div>
            <h2>{editing ? "Edit gig" : "Create a gig"}</h2>
            <p>
              {editing
                ? "Update the details buyers see."
                : "Package a service you can deliver. Our team reviews it before it goes live."}
            </p>
          </div>
          <button className="btn-secondary" onClick={() => { setDraft(null); setEditing(null); }}>
            Cancel
          </button>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="panel" style={{ padding: 20, marginTop: 16 }}>
          <label className="gig-field">
            <span>Title</span>
            <input
              value={draft.title}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder="I will design a modern logo for your brand"
            />
            <em>{draft.title.trim().length}/120</em>
          </label>

          <label className="gig-field">
            <span>Category</span>
            <select value={draft.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="gig-field">
            <span>Description</span>
            <textarea
              value={draft.description}
              maxLength={5000}
              rows={6}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What the buyer receives, how you work, and what you need from them."
            />
            <em>{draft.description.trim().length}/5000 · minimum 20</em>
          </label>

          <label className="gig-field">
            <span>Tags</span>
            <input
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="logo, branding, illustrator"
            />
            <em>Comma separated, up to 20</em>
          </label>

          <label className="gig-field">
            <span>Maximum revisions per order</span>
            <input
              type="number"
              min={0}
              max={20}
              value={draft.maxRevisions}
              onChange={(e) => set("maxRevisions", e.target.value)}
            />
          </label>
        </div>

        <div className="content-toolbar" style={{ marginTop: 24 }}>
          <div>
            <h3>Packages</h3>
            <p>
              {readOnlyPackages
                ? "Package tiers are fixed once a gig is created."
                : "Offer up to three tiers. Buyers pick one when ordering."}
            </p>
          </div>
          {!readOnlyPackages ? (
            <button
              className="btn-secondary"
              onClick={addPackage}
              disabled={draft.packages.length >= 3}
            >
              <Plus size={15} /> Add tier
            </button>
          ) : null}
        </div>

        {draft.packages.map((p, i) => (
          <div className="panel" key={p.tier} style={{ padding: 20, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge">{p.tier}</span>
              {!readOnlyPackages && draft.packages.length > 1 ? (
                <button
                  className="btn-secondary"
                  style={{ marginLeft: "auto" }}
                  onClick={() => removePackage(i)}
                  aria-label={`Remove ${p.tier} package`}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>

            <label className="gig-field">
              <span>Package title</span>
              <input
                value={p.title}
                disabled={readOnlyPackages}
                onChange={(e) => setPkg(i, "title", e.target.value)}
                placeholder="Standard logo package"
              />
            </label>

            <label className="gig-field">
              <span>What is included</span>
              <textarea
                value={p.description}
                rows={3}
                disabled={readOnlyPackages}
                onChange={(e) => setPkg(i, "description", e.target.value)}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <label className="gig-field">
                <span>Delivery days</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={p.deliveryDays}
                  disabled={readOnlyPackages}
                  onChange={(e) => setPkg(i, "deliveryDays", e.target.value)}
                />
              </label>
              <label className="gig-field">
                <span>Revisions included</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={p.revisionsIncluded}
                  disabled={readOnlyPackages}
                  onChange={(e) => setPkg(i, "revisionsIncluded", e.target.value)}
                />
              </label>
              <label className="gig-field">
                <span>Price (ETB)</span>
                <input
                  inputMode="decimal"
                  value={p.price}
                  disabled={readOnlyPackages}
                  onChange={(e) => setPkg(i, "price", e.target.value)}
                  placeholder="1500"
                />
              </label>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn-primary" onClick={() => void save()} disabled={saving}>
            {saving
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Submit for review"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => { setDraft(null); setEditing(null); }}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </section>
    );
  }

  // ── the list ──
  return (
    <section className="platform-content">
      <div className="content-toolbar">
        <div>
          <h2>My gigs</h2>
          <p>Package a service, get orders, and deliver on your own terms.</p>
        </div>
        <button className="btn-primary" onClick={startCreate}>
          <Plus size={16} /> Create a gig
        </button>
      </div>

      {notice ? <p style={{ color: "var(--color-success-text)" }}>{notice}</p> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {loadError ? <div className="form-error">{loadError}</div> : null}

      {loading ? (
        <p>Loading your gigs…</p>
      ) : gigs.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontWeight: 700 }}>You have no gigs yet.</p>
          <p>
            Create one to start selling: pick a category, describe the service, and set up to
            three package tiers with your own prices and delivery times.
          </p>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={startCreate}>
            <Plus size={16} /> Create your first gig
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {gigs.length} gig{gigs.length === 1 ? "" : "s"} · {totals.live} live ·{" "}
            {totals.pending} awaiting review
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {gigs.map((g) => {
              const copy = STATUS_COPY[g.status] ?? {
                label: g.status,
                tone: "muted",
                hint: "",
              };
              const cheapest = (g.packages ?? []).reduce(
                (min, p) => (min === null || p.priceMinor < min ? p.priceMinor : min),
                null as number | null,
              );
              return (
                <div className="panel" key={g.id} style={{ padding: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <strong style={{ fontSize: "1.02rem" }}>{g.title}</strong>
                      <div
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "0.84rem",
                          marginTop: 2,
                        }}
                      >
                        {CATEGORIES.find((c) => c.value === g.category)?.label ?? g.category}
                        {cheapest !== null ? ` · from ${formatBirr(cheapest)}` : ""}
                      </div>
                    </div>

                    <span className={`status-pill ${copy.tone}`}>{copy.label}</span>
                  </div>

                  {copy.hint ? (
                    <p
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "0.84rem",
                        marginTop: 8,
                      }}
                    >
                      {copy.hint}
                    </p>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginTop: 12,
                      flexWrap: "wrap",
                      color: "var(--color-text-tertiary)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <span>
                      <Star size={13} /> {g.ratingCount || 0} rating
                      {g.ratingCount === 1 ? "" : "s"}
                    </span>
                    <span>· {g.viewCount || 0} views</span>
                    <span>
                      · {(g.packages ?? []).length} package
                      {(g.packages ?? []).length === 1 ? "" : "s"}
                    </span>

                    <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button className="btn-secondary" onClick={() => startEdit(g)}>
                        Edit
                      </button>
                      {g.status === "ACTIVE" ? (
                        <button
                          className="btn-secondary"
                          onClick={() => void changeStatus(g, "PAUSED")}
                        >
                          <Pause size={14} /> Pause
                        </button>
                      ) : null}
                      {g.status !== "ARCHIVED" ? (
                        <button
                          className="btn-secondary"
                          onClick={() => void changeStatus(g, "ARCHIVED")}
                        >
                          <Archive size={14} /> Archive
                        </button>
                      ) : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default GigSellerDashboard;
