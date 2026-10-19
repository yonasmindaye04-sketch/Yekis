/* ────────────────────────────────────────────────────────────────────────
   SupportDesk.tsx — staff support inbox.

   Uses the console's own two-pane queue pattern (queue-wrap / q-card /
   queue-detail) so it matches KYC and Dispute Mediation visually.
   GET   /chat/admin/conversations
   GET   /chat/conversations/:id/messages
   POST  /chat/conversations/:id/messages · /chat/upload
   PATCH /chat/admin/conversations/:id/status
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCheck,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";
import { dts, opsApi, opsListApi } from "../opsApi";
import { api } from "../../../api/client";
import { realtimeSocket } from "../../../api/socket";
import { SecureAttachment } from "../../../components/SecureAttachment";
import { getAttachmentLabel, isImageAttachment } from "../../../components/attachmentMeta";
import { useListPage } from "../opsList";
import type { RawChatMessage, RawConversation } from "../opsBackend";
import {
  Empty,
  ErrorBox,
  FilterSelect,
  Kv,
  LoadingBox,
  PageHead,
  Pager,
  Pill,
  useToast,
} from "../components/ui";

/** Hours a ticket has been open; drives the SLA chip. */
const waitHours = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

export default function SupportDesk() {
  const toast = useToast();
  const [scope, setScope] = useState("OPEN");
  const [assignment, setAssignment] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<string | null>(null);

  const list = useListPage<RawConversation>(
    (p) => opsListApi.conversations({ ...p, status: scope || "ALL", assignment, sort }),
    25,
    [scope, assignment, sort],
  );
  const {
    rows, total, page, pages, loading, error, search, setSearch, setPage, reload,
  } = list;

  const [messages, setMessages] = useState<RawChatMessage[]>([]);
  const [socketLive, setSocketLive] = useState(realtimeSocket.isConnected);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const active = rows.find((c) => c.id === selected) ?? null;

  const loadMessages = useCallback(async (id: string, silent = false) => {
    if (!silent) setMsgLoading(true);
    try {
      setMessages(await opsApi.chatMessages(id));
    } catch (e) {
      if (!silent) toast(e instanceof Error ? e.message : "Could not load the thread");
    } finally {
      if (!silent) setMsgLoading(false);
    }
  }, [toast]);

  const open = useCallback(
    (c: RawConversation) => {
      setSelected(c.id);
      setReply("");
      setFile(null);
      void loadMessages(c.id, false);
    },
    [loadMessages],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Keep the queue and the open thread live while staff are working. The
  // private user event catches newly assigned/unread cases; the conversation
  // channel catches messages after a staff member claims a case.
  useEffect(() => {
    realtimeSocket.connect();
    const offStatus = realtimeSocket.onStatusChange(setSocketLive);
    const offPrivate = realtimeSocket.on<RawChatMessage & { conversationId: string }>(
      "chat:new_message",
      (message) => {
        reload();
        if (message.conversationId === selected) void loadMessages(selected, true);
      },
    );
    const offNewConversation = realtimeSocket.on("chat:new_conversation", () => reload());
    return () => { offPrivate(); offStatus(); offNewConversation(); };
  }, [reload, selected, loadMessages]);

  // Socket-first, polling as a fallback. The background refresh is silent: rows
  // and the open thread stay on screen while the request is in flight, so the
  // desk no longer blanks into a loading box every few seconds.
  useEffect(() => {
    if (socketLive) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      reload();
      if (selected) void loadMessages(selected, true);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [socketLive, selected, reload, loadMessages]);

  useEffect(() => {
    if (!selected) return;
    const channel = `conversation:${selected}`;
    realtimeSocket.subscribe(channel);
    const offThread = realtimeSocket.on<RawChatMessage>("chat:message", (message) => {
      if (message.conversationId !== selected) return;
      setMessages((current) =>
        current.some((entry) => entry.id === message.id)
          ? current
          : [...current, message],
      );
    });
    return () => {
      realtimeSocket.unsubscribe(channel);
      offThread();
    };
  }, [selected]);

  const send = async () => {
    if (!selected || (!reply.trim() && !file) || busy) return;
    setBusy(true);
    try {
      let attachmentUrl: string | undefined;
      if (file) {
        const up = await opsApi.uploadChatAttachment(file);
        attachmentUrl = up.url;
      }
      const body = reply.trim() || `[attachment] ${file?.name ?? "file"}`;
      if (internal) await opsApi.sendInternalChatMessage(selected, body, attachmentUrl);
      else await opsApi.sendChatMessage(selected, body, attachmentUrl);
      setReply("");
      setInternal(false);
      setFile(null);
      await loadMessages(selected, true);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not send reply");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: "OPEN" | "CLOSED") => {
    if (!selected) return;
    try {
      await opsApi.setConversationStatus(selected, status);
      toast(status === "CLOSED" ? "Conversation closed." : "Conversation reopened.");
      setSelected(null);
      setMessages([]);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not change status");
    }
  };

  const claim = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await opsApi.claimConversation(selected);
      toast("Conversation claimed.");
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not claim conversation");
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <LoadingBox />;
  if (error && rows.length === 0) return <ErrorBox error={error} reload={reload} />;

  const breached = rows.filter((c) => c.status === "OPEN" && waitHours(c.updatedAt) > 24).length;

  return (
    <div className="fade">
      <PageHead
        title="Support Desk"
        sub="Guest and client conversations routed to the staff queue"
        right={
          <button className="btn btn-ghost" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kv k="Matching tickets" v={total.toLocaleString()} />
        <Kv k="On this page" v={String(rows.length)} />
        <Kv k="Unassigned" v={String(rows.filter((c) => !c.assignedStaff).length)} />
        <Kv k="Waiting &gt; 24h" v={String(breached)} warn={breached > 0} />
      </div>

      <div className="card filters">
        <div className="f-search">
          <Search size={15} />
          <input
            placeholder="Search subject or requester email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          value={scope}
          onChange={setScope}
          options={["OPEN", "CLOSED"]}
          allLabel="All statuses"
          label="Conversation status"
        />
        <FilterSelect
          value={assignment}
          onChange={setAssignment}
          options={["UNASSIGNED", "MINE"]}
          allLabel="All assignments"
          label="Conversation assignment"
        />
        <FilterSelect
          value={sort}
          onChange={setSort}
          options={["newest", "oldest", "waiting"]}
          allLabel="Sort by"
          label="Conversation sort"
        />
        <button className="btn btn-ghost" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="queue-wrap">
        <div className="queue-list">
          {rows.length === 0 ? (
            <div className="card" style={{ padding: "36px 16px", textAlign: "center" }}>
              <Empty icon={MessageSquare}>No conversations in this queue.</Empty>
            </div>
          ) : (
            rows.map((c) => {
              const last = c.messages[0];
              const wait = waitHours(c.updatedAt);
              return (
                <button
                  key={c.id}
                  className={`q-card ${selected === c.id ? "selected" : ""}`}
                  onClick={() => open(c)}
                >
                  <div className="q-head">
                    <strong>{c.subject}</strong>
                    <Pill s={c.status} />
                  </div>
                  <div className="q-sub">
                    <span className="subject">{c.creator.email}</span>
                    <span className="q-date">{dts(c.updatedAt)}</span>
                  </div>
                  {last ? (
                    <div className="q-sub" style={{ marginTop: 4 }}>
                      <span className="subject">{last.body.slice(0, 80)}</span>
                    </div>
                  ) : null}
                  {c.status === "OPEN" && wait > 24 ? (
                    <div style={{ marginTop: 7 }}>
                      <span className="sla breach">● waiting {Math.floor(wait)}h</span>
                    </div>
                  ) : c.status === "OPEN" && wait > 2 ? (
                    <div style={{ marginTop: 7 }}>
                      <span className="sla warn">● waiting {Math.floor(wait)}h</span>
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
          <Pager page={page} pages={pages} total={total} onPage={setPage} unit="tickets" />
        </div>

        {active ? (
          <div className="queue-detail card">
            <div className="qd-head">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{active.subject}</h3>
                  <div className="qd-meta">
                    {active.creator.email} ·{" "}
                    {active.assignedStaff ? `assigned to ${active.assignedStaff.name}` : "unassigned"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!active.assignedStaff ? (
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void claim()}>
                      Claim
                    </button>
                  ) : null}
                  {active.status === "OPEN" ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => void setStatus("CLOSED")}>
                      <CheckCheck size={13} /> Close
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => void setStatus("OPEN")}>
                      <RotateCcw size={13} /> Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="qd-body">
              <div className="ev-chat">
                {msgLoading ? (
                  <div className="empty" style={{ padding: 20 }}>Loading thread…</div>
                ) : messages.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}>No messages yet.</div>
                ) : (
                  messages.map((m) => {
                    const fromStaff = Boolean(m.sender.staffRole);
                    return (
                      <div className={`ev-bubble ${m.origin === "STAFF_INTERNAL" ? "internal" : fromStaff ? "freelancer" : "client"}`} key={m.id}>
                        <div className="ev-b-head">
                          <strong>
                            {fromStaff ? "Staff" : (m.sender.displayName ?? m.sender.email)}
                          </strong>
                          <span>{dts(m.createdAt)}</span>
                        </div>
                        <p>{m.body}</p>
                        {m.attachmentUrl ? (
                          <SecureAttachment
                            url={m.attachmentUrl}
                            token={api.getToken()}
                            label={getAttachmentLabel(m.attachmentUrl)}
                            isImage={isImageAttachment(m.attachmentUrl)}
                          />
                        ) : null}
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder="Type a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                  <Paperclip size={13} />
                  <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void send()}>
                  <Send size={13} /> {busy ? "Sending…" : "Send"}
                </button>
              </div>
              <label style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 8, fontSize: 12, color: "var(--ops-text-2)" }}>
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (staff only)
              </label>
              {file ? (
                <div style={{ fontSize: 12, color: "var(--ops-text-2)", marginTop: 6 }}>
                  Attaching: {file.name}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="queue-detail card">
            <div className="qd-body">
              <Empty icon={MessageSquare}>Select a conversation to read and reply.</Empty>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
