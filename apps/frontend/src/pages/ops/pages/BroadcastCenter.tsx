/* ────────────────────────────────────────────────────────────────────────
   BroadcastCenter.tsx — compose, preview, test and send Telegram broadcasts.

   The composer holds one draft at a time. What the preview shows is what the
   backend renders: escaped Telegram HTML with a bold heading, an optional image
   (which drops the caption limit), and an optional URL button. Sending is
   save → confirm → queue, because a delivered message cannot be recalled.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Copy,
  FlaskConical,
  History,
  Link2,
  Megaphone,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import type { TelegramBroadcastInput } from "../../../api/client";
import { dts, opsApi } from "../opsApi";
import type {
  BroadcastAudience,
  BroadcastAudienceOption,
  BroadcastDetail,
  BroadcastList,
  BroadcastSummary,
} from "../opsTypes";
import {
  Card,
  Empty,
  ErrorBox,
  LoadingBox,
  OpsActionModal,
  OpsTable,
  Pager,
  Pill,
  useToast,
} from "../components/ui";

const MAX_TEXT = 4096;
const MAX_CAPTION = 1024;
const PAGE_SIZE = 10;

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  ALL: "Everyone",
  CLIENTS: "Clients",
  FREELANCERS: "Freelancers",
  STAFF: "Staff",
  KYC_VERIFIED: "KYC verified",
};

const STATUS_OPTIONS = [
  "DRAFT",
  "SENDING",
  "SENT",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
] as const;

interface FormState {
  name: string;
  heading: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  audience: BroadcastAudience;
}

const EMPTY_FORM: FormState = {
  name: "",
  heading: "",
  body: "",
  imageUrl: "",
  linkUrl: "",
  linkLabel: "",
  audience: "ALL",
};

const trimmed = (value: string) => value.trim();
const orNull = (value: string) => value.trim() || null;

function fromDetail(broadcast: BroadcastDetail): FormState {
  return {
    name: broadcast.name,
    heading: broadcast.heading ?? "",
    body: broadcast.body,
    imageUrl: broadcast.imageUrl ?? "",
    linkUrl: broadcast.linkUrl ?? "",
    linkLabel: broadcast.linkLabel ?? "",
    audience: broadcast.audience,
  };
}

function toInput(form: FormState): TelegramBroadcastInput {
  return {
    name: trimmed(form.name),
    heading: orNull(form.heading),
    body: trimmed(form.body),
    imageUrl: orNull(form.imageUrl),
    linkUrl: orNull(form.linkUrl),
    linkLabel: form.linkUrl.trim() ? orNull(form.linkLabel) : null,
    audience: form.audience,
  };
}

/** Visible characters, which is what Telegram counts (markup is not text). */
function composedLength(form: FormState): number {
  const heading = trimmed(form.heading);
  return (heading ? heading.length + 2 : 0) + trimmed(form.body).length;
}

function draftLimit(form: FormState): number {
  return form.imageUrl.trim() ? MAX_CAPTION : MAX_TEXT;
}

function describeError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const e = error as { status?: number; code?: string; message?: string };
  if (e.code === "REAUTH_REQUIRED" || e.status === 401) {
    return "Your session needs a fresh sign-in before this can be sent. Sign out and back in, then retry.";
  }
  if (e.code === "STEP_UP_REQUIRED" || (e.status === 403 && e.code === "STEP_UP_REQUIRED")) {
    return "Confirm your identity again (fresh sign-in) before sending.";
  }
  if (e.status === 403) return "Your staff role does not include bot.manage.";
  return e.message ?? "The request failed.";
}

function canDelete(status: BroadcastSummary["status"]): boolean {
  return status === "DRAFT" || status === "CANCELLED" || status === "FAILED";
}

