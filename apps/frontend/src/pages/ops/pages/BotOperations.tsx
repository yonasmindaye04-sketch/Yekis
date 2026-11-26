import { useCallback, useEffect, useState } from "react";
import { Play, RefreshCw, Square } from "lucide-react";
import { opsApi } from "../opsApi";
import { Card, LoadingBox, OpsActionModal, PageHead, Pill, useToast } from "../components/ui";

export default function BotOperations() {
  const toast = useToast();
  const [health, setHealth] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

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

  if (loading && !health) return <LoadingBox />;

  return (
    <div className="fade">
      <PageHead
        title="Telegram Bot"
        sub="Monitor bot delivery and control the development transport."
        right={
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

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
