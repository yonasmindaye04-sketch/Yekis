// === IMPORTS ===
import { useEffect, useState } from "react";
import { Package, Search, Star } from "lucide-react";
import { api, type Gig, type GigPackage } from "./api/client";

const categoryLabels: Record<string, string> = {
  WEB_APP_DEVELOPMENT: "Web App Development",
  GRAPHIC_DESIGN: "Graphic Design",
  DIGITAL_MARKETING: "Digital Marketing",
  CONTENT_WRITING: "Content Writing",
  TRANSLATION: "Translation",
  DATA_ENTRY: "Data Entry",
};

const categories = Object.keys(categoryLabels);

function formatBirr(minor: number): string {
  return `ETB ${(minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// === MAIN COMPONENT ===
export function GigMarketplace() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Gig | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.searchGigs({
        category: category || undefined,
        q: q || undefined,
        page: 1,
        pageSize: 24,
      });
      setGigs(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gigs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const order = async (pkg: GigPackage) => {
    setOrdering(true);
    setNotice("");
    try {
      const created = await api.createGigOrder(pkg.id);
      const funded = await api.fundGigOrder(created.id);
      setNotice(
        `Order placed and funded (${formatBirr(funded.totalChargeMinor)}). The freelancer can begin work.`,
      );
      setSelected(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Order failed.");
    } finally {
      setOrdering(false);
    }
  };

  const averageRating = (r: number) => (r ? r.toFixed(1) : "—");

  if (selected) {
    return (
      <section className="platform-content">
        <div className="content-toolbar">
          <div>
            <h2>{selected.title}</h2>
            <p>{categoryLabels[selected.category] ?? selected.category}</p>
          </div>
          <button className="btn-secondary" onClick={() => setSelected(null)}>
            Back to gigs
          </button>
        </div>
        <p style={{ color: "var(--color-text-secondary)" }}>
          {selected.description}
        </p>
        {notice && (
          <p className="single-chat-error" style={{ color: "var(--color-primary)" }}>
            {notice}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {(selected.packages ?? []).map((pkg) => (
            <div key={pkg.id} className="panel" style={{ padding: "16px" }}>
              <span className="eyebrow">{pkg.tier}</span>
              <h3 style={{ margin: "4px 0" }}>{pkg.title}</h3>
              <p style={{ fontSize: 14 }}>{pkg.description}</p>
              <p style={{ fontWeight: 700, margin: "8px 0" }}>
                {formatBirr(pkg.priceMinor)}
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {pkg.deliveryDays} days · {pkg.revisionsIncluded} revisions
              </p>
              <button
                className="btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={ordering}
                onClick={() => void order(pkg)}
              >
                <Package size={16} style={{ marginRight: 6 }} />
                Order & Pay
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="platform-content">
      <div className="content-toolbar">
        <div>
          <h2>Gig marketplace</h2>
          <p>Buy predefined services directly, protected by escrow.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search gigs"
            style={{ padding: "8px 12px", borderRadius: 8 }}
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8 }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabels[c]}
            </option>
          ))}
        </select>
      </div>

      {notice && <p className="single-chat-error">{notice}</p>}
      {error && <p className="single-chat-error">{error}</p>}

      {loading ? (
        <p>Loading gigs…</p>
      ) : (
        <>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {total} gigs available
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {gigs.map((gig) => {
              const cheapest = (gig.packages ?? [])[0];
              return (
                <button
                  key={gig.id}
                  className="panel"
                  onClick={() => setSelected(gig)}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <span className="eyebrow">
                    {categoryLabels[gig.category] ?? gig.category}
                  </span>
                  <strong>{gig.title}</strong>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={14} /> {averageRating(gig.ratingAverage)} (
                    {gig.ratingCount})
                  </span>
                  {cheapest && (
                    <span style={{ fontWeight: 700 }}>
                      from {formatBirr(cheapest.priceMinor)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default GigMarketplace;