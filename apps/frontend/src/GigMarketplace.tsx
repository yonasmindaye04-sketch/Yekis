// === IMPORTS ===
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  ChevronDown,
  Clock,
  Code,
  Database,
  Languages,
  Layers,
  Megaphone,
  Package,
  Palette,
  PenTool,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Star,
  Video,
  X,
  Zap,
} from "lucide-react";
import { api, type Gig, type GigPackage } from "./api/client";
import { events } from "./analytics";
import { useI18n } from "./i18n";
import { GIG_MARKETPLACE_COPY } from "./gigMarketplaceCopy";
import { YekisAvatar } from "./components/YekisAvatar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { cn } from "./lib/utils";
import "./GigMarketplace.css";

// === CONSTANTS & LABELS ===
const categoryConfig: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  WEB_APP_DEVELOPMENT: {
    label: "Web App Development",
    icon: <Code size={15} />,
  },
  GRAPHIC_DESIGN: {
    label: "Graphic Design",
    icon: <Palette size={15} />,
  },
  DIGITAL_MARKETING: {
    label: "Digital Marketing",
    icon: <Megaphone size={15} />,
  },
  CONTENT_WRITING: {
    label: "Content Writing",
    icon: <PenTool size={15} />,
  },
  TRANSLATION: {
    label: "Translation",
    icon: <Languages size={15} />,
  },
  DATA_ENTRY: {
    label: "Data Entry",
    icon: <Database size={15} />,
  },
  VIDEO_PRODUCTION: {
    label: "Video Production",
    icon: <Video size={15} />,
  },
  ACCOUNTING_BOOKKEEPING: {
    label: "Accounting & Bookkeeping",
    icon: <Calculator size={15} />,
  },
  LEGAL_RESEARCH: {
    label: "Legal Research",
    icon: <Scale size={15} />,
  },
  DATA_ANALYTICS: {
    label: "Data Analytics",
    icon: <BarChart3 size={15} />,
  },
};

const categories = Object.keys(categoryConfig);

