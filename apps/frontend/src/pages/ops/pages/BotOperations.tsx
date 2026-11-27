import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Megaphone, MessageSquare, Play, RefreshCw, Square } from "lucide-react";
import { opsApi } from "../opsApi";
import { Card, LoadingBox, OpsActionModal, PageHead, Pill, useToast } from "../components/ui";
import BroadcastCenter from "./BroadcastCenter";

type BotTab = "status" | "broadcasts";

const TABS: Array<{ id: BotTab; label: string; icon: typeof MessageSquare }> = [
  { id: "status", label: "Status", icon: MessageSquare },
  { id: "broadcasts", label: "Broadcasts", icon: Megaphone },
];

export default function BotOperations() {
  const toast = useToast();
  const [health, setHealth] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<BotTab>("status");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, i] = await Promise.all([opsApi.botHealth(), opsApi.botInfo()]);
      setHealth(h);
      setInfo(i);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load bot status");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Keep the selected tab visible when the strip scrolls on a narrow screen. */
  useEffect(() => {
    const index = TABS.findIndex((entry) => entry.id === tab);
    tabRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const action = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      toast(message);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Bot action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade">
      <PageHead
        title="Telegram Bot"
        sub="Monitor bot delivery, broadcast announcements and control the development transport."
        right={
          tab === "status" ? (
            <button type="button" className="btn btn-ghost" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
          ) : undefined
        }
      />

      <div className="ops-tabs" role="tablist" aria-label="Telegram bot sections">
        {TABS.map((entry, index) => {
          const Icon = entry.icon;
          const selected = tab === entry.id;
          return (
            <button
              key={entry.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`bot-tab-${entry.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="ops-tab"
              onClick={() => setTab(entry.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              <Icon size={15} aria-hidden="true" />
              {entry.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="bot-panel-status"
        aria-labelledby="bot-tab-status"
        hidden={tab !== "status"}
      >
        {loading && !health ? (
          <LoadingBox />
        ) : (
          <>
            <div className="grid g3">
              <Card className="card-pad">
                <span className="eyebrow">Status</span>
                <div style={{ margin: "6px 0" }}>
                  {health?.status ? <Pill s={String(health.status)} /> : <Pill s="UNAVAILABLE" />}
                </div>
                <p className="muted">{health?.transport ?? "—"}</p>
              </Card>
              <Card className="card-pad">
                <span className="eyebrow">Bot</span>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "4px 0" }}>
                  {info?.bot?.username ? `@${info.bot.username}` : "—"}
                </h2>
                <p className="muted">{info?.bot?.firstName ?? "Not initialized"}</p>
              </Card>
              <Card className="card-pad">
                <span className="eyebrow">Pending updates</span>
                <h2 className="mono" style={{ fontSize: "1.25rem", fontWeight: 800, margin: "4px 0" }}>
                  {health?.webhook?.pendingUpdateCount ?? 0}
                </h2>
                <p className="muted">
                  {health?.webhook?.lastErrorMessage ?? "No reported delivery error"}
                </p>
              </Card>
            </div>

            <Card className="card-pad" style={{ marginTop: 16 }}>
              <div className="sec-title" style={{ marginBottom: 6 }}>
                Transport controls
              </div>
              <p className="muted">
                Polling controls are available only in development. Deleting a webhook stops webhook delivery until re-registered.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void action(opsApi.startBotPolling, "Polling started.")}
                >
                  <Play size={14} /> Start polling
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void action(opsApi.stopBot, "Bot stopped.")}
                >
                  <Square size={14} /> Stop bot
                </button>
                <button
                  type="button"
                  className="btn btn-red"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete webhook
                </button>
              </div>
            </Card>
          </>
        )}
      </div>

      <div
        role="tabpanel"
        id="bot-panel-broadcasts"
        aria-labelledby="bot-tab-broadcasts"
        hidden={tab !== "broadcasts"}
      >
        <BroadcastCenter />
      </div>

      <OpsActionModal
        open={confirmDelete}
        title="Delete Telegram Webhook?"
        description="Deleting the webhook immediately stops inbound Telegram webhook updates until a new webhook is registered."
        tone="danger"
        confirmLabel="Delete Webhook"
        busy={busy}
        onConfirm={async () => {
          await action(opsApi.deleteBotWebhook, "Webhook deleted.");
          setConfirmDelete(false);
        }}
        onCancel={() => !busy && setConfirmDelete(false)}
      />
    </div>
  );
}