export default function BroadcastCenter() {
  const toast = useToast();
  const [audiences, setAudiences] = useState<BroadcastAudienceOption[]>([]);
  const [list, setList] = useState<BroadcastList | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [selected, setSelected] = useState<BroadcastDetail | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    kind: "send" | "cancel" | "delete";
    id: string;
  }>(null);

  const composerRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await opsApi.broadcasts({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        q: searchTerm || undefined,
      });
      setList(data);
      setListError(null);
    } catch (error) {
      setListError(describeError(error));
    } finally {
      setListLoading(false);
    }
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    void loadList();
  }, [loadList, reloadToken]);

  useEffect(() => {
    let alive = true;
    opsApi
      .broadcastAudiences()
      .then((result) => {
        if (alive) setAudiences(result.audiences);
      })
      .catch(() => {
        /* The library error already explains a permissions or network failure. */
      });
    return () => {
      alive = false;
    };
  }, [reloadToken]);

  /* A run can take minutes. While this one is SENDING, poll the row so the
     counters and the cancel button track the worker instead of a snapshot. */
  useEffect(() => {
    if (!selected || selected.status !== "SENDING") return;
    const id = selected.id;
    const timer = window.setInterval(() => {
      void opsApi
        .broadcast(id)
        .then((detail) => {
          setSelected(detail);
          void loadList();
        })
        .catch(() => {
          /* Keep the last known counters; the next tick retries. */
        });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selected, loadList]);

  useEffect(() => {
    if (list && page > list.pages) setPage(list.pages);
  }, [list, page]);

  const scrollToComposer = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    composerRef.current?.scrollIntoView({
      block: "start",
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const openBroadcast = async (id: string) => {
    setFormError(null);
    try {
      const detail = await opsApi.broadcast(id);
      setSelected(detail);
      setEditingId(detail.id);
      setForm(fromDetail(detail));
      scrollToComposer();
    } catch (error) {
      setFormError(describeError(error));
    }
  };

  const startNew = () => {
    setSelected(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    scrollToComposer();
  };

  /** Creates or updates the draft; returns the saved row, or null on failure. */
  const persist = async (): Promise<BroadcastDetail | null> => {
    setFormError(null);
    try {
      const input = toInput(form);
      const saved = editingId
        ? await opsApi.updateBroadcast(editingId, input)
        : await opsApi.createBroadcast(input);
      setSelected(saved);
      setEditingId(saved.id);
      setForm(fromDetail(saved));
      refresh();
      return saved;
    } catch (error) {
      setFormError(describeError(error));
      return null;
    }
  };

  const handleSave = async () => {
    if (composedLength(form) > draftLimit(form)) {
      setFormError(
        `The message is ${composedLength(form)} characters. Telegram accepts ${draftLimit(form)} with ${form.imageUrl.trim() ? "an image" : "text only"}. Shorten the body and save again.`
      );
      bodyRef.current?.focus();
      return;
    }
    setBusy("save");
    const saved = await persist();
    setBusy(null);
    if (saved) toast(editingId ? "Draft updated." : "Draft saved.");
  };

  const handleTest = async () => {
    setBusy("test");
    let id = editingId;
    if (editable) {
      const saved = await persist();
      if (!saved) {
        setBusy(null);
        return;
      }
      id = saved.id;
    }
    if (!id) {
      setBusy(null);
      setFormError("Save the draft before sending a test.");
      return;
    }
    try {
      await opsApi.testBroadcast(id);
      toast("Test sent to your own Telegram chat.");
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setBusy(null);
    }
  };

  const handleSendRequest = async () => {
    setBusy("save");
    const saved = await persist();
    setBusy(null);
    if (!saved) return;
    if (saved.status !== "DRAFT") {
      setFormError("This broadcast has already been sent or cancelled.");
      return;
    }
    setConfirm({ kind: "send", id: saved.id });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { kind, id } = confirm;
    setBusy(kind);
    setFormError(null);
    try {
      if (kind === "send") {
        const detail = await opsApi.sendBroadcast(id);
        setSelected(detail);
        setEditingId(detail.id);
        setForm(fromDetail(detail));
        toast(`Delivery started for ${detail.recipientCount.toLocaleString()} members.`);
      } else if (kind === "cancel") {
        const detail = await opsApi.cancelBroadcast(id);
        setSelected(detail);
        toast("Broadcast cancelled. Messages delivered before the cancel stay delivered.");
      } else {
        await opsApi.deleteBroadcast(id);
        if (editingId === id) startNew();
        toast("Broadcast deleted.");
      }
      setConfirm(null);
      refresh();
    } catch (error) {
      setFormError(describeError(error));
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async (id: string) => {
    setBusy("duplicate");
    try {
      const copy = await opsApi.duplicateBroadcast(id);
      setSelected(copy);
      setEditingId(copy.id);
      setForm(fromDetail(copy));
      toast("Copied into a new draft.");
      refresh();
      scrollToComposer();
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setBusy(null);
    }
  };

  const audienceLabel = (audience: BroadcastAudience) =>
    audiences.find((option) => option.audience === audience)?.label ??
    AUDIENCE_LABELS[audience];

  const audienceOption = audiences.find((option) => option.audience === form.audience);
  const reach = audienceOption?.recipients ?? null;
  const editable = !selected || selected.status === "DRAFT";
  const overLimit = composedLength(form) > draftLimit(form);

  const dirty = useMemo(() => {
    if (!selected) return Boolean(form.name || form.heading || form.body);
    const base = fromDetail(selected);
    return (Object.keys(base) as (keyof FormState)[]).some(
      (key) => base[key] !== form[key]
    );
  }, [selected, form]);

  const failures = selected
    ? selected.deliveries.filter((delivery) => delivery.status === "FAILED")
    : [];

  const confirmView = (() => {
    if (!confirm) return null;
    if (confirm.kind === "send") {
      const count =
        audiences.find((option) => option.audience === selected?.audience)?.recipients ??
        selected?.recipientCount ??
        0;
      return {
        title: "Send this broadcast?",
        description: `This queues one Telegram message for each of ${count.toLocaleString()} reachable ${audienceLabel(selected?.audience ?? form.audience).toLowerCase()}. Delivery starts immediately and cannot be recalled. Send a test first if you have not.`,
        confirmLabel: count > 0 ? `Send to ${count.toLocaleString()}` : "Send now",
      };
    }
    if (confirm.kind === "cancel") {
      return {
        title: "Cancel this broadcast?",
        description:
          "Delivery stops after the batch already in flight. Messages sent before the cancel remain delivered and cannot be recalled.",
        confirmLabel: "Cancel broadcast",
      };
    }
    return {
      title: "Delete this broadcast?",
      description:
        "The draft and any delivery evidence for it are removed. This cannot be undone.",
      confirmLabel: "Delete broadcast",
    };
  })();

  return (
    <div className="fade">
      <div className="bc-grid">
        <div ref={composerRef}>
          <Card className="card-pad">
            <form
              className="bc-form"
              aria-labelledby="bc-compose-title"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              <h2 className="sec-title" id="bc-compose-title" style={{ marginTop: 0 }}>
                <Megaphone size={16} />
                <span style={{ flex: 1 }}>
                  {editingId ? "Edit broadcast" : "New broadcast"}
                </span>
                {dirty ? <span className="hint">Unsaved changes</span> : null}
              </h2>

              {!editable ? (
                <p className="hint">
                  This broadcast is {selected?.status.toLowerCase()} and can no longer be edited. Duplicate it to make changes.
                </p>
              ) : null}

              <div className="field">
                <label className="field-l" htmlFor="bc-name">
                  <span>Internal name</span>
                  <em>{form.name.length}/120</em>
                </label>
                <input
                  id="bc-name"
                  name="name"
                  className="inp"
                  type="text"
                  value={form.name}
                  maxLength={120}
                  required
                  readOnly={!editable}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="bc-name-hint"
                  onChange={(event) => {
                    setFormError(null);
                    setForm((prev) => ({ ...prev, name: event.target.value }));
                  }}
                />
                <p className="hint" id="bc-name-hint">
                  Admin-only label. Members never see it; it is what the library and delivery log show.
                </p>
              </div>

              <div className="field">
                <label className="field-l" htmlFor="bc-audience">
                  <span>Audience</span>
                </label>
                <select
                  id="bc-audience"
                  name="audience"
                  className="sel"
                  value={form.audience}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      audience: event.target.value as BroadcastAudience,
                    }))
                  }
                >
                  {(audiences.length > 0
                    ? audiences.map((option) => ({
                        audience: option.audience,
                        label: option.label,
                        recipients: option.recipients,
                      }))
                    : (Object.keys(AUDIENCE_LABELS) as BroadcastAudience[]).map((audience) => ({
                        audience,
                        label: AUDIENCE_LABELS[audience],
                        recipients: null as number | null,
                      }))
                  ).map((option) => (
                    <option key={option.audience} value={option.audience}>
                      {option.label}
                      {option.recipients !== null
                        ? ` — ${option.recipients.toLocaleString()} reachable`
                        : ""}
                    </option>
                  ))}
                </select>
                <p className="hint">
                  {audienceOption?.description ??
                    "Only members with a linked Telegram chat, an active account and a non-guest role receive broadcasts."}
                </p>
              </div>

              <div className="field">
                <label className="field-l" htmlFor="bc-heading">
                  <span>Heading (optional)</span>
                  <em>{form.heading.length}/200</em>
                </label>
                <input
                  id="bc-heading"
                  name="heading"
                  className="inp"
                  type="text"
                  value={form.heading}
                  maxLength={200}
                  readOnly={!editable}
                  placeholder="A short, bold title"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, heading: event.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label className="field-l" htmlFor="bc-body">
                  <span>Message</span>
                  <em className={overLimit ? "over" : undefined}>
                    {composedLength(form)}/{draftLimit(form)}
                  </em>
                </label>
                <textarea
                  id="bc-body"
                  name="body"
                  ref={bodyRef}
                  className="inp-t"
                  rows={9}
                  value={form.body}
                  maxLength={MAX_TEXT}
                  required
                  readOnly={!editable}
                  aria-invalid={overLimit}
                  aria-describedby="bc-body-hint"
                  onChange={(event) => {
                    setFormError(null);
                    setForm((prev) => ({ ...prev, body: event.target.value }));
                  }}
                />
                <p className="hint" id="bc-body-hint" aria-live="polite">
                  {form.imageUrl.trim()
                    ? `With an image Telegram allows ${MAX_CAPTION.toLocaleString()} caption characters. `
                    : `Text-only messages allow ${MAX_TEXT.toLocaleString()} characters. `}
                  Line breaks are kept. Markup is not interpreted: the backend escapes the text, so what you type is what members read.
                </p>
              </div>

              <div className="field">
                <label className="field-l" htmlFor="bc-image">
                  <span>Image URL (optional)</span>
                </label>
                <input
                  id="bc-image"
                  name="imageUrl"
                  className="inp"
                  type="url"
                  value={form.imageUrl}
                  maxLength={500}
                  readOnly={!editable}
                  placeholder="https://cdn.example.com/announcement.png"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="bc-image-hint"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                  }
                />
                <p className="hint" id="bc-image-hint">
                  A public HTTPS image. With an image the whole caption (heading and body) must fit in 1,024 characters. If Telegram cannot fetch it, the message is sent as text.
                </p>
              </div>

              <div className="field">
                <label className="field-l" htmlFor="bc-link">
                  <span>Button URL (optional)</span>
                </label>
                <input
                  id="bc-link"
                  name="linkUrl"
                  className="inp"
                  type="url"
                  value={form.linkUrl}
                  maxLength={500}
                  readOnly={!editable}
                  placeholder="https://yekis.com/…"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, linkUrl: event.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label className="field-l" htmlFor="bc-link-label">
                  <span>Button label (optional)</span>
                  <em>{form.linkLabel.length}/60</em>
                </label>
                <input
                  id="bc-link-label"
                  name="linkLabel"
                  className="inp"
                  type="text"
                  value={form.linkLabel}
                  maxLength={60}
                  readOnly={!editable || !form.linkUrl.trim()}
                  placeholder="Open the announcement"
                  aria-describedby="bc-link-label-hint"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, linkLabel: event.target.value }))
                  }
                />
                <p className="hint" id="bc-link-label-hint">
                  Shown only when a button URL is set. Without a label the button reads Open.
                </p>
              </div>

              {overLimit ? (
                <p className="bc-error" role="alert">
                  <AlertTriangle size={13} aria-hidden="true" /> The message is over the Telegram limit. Shorten it, or remove the image to raise the limit to 4,096 characters.
                </p>
              ) : null}

              {formError ? (
                <p className="bc-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="bc-actions">
                <button type="submit" className="btn btn-primary" disabled={busy !== null || !editable}>
                  <Save size={14} /> {editingId ? "Save changes" : "Save draft"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy !== null}
                  onClick={() => void handleTest()}
                >
                  <FlaskConical size={14} /> {busy === "test" ? "Sending test…" : "Send test to me"}
                </button>
                {editable ? (
                  <button
                    type="button"
                    className="btn btn-red"
                    disabled={busy !== null || overLimit}
                    onClick={() => void handleSendRequest()}
                  >
                    <Send size={14} />
                    {reach !== null ? ` Send to ${reach.toLocaleString()}` : " Send broadcast"}
                  </button>
                ) : null}
                <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={startNew}>
                  <Megaphone size={14} /> New
                </button>
              </div>
              <p className="hint">
                Sending asks for confirmation and is audited. Only a saved draft can be sent; the send button saves pending edits first.
              </p>
            </form>
          </Card>
        </div>

        <div className="bc-side">
          <Card className="card-pad">
            <h2 className="sec-title">
              <Send size={16} /> Telegram preview
            </h2>
            <div className="bc-phone">
              <div className="bc-bubble">
                {form.imageUrl.trim() ? (
                  <img
                    className="bc-image"
                    src={form.imageUrl.trim()}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                {form.heading.trim() ? (
                  <strong>{form.heading.trim()}</strong>
                ) : null}
                <p>{form.body.trim() || "Your announcement appears here as members will see it."}</p>
                {form.linkUrl.trim() ? (
                  <span className="bc-link">
                    <Link2 size={13} aria-hidden="true" />
                    {form.linkLabel.trim() || "Open"}
                  </span>
                ) : null}
              </div>
              <p className="hint">
                Bold heading, exact line breaks and an inline button. Links inside the body are plain text, so use the button for the main call to action.
              </p>
            </div>
          </Card>

          <Card className="card-pad">
            <h2 className="sec-title">
              <Users size={16} /> Reach
            </h2>
            <span className="eyebrow">{audienceLabel(form.audience)}</span>
            <div className="bc-reach">
              <strong>{reach === null ? "—" : reach.toLocaleString()}</strong>
              <span className="hint">members can receive this now</span>
            </div>
            <p className="hint">
              Counted at the moment the page loads: active accounts with a linked Telegram chat, excluding guests. The audience is resolved again when the send runs.
            </p>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={refresh}>
              <RefreshCw size={13} /> Recount and refresh
            </button>
          </Card>
        </div>
      </div>

      {selected ? (
        <Card className="card-pad" style={{ marginTop: 16 }}>
          <h2 className="sec-title">
            <History size={16} /> Delivery log
          </h2>
          <div className="bc-log-head">
            <div>
              <strong>{selected.name}</strong>
              <p className="hint">
                {audienceLabel(selected.audience)} · {selected.sentAt ? `finished ${dts(selected.sentAt)}` : selected.queuedAt ? `queued ${dts(selected.queuedAt)}` : `created ${dts(selected.createdAt)}`}
                {selected.createdBy ? ` · by ${selected.createdBy.displayName ?? selected.createdBy.email}` : ""}
              </p>
            </div>
            <Pill s={selected.status} />
          </div>
          <div className="bc-stats">
            <div className="bc-stat">
              <span className="eyebrow">Recipients</span>
              <strong>{selected.recipientCount.toLocaleString()}</strong>
            </div>
            <div className="bc-stat">
              <span className="eyebrow">Delivered</span>
              <strong>{selected.deliveredCount.toLocaleString()}</strong>
            </div>
            <div className="bc-stat">
              <span className="eyebrow">Failed</span>
              <strong>{selected.failedCount.toLocaleString()}</strong>
            </div>
            <div className="bc-stat">
              <span className="eyebrow">Remaining</span>
              <strong>
                {Math.max(
                  0,
                  selected.recipientCount - selected.deliveredCount - selected.failedCount
                ).toLocaleString()}
              </strong>
            </div>
          </div>

          {selected.status === "SENDING" ? (
            <p className="hint">
              Delivery is running in the background. This log refreshes every few seconds; leaving the page does not stop the run.
            </p>
          ) : null}

          {selected.lastError ? (
            <p className="bc-error" role="alert">
              <AlertTriangle size={13} aria-hidden="true" /> {selected.lastError}
            </p>
          ) : null}

          {failures.length > 0 ? (
            <>
              <h2 className="sec-title" style={{ marginTop: 16 }}>
                <AlertTriangle size={15} /> Failed deliveries
              </h2>
              <ul className="bc-fail">
                {failures.slice(0, 20).map((delivery) => (
                  <li key={delivery.id}>
                    <span>
                      <strong>{delivery.user?.displayName ?? delivery.user?.email ?? delivery.chatId}</strong>
                      <br />
                      {delivery.error ?? "Telegram refused the message."}
                    </span>
                    <span className="mono">{delivery.chatId}</span>
                  </li>
                ))}
              </ul>
              {selected.failureCount > 20 ? (
                <p className="hint">
                  Showing the first 20 of {selected.failureCount.toLocaleString()} failures. The rest are in the delivery table.
                </p>
              ) : null}
            </>
          ) : null}

          <div className="bc-actions" style={{ marginTop: 16 }}>
            {selected.status === "SENDING" ? (
              <button
                type="button"
                className="btn btn-red"
                disabled={busy !== null}
                onClick={() => setConfirm({ kind: "cancel", id: selected.id })}
              >
                Cancel broadcast
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy !== null}
              onClick={() => void duplicate(selected.id)}
            >
              <Copy size={14} /> Duplicate as draft
            </button>
            {canDelete(selected.status) ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy !== null}
                onClick={() => setConfirm({ kind: "delete", id: selected.id })}
              >
                <Trash2 size={14} /> Delete
              </button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="card-pad" style={{ marginTop: 16 }}>
        <div className="bc-library-head">
          <h2 className="sec-title" style={{ margin: 0 }}>
            <Megaphone size={16} /> Content library
          </h2>
          <div className="bc-filters">
            <label className="field">
              <span className="field-l">Status</span>
              <select
                className="sel"
                value={statusFilter}
                onChange={(event) => {
                  setPage(1);
                  setStatusFilter(event.target.value);
                }}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <search>
          <form
            className="bc-search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearchTerm(searchDraft.trim());
            }}
          >
            <label className="field" htmlFor="bc-search">
              <span className="field-l">Search</span>
              <input
                id="bc-search"
                name="q"
                className="inp"
                type="search"
                value={searchDraft}
                placeholder="Name or message text"
                maxLength={120}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-ghost">Search</button>
            {searchTerm ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearchDraft("");
                  setSearchTerm("");
                  setPage(1);
                }}
              >
                Clear
              </button>
            ) : null}
          </form>
        </search>

        <div style={{ marginTop: 14 }}>
          {listLoading && !list ? (
            <LoadingBox />
          ) : listError ? (
            <ErrorBox error={listError} reload={refresh} />
          ) : !list || list.items.length === 0 ? (
            <Empty icon={Megaphone}>
              No broadcasts match this filter yet. Compose one above, or clear the search.
            </Empty>
          ) : (
            <OpsTable
              heads={["Broadcast", "Audience", "Status", "Delivered", "Created", ""]}
              foot={(
                <Pager
                  page={list.page}
                  pages={list.pages}
                  total={list.total}
                  onPage={setPage}
                  unit="broadcasts"
                />
              )}
            >
              {list.items.map((broadcast) => (
                <tr key={broadcast.id}>
                  <td className="cell-main">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void openBroadcast(broadcast.id)}
                    >
                      {broadcast.name}
                    </button>
                    <p className="hint" style={{ margin: 0 }}>
                      {broadcast.heading ?? broadcast.body.slice(0, 70)}
                    </p>
                  </td>
                  <td>{audienceLabel(broadcast.audience)}</td>
                  <td>
                    <Pill s={broadcast.status} />
                  </td>
                  <td className="mono">
                    {broadcast.deliveredCount.toLocaleString()}/
                    {broadcast.recipientCount.toLocaleString()}
                    {broadcast.failedCount > 0 ? (
                      <span className="hint"> · {broadcast.failedCount.toLocaleString()} failed</span>
                    ) : null}
                  </td>
                  <td className="hint">{dts(broadcast.createdAt)}</td>
                  <td>
                    <span className="bc-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void openBroadcast(broadcast.id)}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy !== null}
                        onClick={() => void duplicate(broadcast.id)}
                      >
                        Duplicate
                      </button>
                      {canDelete(broadcast.status) ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busy !== null}
                          onClick={() => setConfirm({ kind: "delete", id: broadcast.id })}
                        >
                          Delete
                        </button>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </OpsTable>
          )}
        </div>
      </Card>

      <OpsActionModal
        open={confirm !== null && confirmView !== null}
        title={confirmView?.title ?? ""}
        description={confirmView?.description}
        confirmLabel={confirmView?.confirmLabel ?? "Confirm"}
        tone={confirm?.kind === "send" ? "primary" : "danger"}
        busy={busy === "send" || busy === "cancel" || busy === "delete"}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (busy === null) setConfirm(null);
        }}
      />
    </div>
  );
}