function formatBirr(minor: number): string {
  return `ETB ${(minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// === MAIN COMPONENT ===
export function GigMarketplace() {
  const { language } = useI18n();
  const copy = GIG_MARKETPLACE_COPY[language] ?? GIG_MARKETPLACE_COPY.en;
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("recommended");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Gig | null>(null);
  const [activeTier, setActiveTier] = useState<string>("BASIC");
  const [ordering, setOrdering] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.searchGigs({
        category: category || undefined,
        q: q || undefined,
        page: 1,
        pageSize: 36,
      });
      setGigs(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadErrorFallback);
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
    setOrderSuccess(false);
    try {
      const created = await api.createGigOrder(pkg.id);
      const funded = await api.fundGigOrder(created.id);
      events.escrowFunded("gig_order");
      setOrderSuccess(true);
      setNotice(copy.orderPlacedNotice(formatBirr(funded.totalChargeMinor)));
    } catch (err) {
      setOrderSuccess(false);
      setNotice(err instanceof Error ? err.message : copy.orderFailedFallback);
    } finally {
      setOrdering(false);
    }
  };

  // Sort gigs on client
  const sortedGigs = useMemo(() => {
    const list = [...gigs];
    if (sortBy === "rating") {
      return list.sort((a, b) => b.ratingAverage - a.ratingAverage);
    }
    if (sortBy === "price-asc") {
      return list.sort((a, b) => {
        const pA = (a.packages ?? [])[0]?.priceMinor ?? 0;
        const pB = (b.packages ?? [])[0]?.priceMinor ?? 0;
        return pA - pB;
      });
    }
    if (sortBy === "price-desc") {
      return list.sort((a, b) => {
        const pA = (a.packages ?? [])[0]?.priceMinor ?? 0;
        const pB = (b.packages ?? [])[0]?.priceMinor ?? 0;
        return pB - pA;
      });
    }
    if (sortBy === "delivery") {
      return list.sort((a, b) => {
        const dA = (a.packages ?? [])[0]?.deliveryDays ?? 999;
        const dB = (b.packages ?? [])[0]?.deliveryDays ?? 999;
        return dA - dB;
      });
    }
    return list;
  }, [gigs, sortBy]);

  const averageRating = (r: number) => (r ? r.toFixed(1) : "5.0");

  // When a gig is selected, ensure activeTier points to an available package
  useEffect(() => {
    if (selected && selected.packages && selected.packages.length > 0) {
      const hasTier = selected.packages.some((p) => p.tier === activeTier);
      if (!hasTier) {
        setActiveTier(selected.packages[0].tier);
      }
    }
  }, [selected, activeTier]);

  // Selected Gig Detail View
  if (selected) {
    const packages = selected.packages ?? [];
    const activePkg =
      packages.find((p) => p.tier === activeTier) ?? packages[0];
    const categoryInfo = categoryConfig[selected.category];

    const categoryLabel =
      copy.categories[selected.category] ??
      categoryInfo?.label ??
      selected.category;

    return (
      <section className="afro-gigs-section">
        {/* Navigation Breadcrumb (shadcn UI) */}
        <div className="afro-detail-header-nav">
          <button
            type="button"
            className="afro-back-btn"
            onClick={() => {
              setSelected(null);
              setNotice("");
            }}
          >
            <ArrowLeft size={16} /> {copy.backToMarketplace}
          </button>
          <Breadcrumb className="afro-breadcrumb-text">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={(e) => {
                    e.preventDefault();
                    setSelected(null);
                    setNotice("");
                  }}
                  className="cursor-pointer"
                >
                  {copy.breadcrumbGigs}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={(e) => {
                    e.preventDefault();
                    setSelected(null);
                    setCategory(selected.category);
                    setNotice("");
                  }}
                  className="cursor-pointer"
                >
                  {categoryLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="afro-breadcrumb-current truncate max-w-[280px] sm:max-w-[420px]">
                  {selected.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Global Alert Notification */}
        {notice && (
          <div
            className={`afro-notice-banner ${
              orderSuccess ? "afro-notice-success" : "afro-notice-error"
            }`}
          >
            {notice}
          </div>
        )}

        {/* Two-Column Detail Workspace */}
        <div className="afro-detail-grid">
          {/* Main Left Content */}
          <div className="afro-detail-main">
            {/* Title Block */}
            <div className="afro-detail-title-block">
              <span className="afro-category-tag">
                {categoryLabel}
              </span>
              <h1 className="afro-detail-title">{selected.title}</h1>
              <div className="afro-detail-meta-line">
                <span className="afro-rating-badge">
                  <Star size={15} className="afro-star-icon" />
                  {averageRating(selected.ratingAverage)} (
                  {copy.reviewsCount(selected.ratingCount)})
                </span>
                <span>·</span>
                <span className="afro-delivery-tag">
                  <Clock size={14} />{" "}
                  {copy.turnaroundDays(activePkg?.deliveryDays ?? 3)}
                </span>
                <span>·</span>
                <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                  {copy.escrowProtected}
                </span>
              </div>
            </div>

            {/* Freelancer Profile Spotlight */}
            <div className="afro-seller-detail-card">
              <YekisAvatar
                size={52}
                userId={selected.freelancer?.id || selected.freelancerId}
                displayName={selected.freelancer?.displayName}
                avatarUrl={selected.freelancer?.avatarUrl}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="afro-seller-name-row">
                  <strong style={{ fontSize: "1rem", color: "var(--color-text)" }}>
                    {selected.freelancer?.displayName ||
                      copy.verifiedFreelancerFallback}
                  </strong>
                  <ShieldCheck size={16} className="afro-verified-icon" />
                </div>
                <p className="afro-seller-detail-bio">
                  {selected.freelancer?.bio || copy.specialistBioFallback}
                </p>
                <div className="afro-seller-badges">
                  <span>{copy.locationEthiopia}</span>
                  <span>·</span>
                  <span>{copy.responseTimeBadge}</span>
                  <span>·</span>
                  <span>
                    {copy.completenessLabel(
                      selected.freelancer?.profileCompleteness ?? 95,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Showcase Visual */}
            <div className="afro-detail-showcase">
              {selected.thumbnailUrl ? (
                <img
                  src={selected.thumbnailUrl}
                  alt={selected.title}
                  className="afro-detail-showcase-img"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="afro-card-cover-pattern">
                  {categoryInfo?.icon ?? <Code size={64} />}
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="afro-section-panel">
              <h2 className="afro-section-heading">
                {copy.serviceOverviewHeading}
              </h2>
              <div className="afro-prose">{selected.description}</div>
            </div>

            {/* Requirements Section (if any) */}
            {selected.requirements && selected.requirements.length > 0 && (
              <div className="afro-section-panel">
                <h2 className="afro-section-heading">
                  {copy.requirementsHeading}
                </h2>
                <ul className="afro-checklist">
                  {selected.requirements.map((req, idx) => (
                    <li key={idx} className="afro-checklist-item">
                      <Check size={16} className="afro-check-icon" />
                      <div>
                        <strong>{req.label}</strong>{" "}
                        {req.required && (
                          <span style={{ color: "var(--color-primary)", fontSize: "0.8rem", fontWeight: 700 }}>
                            {copy.requiredTag}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQ Section (if any) */}
            {selected.faqJson && selected.faqJson.length > 0 && (
              <div className="afro-section-panel">
                <h2 className="afro-section-heading">{copy.faqHeading}</h2>
                <div>
                  {selected.faqJson.map((faq, idx) => (
                    <div key={idx} className="afro-faq-item">
                      <h4 className="afro-faq-q">{faq.question}</h4>
                      <p className="afro-faq-a">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Escrow Guarantee Callout */}
            <div className="afro-escrow-promise-box">
              <ShieldCheck size={28} className="afro-trust-icon" />
              <div className="afro-escrow-promise-content">
                <h4 className="afro-escrow-promise-title">
                  {copy.escrowPromiseTitle}
                </h4>
                <p className="afro-escrow-promise-text">
                  {copy.escrowPromiseText}
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Package Selector & Checkout */}
          <div className="afro-detail-sidebar">
            <div className="afro-checkout-card">
              {/* Package Tier Tabs */}
              {packages.length > 1 && (
                <div className="afro-package-tabs">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      className={`afro-pkg-tab ${
                        activeTier === pkg.tier ? "active" : ""
                      }`}
                      onClick={() => setActiveTier(pkg.tier)}
                    >
                      {copy.tiers[pkg.tier] ?? pkg.tier}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Package Details */}
              {activePkg ? (
                <div className="afro-pkg-body">
                  <div className="afro-pkg-price-row">
                    <span className="afro-pkg-tier-name">
                      {copy.packageSuffix(
                        copy.tiers[activePkg.tier] ?? activePkg.tier,
                      )}
                    </span>
                    <span className="afro-pkg-price-major">
                      {formatBirr(activePkg.priceMinor)}
                    </span>
                  </div>

                  <h3 className="afro-pkg-title">{activePkg.title}</h3>
                  <p className="afro-pkg-description">{activePkg.description}</p>

                  <div className="afro-pkg-specs">
                    <div className="afro-spec-item">
                      <Clock size={16} className="afro-spec-icon" />
                      <span>{copy.daysDelivery(activePkg.deliveryDays)}</span>
                    </div>
                    <div className="afro-spec-item">
                      <RefreshCw size={16} className="afro-spec-icon" />
                      <span>
                        {copy.revisionsCount(activePkg.revisionsIncluded)}
                      </span>
                    </div>
                  </div>

                  <button
                    className="afro-order-btn"
                    disabled={ordering}
                    onClick={() => void order(activePkg)}
                  >
                    <Package size={16} />
                    {ordering
                      ? copy.fundingEscrowBtn
                      : copy.orderAndPayBtn(formatBirr(activePkg.priceMinor))}
                  </button>

                  <p className="afro-order-note">{copy.orderNote}</p>
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)" }}>
                  {copy.noPackagesConfigured}
                </div>
              )}
            </div>

            {/* Quick Trust Checklist */}
            <div className="afro-section-panel" style={{ padding: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="afro-trust-item">
                  <ShieldCheck size={18} className="afro-trust-icon" />
                  <div className="afro-trust-content">
                    <span className="afro-trust-title">{copy.zeroRiskTitle}</span>
                    <span className="afro-trust-desc">{copy.zeroRiskDesc}</span>
                  </div>
                </div>
                <div className="afro-trust-item">
                  <Zap size={18} className="afro-trust-icon" />
                  <div className="afro-trust-content">
                    <span className="afro-trust-title">
                      {copy.ethiopianRailsTitle}
                    </span>
                    <span className="afro-trust-desc">
                      {copy.ethiopianRailsDesc}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // === MARKETPLACE BROWSER VIEW ===
  return (
    <section className="afro-gigs-section">
      {/* Afro-Tech Command Hero Banner */}
      <div className="afro-hero-card">
        <h1 className="afro-headline">{copy.heroTitle}</h1>

        <p className="afro-subtitle">{copy.heroSubtitle}</p>

        <div className="afro-trust-strip">
          <div className="afro-trust-item">
            <ShieldCheck size={20} className="afro-trust-icon" />
            <div className="afro-trust-content">
              <span className="afro-trust-title">{copy.trust1Title}</span>
              <span className="afro-trust-desc">{copy.trust1Desc}</span>
            </div>
          </div>
          <div className="afro-trust-item">
            <Zap size={20} className="afro-trust-icon" />
            <div className="afro-trust-content">
              <span className="afro-trust-title">{copy.trust2Title}</span>
              <span className="afro-trust-desc">{copy.trust2Desc}</span>
            </div>
          </div>
          <div className="afro-trust-item">
            <Clock size={20} className="afro-trust-icon" />
            <div className="afro-trust-content">
              <span className="afro-trust-title">{copy.trust3Title}</span>
              <span className="afro-trust-desc">{copy.trust3Desc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Header & Breadcrumb Navigation (shadcn / Watermelon UI) */}
      <nav
        className="afro-category-header-shell"
        aria-label={copy.navAria}
        data-tour="gigs-search-controls"
      >
        {/* Tier 1: Breadcrumb Trail & Quick Meta Controls */}
        <div className="afro-cat-header-top">
          <div className="afro-cat-header-left">
            {category && (
              <button
                type="button"
                className="afro-cat-back-crumb"
                onClick={() => setCategory("")}
                title={copy.resetAllServicesTitle}
                aria-label={copy.backAllServicesAria}
              >
                <ArrowLeft size={14} />
              </button>
            )}

            <Breadcrumb>
              <BreadcrumbList className="afro-breadcrumb-list">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="afro-breadcrumb-link cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      setCategory("");
                    }}
                  >
                    {copy.servicesCrumb}
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      type="button"
                      className="afro-breadcrumb-dropdown-trigger"
                      aria-label={copy.selectCategoryAria}
                    >
                      <span className="afro-breadcrumb-trigger-content">
                        {category ? (
                          <>
                            <span className="afro-breadcrumb-icon">
                              {categoryConfig[category]?.icon}
                            </span>
                            <span className="afro-breadcrumb-active-label">
                              {copy.categories[category] ??
                                categoryConfig[category]?.label}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="afro-breadcrumb-icon">
                              <Layers size={14} />
                            </span>
                            <span className="afro-breadcrumb-active-label">
                              {copy.allServices}
                            </span>
                          </>
                        )}
                        <ChevronDown size={13} className="afro-breadcrumb-chevron" />
                      </span>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="start" className="afro-cat-dropdown-menu">
                      <DropdownMenuItem
                        onClick={() => setCategory("")}
                        className={cn(
                          "afro-cat-dropdown-item cursor-pointer",
                          category === "" && "font-bold text-primary"
                        )}
                      >
                        <Layers size={14} />
                        <span className="flex-1">{copy.allServices}</span>
                        {category === "" && <Check size={14} className="text-primary" />}
                      </DropdownMenuItem>

                      {categories.map((c) => {
                        const conf = categoryConfig[c];
                        const isCurrent = category === c;
                        return (
                          <DropdownMenuItem
                            key={c}
                            onClick={() => setCategory(c)}
                            className={cn(
                              "afro-cat-dropdown-item cursor-pointer",
                              isCurrent && "font-bold text-primary"
                            )}
                          >
                            {conf.icon}
                            <span className="flex-1">
                              {copy.categories[c] ?? conf.label}
                            </span>
                            {isCurrent && <Check size={14} className="text-primary" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="afro-cat-header-right">
            {category && (
              <button
                type="button"
                className="afro-cat-clear-btn"
                onClick={() => setCategory("")}
                title={copy.clearCategoryTitle}
                aria-label={copy.clearCategoryTitle}
              >
                <X size={12} />
                <span>{copy.clearFilterBtn}</span>
              </button>
            )}

            <span className="afro-cat-count-badge">
              {copy.servicesCount(total || sortedGigs.length)}
            </span>
          </div>
        </div>

        {/* Tier 2: Category Navigation Rail — unified with Settings tab styling */}
        <div
          className="afro-cat-header-tabs-wrap"
          role="tablist"
          aria-label={copy.serviceCategoriesAria}
        >
          <button
            type="button"
            role="tab"
            aria-selected={category === ""}
            className={cn(
              "afro-cat-tab-btn",
              category === "" && "active"
            )}
            onClick={() => setCategory("")}
          >
            <Layers size={14} aria-hidden="true" />
            <span>{copy.allServices}</span>
          </button>
          {categories.map((c) => {
            const conf = categoryConfig[c];
            const isCurrent = category === c;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                className={cn(
                  "afro-cat-tab-btn",
                  isCurrent && "active"
                )}
                onClick={() => setCategory(c)}
              >
                {conf.icon}
                <span>{copy.categories[c] ?? conf.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Search & Control Toolbar */}
      <div className="afro-toolbar">
        <div className="afro-search-group">
          <div className="afro-search-input-wrap">
            <Search size={15} className="afro-search-icon" />
            <input
              className="afro-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder={copy.searchPlaceholder}
            />
            {q && (
              <button
                className="afro-search-clear"
                onClick={() => {
                  setQ("");
                  void load();
                }}
                aria-label={copy.clearSearchAria}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="afro-filter-group">
          <span className="afro-count-pill">
            {copy.gigsAvailableCount(total || sortedGigs.length)}
          </span>

          <select
            className="afro-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label={copy.sortAria}
          >
            <option value="recommended">{copy.sortOptions.recommended}</option>
            <option value="rating">{copy.sortOptions.rating}</option>
            <option value="price-asc">{copy.sortOptions.priceAsc}</option>
            <option value="price-desc">{copy.sortOptions.priceDesc}</option>
            <option value="delivery">{copy.sortOptions.delivery}</option>
          </select>
        </div>
      </div>

      {/* Error or Notice Alert */}
      {error && <div className="afro-notice-banner afro-notice-error">{error}</div>}

      {/* Content Grid */}
      {loading ? (
        <div className="afro-gigs-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="afro-skeleton-card" />
          ))}
        </div>
      ) : sortedGigs.length === 0 ? (
        <div className="afro-empty-state">
          <Package size={42} className="afro-empty-icon" />
          <h3 className="afro-empty-title">{copy.emptyTitle}</h3>
          <p className="afro-empty-desc">{copy.emptyDesc}</p>
          {(q || category) && (
            <button
              className="afro-empty-reset-btn"
              onClick={() => {
                setQ("");
                setCategory("");
              }}
            >
              {copy.resetFiltersBtn}
            </button>
          )}
        </div>
      ) : (
        <div className="afro-gigs-grid" data-tour="gigs-catalog-grid">
          {sortedGigs.map((gig) => {
            const cheapest = (gig.packages ?? [])[0];
            const conf = categoryConfig[gig.category];
            const fastestDelivery = (gig.packages ?? []).reduce(
              (min, p) => (p.deliveryDays < min ? p.deliveryDays : min),
              cheapest?.deliveryDays ?? 3,
            );

            return (
              <div
                key={gig.id}
                className="afro-gig-card"
                onClick={() => {
                  setSelected(gig);
                  setNotice("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {/* Visual Cover Banner */}
                <div className="afro-card-cover">
                  {gig.thumbnailUrl ? (
                    <img
                      src={gig.thumbnailUrl}
                      alt={gig.title}
                      className="afro-card-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="afro-card-cover-pattern">
                    {conf?.icon ?? <Code size={48} />}
                  </div>
                  <div className="afro-card-meta-bar">
                    <span className="afro-category-tag">
                      {copy.categories[gig.category] ??
                        conf?.label ??
                        gig.category}
                    </span>
                    <span className="afro-delivery-tag">
                      <Clock size={12} /> {copy.cardDelivery(fastestDelivery)}
                    </span>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="afro-card-body">
                  {/* Seller Header */}
                  <div className="afro-seller-row">
                    <YekisAvatar
                      size={34}
                      userId={gig.freelancer?.id || gig.freelancerId}
                      displayName={gig.freelancer?.displayName}
                      avatarUrl={gig.freelancer?.avatarUrl}
                    />
                    <div className="afro-seller-info">
                      <div className="afro-seller-name-row">
                        <span className="afro-seller-name">
                          {gig.freelancer?.displayName ||
                            copy.verifiedFreelancerFallback}
                        </span>
                        <ShieldCheck size={13} className="afro-verified-icon" />
                      </div>
                      <span className="afro-seller-title">
                        {gig.freelancer?.bio || copy.specialistFallback}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="afro-card-title">{gig.title}</h3>

                  {/* Tags */}
                  {gig.tags && gig.tags.length > 0 && (
                    <div className="afro-tags-row">
                      {gig.tags.slice(0, 3).map((tag, tIdx) => (
                        <span key={tIdx} className="afro-tech-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metrics / Trust */}
                  <div className="afro-card-metric-row">
                    <span className="afro-rating-badge">
                      <Star size={13} className="afro-star-icon" />
                      {averageRating(gig.ratingAverage)}
                      <span className="afro-review-count">
                        ({gig.ratingCount || 12})
                      </span>
                    </span>
                    <span style={{ fontSize: "0.76rem", color: "var(--color-primary)", fontWeight: 700 }}>
                      {copy.escrowProtected}
                    </span>
                  </div>
                </div>

                {/* Card Footer Rail */}
                <div className="afro-card-footer">
                  <div className="afro-price-group">
                    <span className="afro-price-label">{copy.startingAt}</span>
                    <span className="afro-price-value">
                      {cheapest ? formatBirr(cheapest.priceMinor) : "ETB 0.00"}
                    </span>
                  </div>

                  <button
                    className="afro-card-cta-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(gig);
                      setNotice("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {copy.viewPackagesBtn} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default GigMarketplace;
