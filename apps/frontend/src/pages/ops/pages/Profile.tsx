/* ─────────────────────────────────────────────���──────────────────────────
   Profile.tsx — self-service profile editor for staff and administrators.

   Staff sign in to review other people's profiles all day; this page lets
   them maintain their own without leaving the console. Writes go to
   PATCH /api/v1/users/me/profile, which is open to every authenticated
   account — see profile.routes.ts for why profile edits are not KYC-gated.

   The same profile is what clients see on a public freelancer page, so the
   form is deliberately plain: name, bio, availability and visibility, with
   the live completeness score and a character counter as feedback.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Eye,
  RefreshCw,
  Save,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { api } from "../../../api/client";
import type { SelfProfile, UpdateProfilePayload } from "../../../api/client";
import { useOpsUi } from "../opsUiContext";
import { Banner, ErrorBox, Kv, LoadingBox, PageHead, SecTitle } from "../components/ui";

type Visibility = "PUBLIC" | "PROPOSERS" | "PRIVATE";

const VISIBILITY: { value: Visibility; label: string; help: string }[] = [
  {
    value: "PUBLIC",
    label: "Public",
    help: "Anyone on Yekis can find and view your full profile.",
  },
  {
    value: "PROPOSERS",
    label: "Clients and proposers only",
    help: "Full details are revealed only to people you already have a contract or proposal with.",
  },
  {
    value: "PRIVATE",
    label: "Private",
    help: "Only you and Yekis staff can view your full profile.",
  },
];

/** Mirrors the backend's firstName/lastName regex so the error surfaces here
 *  rather than as a round-trip 400. */
const NAME_RE = /^[\p{L}\s-]{1,50}$/u;
const BIO_MAX = 2000;

interface Draft {
  firstName: string;
  lastName: string;
  bio: string;
  isAvailableForWork: boolean;
  profileVisibility: Visibility;
}

const toDraft = (p: SelfProfile): Draft => ({
  firstName: p.firstName ?? "",
  lastName: p.lastName ?? "",
  bio: p.bio ?? "",
  isAvailableForWork: p.isAvailableForWork ?? false,
  profileVisibility: (p.profileVisibility ?? "PUBLIC") as Visibility,
});

