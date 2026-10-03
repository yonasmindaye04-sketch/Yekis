/* ────────────────────────────────────────────────────────────────────────
   SupportDesk.tsx — staff support inbox.

   Carried over from the dashboard this console replaces. Reads
   chat/admin/conversations and the shared conversation message routes;
   replies, attachments and status changes all go through opsApi.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCheck,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";
import { dts, opsApi, useApi } from "../opsApi";
import type { RawChatMessage, RawConversation } from "../opsBackend";
import { Empty, ErrorBox, LoadingBox, PageHead, Pill } from "../components/ui";
import { useToast } from "../components/ui";

function ageHours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export default function SupportDesk() {
  const toast = useToast();
  const [scope, setScope] = useState<"OPEN" | "ALL">("OPEN");
  const { data, error, loading, reload } = useApi(() => opsApi.conversations(scope));
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<RawChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const convs = data?.items ?? [];
  const active = convs.find((c) => c.id === selected) ?? null;

  const loadMessages = useCallback(async (id: string) => {
    try {
      setMessages(await opsApi.chatMessages(id));
    } catch {
      /* a staff member may lose access mid-thread; keep the list usable */
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const open = useCallback(
    (c: RawConversation) => {
      setSelected(c.id);
      setReply("");
      setFile(null);
      setMessages([]);
      void loadMessages(c.id);
    },
    [loadMessages],
  );

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
      await opsApi.sendChatMessage(selected, body, attachmentUrl);
      setReply("");
      setFile(null);
      await loadMessages(selected);
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
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not change status");
    }
  };

  if (loading && !data) return <LoadingBox />;
  if (error && !data) return <ErrorBox error={error} reload={reload} />;

  return (
    <div className="fade">
      <PageHead
        title="Support Desk"
        sub="Guest and client conversations routed to the staff queue"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <div className="f-search" style={{ padding: "0 10px", height: 32 }}>
              <select
                className="sel"
                style={{ border: "none", background: "transparent", padding: 0 }}
                value={scope}
                onChange={(e) => setScope(e.target.value as "OPEN" | "ALL")}
              >
                <option value="OPEN">Open only</option>
                <option value="ALL">All</option>
              </select>
            </div>
            <button className="btn btn-ghost" onClick={reload}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "minmax(260px, 340px) 1fr", alignItems: "start" }}>
        <div className="card" style={{ maxHeight: "68vh", overflow: "auto" }}>
          {convs.length === 0 ? (
            <Empty icon={MessageSquare}>No conversations in this queue.</Empty>
          ) : (
            <table className="tbl">
              <tbody>
                {convs.map((c) => {
                  const last = c.messages[0];
                  const wait = ageHours(c.updatedAt);
                  return (
                    <tr
                      key={c.id}
                      className="clickable"
                      style={selected === c.id ? { background: "var(--ops-surface-2)" } : undefined}
                      onClick={() => open(c)}
                    >
                      <td>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span className="cell-main">{c.subject}</span>
                          <Pill s={c.status} />
                        </div>
                        <div className="cell-sub">{c.creator.email}</div>
                        {last ? (
                          <div className="cell-sub" style={{ marginTop: 4 }}>
                            {last.body.slice(0, 70)}
                          </div>
                        ) : null}
                        <div style={{ display: "flex", gap: 8, marginTop: 5, alignItems: "center" }}>
                          <span className="cell-sub">{dts(c.updatedAt)}</span>
                          {c.status === "OPEN" && wait > 24 ? (
                            <span className="sla breach">● waiting {Math.floor(wait)}h</span>
                          ) : c.status === "OPEN" && wait > 2 ? (
                            <span className="sla warn">● waiting {Math.floor(wait)}h</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card-pad" style={{ minHeight: 320 }}>
          {!active ? (
            <Empty icon={MessageSquare}>Select a conversation to read and reply.</Empty>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{active.subject}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ops-text-2)" }}>
                    {active.creator.email}
                    {active.assignedStaff ? ` · assigned to ${active.assignedStaff.name}` : " · unassigned"}
                  </div>
                </div>
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

              <div style={{ maxHeight: "42vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.length === 0 ? (
                  <Empty icon={MessageSquare}>No messages yet.</Empty>
                ) : (
                  messages.map((m) => {
                    const fromStaff = Boolean(m.sender.staffRole);
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: fromStaff ? "flex-end" : "flex-start",
                          maxWidth: "78%",
                          background: fromStaff ? "var(--ops-accent)" : "var(--ops-surface-2)",
                          color: fromStaff ? "#fff" : "var(--ops-text)",
                          borderRadius: 10,
                          padding: "8px 11px",
                        }}
                      >
                        <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 3 }}>
                          {m.sender.displayName ?? m.sender.email} · {dts(m.createdAt)}
                        </div>
                        <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{m.body}</div>
                        {m.attachmentUrl ? (
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              marginTop: 6,
                              fontSize: 12,
                              textDecoration: "underline",
                            }}
                          >
                            <Paperclip size={12} /> attachment
                          </a>
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
                  <input
                    type="file"
                    hidden
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void send()}>
                  <Send size={13} /> {busy ? "Sending…" : "Send"}
                </button>
              </div>
              {file ? (
                <div style={{ fontSize: 12, color: "var(--ops-text-2)", marginTop: 6 }}>
                  Attaching: {file.name}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}