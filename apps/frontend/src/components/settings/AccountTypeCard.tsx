import { useEffect, useState } from "react";
import { Check, Briefcase, UserRound, Users } from "lucide-react";
import { api } from "../../api/client";
import { FULL_PLATFORM_COPY } from "../../fullPlatformCopy";
import type { Language } from "../../i18n";
import type { SettingsWorkspaceCopy } from "../../settingsWorkspaceCopy";
import { GlassCard } from "../ui-v2/GlassCard";

/**
 * The account-type switch.
 *
 * WHY A MEMBER MAY CHANGE IT
 * Registration asks one question — "client, freelancer, or both?" — and the
 * answer is what the account is FOR. People get it wrong honestly: a student
 * signs up as a client to post one job, and a month later the same person
 * picks up freelance work. Forcing a second account for that is how a
 * marketplace ends up with duplicated identities, split ratings, and money
 * stranded on an account nobody checks.
 *
 * So the account TYPE is a changeable property of the account, not a
 * one-time answer.
 *
 * WHAT IT DOES NOT DO
 * It does not move anything. Contracts, proposals, jobs, escrow balances and
 * wallet entries keep the role the member held when they were created — the
 * historic record is not rewritten to match the new label. It does not create
 * a second account, and it does not merge one. And it requires a FRESH, STRONG
 * sign-in (the server mounts `requireFreshAuth`), so a tab left open on a
 * shared machine cannot change the account type in passing.
 */

export type AccountRole = "CLIENT" | "FREELANCER" | "BOTH";

const ROLE_OPTIONS: {
  role: AccountRole;
  Icon: typeof Briefcase;
  descKey: "clientDesc" | "freelancerDesc" | "bothDesc";
}[] = [
  { role: "CLIENT", Icon: Briefcase, descKey: "clientDesc" },
  { role: "FREELANCER", Icon: UserRound, descKey: "freelancerDesc" },
  { role: "BOTH", Icon: Users, descKey: "bothDesc" },
];

export interface AccountTypeCardProps {
  /** The role the account holds right now. */
  currentRole: AccountRole;
  language: Language;
  copy: SettingsWorkspaceCopy;
  /** Re-reads the signed-in member, so the shell shows the new type. */
  onUserUpdated?: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  describeError: (err: unknown) => string;
}

export function AccountTypeCard({
  currentRole,
  language,
  copy,
  onUserUpdated,
  onSuccess,
  onError,
  describeError,
}: AccountTypeCardProps) {
  const t = copy.accountType;
  const roles = FULL_PLATFORM_COPY[language]?.roles ?? FULL_PLATFORM_COPY.en.roles;

  const [selected, setSelected] = useState<AccountRole>(currentRole);
  const [saving, setSaving] = useState(false);
  /**
   * The outcome of the last save, shown HERE.
   *
   * The screen-wide banner lives on the security tab, so a member who changed
   * their account type on this tab would get no feedback at all. The outcome
   * of an action belongs next to the action.
   */
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  // The card follows the account: if the role is changed elsewhere (the bot,
  // another tab), the selection follows it too.
  useEffect(() => {
    setSelected(currentRole);
  }, [currentRole]);

  const dirty = selected !== currentRole;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await api.switchAccountRole(selected);
      // The role travels INSIDE the token, so the new pair has to be adopted
      // — otherwise the very next request would still carry the old role.
      api.setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      const message = t.success(roles[selected]);
      setFeedback({ tone: "ok", text: message });
      onSuccess(message);
      await onUserUpdated?.();
    } catch (err) {
      const message = describeError(err);
      setFeedback({ tone: "error", text: message });
      onError(message);
      // Put the selection back where it was: the server refused the change.
      setSelected(currentRole);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard>
      <div className="sh-card-header">
        <div>
          <h3 className="sh-card-title">{t.title}</h3>
          <p className="sh-card-desc">{t.desc}</p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={t.title}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {ROLE_OPTIONS.map((option) => {
          const active = selected === option.role;
          const Icon = option.Icon;
          return (
            <button
              key={option.role}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(option.role)}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "14px 16px",
                borderRadius: 8,
                textAlign: "left",
                color: "inherit",
                cursor: saving ? "not-allowed" : "pointer",
                border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                background: active ? "var(--color-bg-subtle)" : "var(--color-surface)",
              }}
            >
              <Icon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 800,
                    fontSize: "0.92rem",
                  }}
                >
                  {roles[option.role]}
                  {option.role === currentRole && (
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--color-primary)",
                      }}
                    >
                      {t.currentLabel}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: 4,
                    fontSize: "0.78rem",
                    lineHeight: 1.45,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {t[option.descKey]}
                </span>
              </span>
              {active && (
                <span style={{ color: "var(--color-primary)", flexShrink: 0 }}>
                  <Check size={18} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        <button
          type="button"
          className="sh-btn sh-btn-primary"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
        >
          {saving ? t.savingBtn : t.saveBtn}
        </button>
        <span
          style={{
            fontSize: "0.76rem",
            color: "var(--color-text-secondary)",
            flex: 1,
            minWidth: 220,
          }}
        >
          {t.historyNote}
        </span>
      </div>

      {feedback && (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          style={{
            margin: "10px 0 0",
            fontSize: "0.8rem",
            fontWeight: 700,
            color:
              feedback.tone === "ok"
                ? "var(--color-success-text, #15803d)"
                : "var(--color-error-text, #b91c1c)",
          }}
        >
          {feedback.text}
        </p>
      )}
    </GlassCard>
  );
}