export default function ProfilePage() {
  const { account, toast } = useOpsUi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const p = await api.getSelfProfile(account.id);
      setProfile(p);
      setDraft(toDraft(p));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your profile");
    } finally {
      setLoading(false);
    }
  }, [account]);

  /* Initial fetch writes state only from the promise callbacks, never
     synchronously in the effect body, so the first paint is not a cascading
     render. `reload` below is the event-handler path for the Refresh button. */
  useEffect(() => {
    if (!account) return;
    let alive = true;
    api
      .getSelfProfile(account.id)
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        setDraft(toDraft(p));
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load your profile");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [account]);

  const dirty = isDirty(draft, profile);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false);
    setFieldError(null);
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const save = async () => {
    if (!draft) return;

    // Validate locally first so the reviewer gets an inline message instead
    // of a generic validation failure from the API.
    if (draft.firstName.trim() && !NAME_RE.test(draft.firstName.trim())) {
      setFieldError("First name may only contain letters, spaces and hyphens (max 50).");
      return;
    }
    if (draft.lastName.trim() && !NAME_RE.test(draft.lastName.trim())) {
      setFieldError("Last name may only contain letters, spaces and hyphens (max 50).");
      return;
    }
    if (draft.bio.length > BIO_MAX) {
      setFieldError(`Bio cannot exceed ${BIO_MAX} characters.`);
      return;
    }

    const payload: UpdateProfilePayload = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      bio: draft.bio.trim(),
      isAvailableForWork: draft.isAvailableForWork,
      profileVisibility: draft.profileVisibility,
    };

    setSaving(true);
    setFieldError(null);
    try {
      const updated = await api.updateProfile(payload);
      setProfile(updated);
      setDraft(toDraft(updated));
      setSaved(true);
      toast("Profile updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save your profile";
      setFieldError(msg);
      toast("Could not save your profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !draft) return <LoadingBox />;
  if (error && !draft) return <ErrorBox error={error} reload={() => void load()} />;
  if (!draft) return null;

  const initials =
    `${draft.firstName.charAt(0)}${draft.lastName.charAt(0)}`.toUpperCase() ||
    (account?.email.charAt(0) ?? "S").toUpperCase();
  const completeness = profile?.profileCompleteness ?? 0;
  const visibility = VISIBILITY.find((v) => v.value === draft.profileVisibility)!;

  return (
    <div className="fade">
      <PageHead
        title="My Profile"
        sub="How you appear to clients, and to other staff reviewing your account"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => void load()} disabled={saving}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => void save()} disabled={saving || !dirty}>
              <Save size={14} /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        }
      />

      <div className="grid g2" style={{ alignItems: "start" }}>
        {/* ── identity summary ── */}
        <div className="card card-pad">
          <SecTitle icon={UserRound}>Account</SecTitle>
          <div className="prof-id">
            <div className="avatar-lg" aria-hidden>
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="prof-name">
                {draft.firstName || draft.lastName
                  ? `${draft.firstName} ${draft.lastName}`.trim()
                  : "Name not set"}
              </div>
              <div className="prof-mail">{account?.email}</div>
              <div style={{ marginTop: 6 }}>
                <span className="pill p-violet">
                  <span className="pdot" />
                  {account?.roleLabel ?? "Staff"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid g2" style={{ marginTop: 16, gap: 10 }}>
            <Kv k="Profile completeness" v={`${completeness}%`} />
            <Kv k="Availability" v={draft.isAvailableForWork ? "Open to work" : "Not available"} />
          </div>

          <div className="meter" role="img" aria-label={`Profile ${completeness}% complete`}>
            <span style={{ width: `${Math.max(0, Math.min(100, completeness))}%` }} />
          </div>
          <p className="hint">
            {completeness >= 100
              ? "Your profile is complete."
              : "Add a name and bio to reach 100% — clients filter on this."}
          </p>
        </div>

        {/* ── the form ── */}
        <div className="card card-pad">
          <SecTitle icon={BadgeCheck}>Public details</SecTitle>

          {fieldError ? (
            <div className="banner b-red" style={{ marginBottom: 14 }}>
              <span className="banner-ic">
                <TriangleAlert size={18} />
              </span>
              <div>{fieldError}</div>
            </div>
          ) : null}

          <div className="grid g2" style={{ gap: 12 }}>
            <label className="field">
              <span className="field-l">First name</span>
              <input
                className="inp"
                value={draft.firstName}
                maxLength={50}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Abebe"
              />
            </label>
            <label className="field">
              <span className="field-l">Last name</span>
              <input
                className="inp"
                value={draft.lastName}
                maxLength={50}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Kebede"
              />
            </label>
          </div>

          <label className="field" style={{ marginTop: 12 }}>
            <span className="field-l">
              Bio
              <em className={draft.bio.length > BIO_MAX ? "over" : undefined}>
                {draft.bio.length}/{BIO_MAX}
              </em>
            </span>
            <textarea
              className="inp-t"
              value={draft.bio}
              maxLength={BIO_MAX + 200}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="What you do, the kinds of work you take, and how you work."
            />
            <span className="hint">
              Contact details are stripped from bios automatically.
            </span>
          </label>

          <hr className="hr" />

          <div className="field-row">
            <div>
              <div className="field-l">Open to work</div>
              <div className="hint">Signals availability on your public profile.</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.isAvailableForWork}
              aria-label="Open to work"
              className={`switch ${draft.isAvailableForWork ? "on" : ""}`}
              onClick={() => set("isAvailableForWork", !draft.isAvailableForWork)}
            >
              <span />
            </button>
          </div>

          <hr className="hr" />

          <label className="field">
            <span className="field-l">Profile visibility</span>
            <select
              className="sel"
              value={draft.profileVisibility}
              onChange={(e) => set("profileVisibility", e.target.value as Visibility)}
            >
              {VISIBILITY.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="hint">
              <Eye size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {visibility.help}
            </span>
          </label>

          {saved && !dirty ? (
            <div style={{ marginTop: 14 }}>
              <Banner
                tone="b-green"
                icon={BadgeCheck}
                strong="Saved."
                rest="Your changes are live on your profile."
              />
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-ghost"
              onClick={() => profile && setDraft(toDraft(profile))}
              disabled={saving || !dirty}
            >
              Discard
            </button>
            <button className="btn btn-primary" onClick={() => void save()} disabled={saving || !dirty}>
              <Save size={14} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** True when the draft differs from the last persisted profile. */
function isDirty(draft: Draft | null, profile: SelfProfile | null): boolean {
  if (!draft || !profile) return false;
  const saved = toDraft(profile);
  return (
    draft.firstName !== saved.firstName ||
    draft.lastName !== saved.lastName ||
    draft.bio !== saved.bio ||
    draft.isAvailableForWork !== saved.isAvailableForWork ||
    draft.profileVisibility !== saved.profileVisibility
  );
}