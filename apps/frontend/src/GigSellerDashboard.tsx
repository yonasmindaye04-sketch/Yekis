// === IMPORTS ===
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Archive, Pause, Plus, Star, Trash2, Wallet } from "lucide-react";
import {
  api,
  type CreateGigPayload,
  type Gig,
} from "./api/client";
import { useI18n } from "./i18n";
import { GIG_SELLER_DASHBOARD_COPY } from "./gigSellerDashboardCopy";
import {
  ConfirmActionModal,
  EscrowFeeBreakdown,
  formatEtbMajor,
  formatStatusLabel,
  statusTone,
} from "./pages/ops/components/ui";

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

const formatBirr = (minor: number) => formatEtbMajor(minor / 100, true);

/** Mirrors CreateGigInput in packages/schemas so errors surface here rather
 *  than as an opaque validation failure. */
function validate(
  d: Draft,
  copy = GIG_SELLER_DASHBOARD_COPY.en,
): string | null {
  const v = copy.validation;
  if (d.title.trim().length < 5) return v.titleMin;
  if (d.title.trim().length > 120) return v.titleMax;
  if (d.description.trim().length < 20) return v.descMin;
  if (d.description.trim().length > 5000) return v.descMax;

  const tags = d.tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length > 20) return v.tagsMax;

  const used = new Set<Tier>();
  for (const p of d.packages) {
    if (used.has(p.tier)) return v.duplicateTier;
    used.add(p.tier);
    if (p.title.trim().length < 2) return v.pkgTitleMin;
    if (p.description.trim().length < 5) return v.pkgDescMin;
    const days = Number(p.deliveryDays);
    if (!Number.isInteger(days) || days < 1 || days > 365)
      return v.deliveryRange;
    const rev = Number(p.revisionsIncluded);
    if (!Number.isInteger(rev) || rev < 0 || rev > 20)
      return v.revisionsRange;
    if (toMinor(p.price) === null) return v.pricePositive;
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
  const { language, t } = useI18n();
  const copy =
    GIG_SELLER_DASHBOARD_COPY[language] ?? GIG_SELLER_DASHBOARD_COPY.en;
  const gf = t.workspace.gigsFlow;
  const fb = t.workspace.feeBreakdown;
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<Gig | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Gig | null>(null);

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
    const invalid = validate(draft, copy);
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
        setNotice(copy.gigUpdated);
      } else {
        await api.createGig(toPayload(draft));
        setNotice(copy.gigSubmittedReview);
      }
      setDraft(null);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.saveErrorFallback);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (g: Gig, status: "PAUSED" | "ARCHIVED") => {
    setError("");
    setNotice("");
    try {
      await api.setGigStatus(g.id, status);
      setNotice(status === "PAUSED" ? copy.gigPaused : copy.gigArchived);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.statusErrorFallback);
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
            <h2>{editing ? gf.editGigTitle : gf.createGigBtn}</h2>
            <p>{editing ? copy.editSubtitle : copy.createSubtitle}</p>
          </div>
          <button className="btn-secondary" onClick={() => { setDraft(null); setEditing(null); }}>
            {gf.cancelBtn}
          </button>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="sh-card" style={{ padding: 20, marginTop: 16 }}>
          <label className="gig-field">
            <span>{copy.titleLabel}</span>
            <input
              value={draft.title}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder={copy.titlePlaceholder}
            />
            <em>{draft.title.trim().length}/120</em>
          </label>

          <label className="gig-field">
            <span>{copy.categoryLabel}</span>
            <select value={draft.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {copy.categories[c.value] ?? c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="gig-field">
            <span>{copy.descriptionLabel}</span>
            <textarea
              value={draft.description}
              maxLength={5000}
              rows={6}
              onChange={(e) => set("description", e.target.value)}
              placeholder={copy.descriptionPlaceholder}
            />
            <em>{copy.descriptionCounter(draft.description.trim().length)}</em>
          </label>

          <label className="gig-field">
            <span>{copy.tagsLabel}</span>
            <input
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder={copy.tagsPlaceholder}
            />
            <em>{copy.tagsHint}</em>
          </label>

          <label className="gig-field">
            <span>{copy.maxRevisionsLabel}</span>
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
            <h3>{gf.packagesTitle}</h3>
            <p>
              {readOnlyPackages
                ? copy.packagesFixedHint
                : copy.packagesFlexibleHint}
            </p>
          </div>
          {!readOnlyPackages ? (
            <button
              className="btn-secondary"
              onClick={addPackage}
              disabled={draft.packages.length >= 3}
            >
              <Plus size={15} /> {gf.addTierBtn}
            </button>
          ) : null}
        </div>

        {draft.packages.map((p, i) => (
          <div className="sh-card" key={p.tier} style={{ padding: 20, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge">{copy.tiers[p.tier] ?? p.tier}</span>
              {!readOnlyPackages && draft.packages.length > 1 ? (
                <button
                  className="btn-secondary"
                  style={{ marginLeft: "auto" }}
                  onClick={() => removePackage(i)}
                  aria-label={copy.removePackageAria(copy.tiers[p.tier] ?? p.tier)}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>

            <label className="gig-field">
              <span>{gf.packageTitleLabel}</span>
              <input
                value={p.title}
                disabled={readOnlyPackages}
                onChange={(e) => setPkg(i, "title", e.target.value)}
                placeholder={copy.packageTitlePlaceholder}
              />
            </label>

            <label className="gig-field">
              <span>{gf.whatIncludedLabel}</span>
              <textarea
                value={p.description}
                rows={3}
                disabled={readOnlyPackages}
                onChange={(e) => setPkg(i, "description", e.target.value)}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <label className="gig-field">
                <span>{gf.deliveryDaysLabel}</span>
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
                <span>{gf.revisionsLabel}</span>
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
                <span>{gf.priceEtbLabel}</span>
                <input
                  inputMode="decimal"
                  value={p.price}
                  disabled={readOnlyPackages}
                  onChange={(e) => setPkg(i, "price", e.target.value)}
                  placeholder={copy.pricePlaceholder}
                />
              </label>
            </div>

            {/* Inline Escrow & Net Payout Breakdown per Package (FR-02) */}
            {Number(p.price) > 0 && (
              <div style={{ marginTop: 12 }}>
                <EscrowFeeBreakdown
                  grossEtb={Number(p.price)}
                  compact
                  labels={{
                    ...fb,
                    title: `${copy.tiers[p.tier] ?? p.tier} · ${fb.title}`,
                  }}
                />
              </div>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn-primary" onClick={() => void save()} disabled={saving}>
            {saving
              ? copy.savingBtn
              : editing
                ? gf.saveChangesBtn
                : gf.submitReviewBtn}
          </button>
          <button
            className="btn-secondary"
            onClick={() => { setDraft(null); setEditing(null); }}
            disabled={saving}
          >
            {gf.cancelBtn}
          </button>
        </div>
      </section>
    );
  }

  // ── the list ──
  return (
    <section className="platform-content">
      {/* Section Header */}
      <div className="sh-card-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="sh-card-title" style={{ fontSize: "1.25rem" }}>
            {gf.myGigsTitle}
          </h2>
          <p className="sh-card-desc">
            {gf.myGigsDesc}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="sh-kbd">
            {copy.liveTotalBadge(totals.live, gigs.length)}
          </span>
          <button className="sh-btn sh-btn-primary" onClick={startCreate}>
            <Plus size={15} /> {gf.createGigBtn}
          </button>
        </div>
      </div>

      {/* KPI Stat Strip */}
      <div className="sh-kpi-grid" style={{ marginBottom: 20 }}>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{copy.kpiLiveGigs}</span>
            <Star size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{totals.live}</div>
          <div className="sh-kpi-sub">{copy.kpiLiveGigsSub}</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{copy.kpiActiveOrders}</span>
            <Activity size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">—</div>
          <div className="sh-kpi-sub">{copy.kpiActiveOrdersSub}</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{copy.kpiTotalEarnings}</span>
            <Wallet size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">ETB —</div>
          <div className="sh-kpi-sub">{copy.kpiTotalEarningsSub}</div>
        </div>
        <div className="sh-card sh-kpi-card">
          <div className="sh-kpi-top">
            <span className="sh-kpi-label">{copy.kpiTotalGigs}</span>
            <Archive size={15} className="sh-text-muted" />
          </div>
          <div className="sh-kpi-value sh-mono">{gigs.length}</div>
          <div className="sh-kpi-sub">{copy.kpiTotalGigsSub}</div>
        </div>
      </div>

      {notice ? <p style={{ color: "var(--color-success-text)" }}>{notice}</p> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {loadError ? <div className="form-error">{loadError}</div> : null}

      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          {[1, 2].map((idx) => (
            <div className="sh-card" key={idx} style={{ padding: 18 }}>
              <div className="sh-skeleton" style={{ height: 20, width: "45%", marginBottom: 10 }} />
              <div className="sh-skeleton" style={{ height: 14, width: "65%", marginBottom: 14 }} />
              <div className="sh-skeleton" style={{ height: 34, width: "100%" }} />
            </div>
          ))}
        </div>
      ) : gigs.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontWeight: 700 }}>{gf.noGigsTitle}</p>
          <p>{gf.noGigsDesc}</p>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={startCreate}>
            <Plus size={16} /> {gf.createFirstGigBtn}
          </button>
        </div>
      ) : (
        <>
          <p className="sh-mono" style={{ color: "var(--color-text-secondary)" }}>
            {copy.summaryLine(gigs.length, totals.live, totals.pending)}
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {gigs.map((g) => {
              const statusHint = copy.statusHints[g.status] ?? STATUS_COPY[g.status]?.hint ?? "";
              const cheapest = (g.packages ?? []).reduce(
                (min, p) => (min === null || p.priceMinor < min ? p.priceMinor : min),
                null as number | null,
              );
              return (
                <div className="sh-card" key={g.id} style={{ padding: 18 }}>
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
                        {copy.categories[g.category] ??
                          CATEGORIES.find((c) => c.value === g.category)?.label ??
                          g.category}
                        {cheapest !== null ? (
                          <span className="sh-mono"> · {copy.fromPrice(formatBirr(cheapest))}</span>
                        ) : (
                          ""
                        )}
                      </div>
                    </div>

                    <span className={`status-pill ${statusTone(g.status)}`}>
                      {formatStatusLabel(g.status, t.workspace.statuses)}
                    </span>
                  </div>

                  {statusHint ? (
                    <p
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "0.84rem",
                        marginTop: 8,
                      }}
                    >
                      {statusHint}
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
                    <span className="sh-mono">
                      <Star size={13} /> {copy.ratingsCount(g.ratingCount || 0)}
                    </span>
                    <span className="sh-mono">· {copy.viewsCount(g.viewCount || 0)}</span>
                    <span className="sh-mono">
                      · {copy.packagesCount((g.packages ?? []).length)}
                    </span>

                    <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button className="btn-secondary" onClick={() => startEdit(g)}>
                        {gf.editBtn}
                      </button>
                      {g.status === "ACTIVE" ? (
                        <button
                           className="btn-secondary"
                          onClick={() => void changeStatus(g, "PAUSED")}
                        >
                          <Pause size={14} /> {gf.pauseBtn}
                        </button>
                      ) : null}
                      {g.status !== "ARCHIVED" ? (
                        <button
                          className="btn-secondary"
                          onClick={() => setArchiveTarget(g)}
                        >
                          <Archive size={14} /> {gf.archiveBtn}
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

      {/* Archive Gig Confirmation Modal (FR-04) */}
      <ConfirmActionModal
        open={archiveTarget !== null}
        title={gf.archiveConfirmTitle}
        description={gf.archiveConfirmDesc}
        summaryRows={
          archiveTarget
            ? [
                { label: copy.archiveSummaryGig, value: archiveTarget.title },
                {
                  label: copy.archiveSummaryStatus,
                  value: formatStatusLabel(
                    archiveTarget.status,
                    t.workspace.statuses,
                  ),
                },
              ]
            : undefined
        }
        confirmLabel={gf.archiveBtn}
        cancelLabel={gf.cancelBtn}
        tone="danger"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (!archiveTarget) return;
          const target = archiveTarget;
          setArchiveTarget(null);
          void changeStatus(target, "ARCHIVED");
        }}
      />
    </section>
  );
}

export default GigSellerDashboard;
