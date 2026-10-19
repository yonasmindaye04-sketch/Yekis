import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Square, Play } from "lucide-react";
import { opsApi } from "../opsApi";
import { PageHead, LoadingBox, useToast } from "../components/ui";

export default function BotOperations() {
  const toast = useToast();
  const [health, setHealth] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [h, i] = await Promise.all([opsApi.botHealth(), opsApi.botInfo()]); setHealth(h); setInfo(i); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not load bot status"); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { void load(); }, [load]);
  const action = async (fn: () => Promise<unknown>, message: string) => { try { await fn(); toast(message); await load(); } catch (e) { toast(e instanceof Error ? e.message : "Bot action failed"); } };
  if (loading && !health) return <LoadingBox />;
  return <div className="fade">
    <PageHead title="Telegram Bot" sub="Monitor bot delivery and control the development transport." right={<button className="btn btn-ghost" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>} />
    <div className="grid g3">
      <div className="card"><span className="eyebrow">Status</span><h2>{health?.status ?? "Unavailable"}</h2><p>{health?.transport ?? "—"}</p></div>
      <div className="card"><span className="eyebrow">Bot</span><h2>{info?.bot?.username ? `@${info.bot.username}` : "—"}</h2><p>{info?.bot?.firstName ?? "Not initialized"}</p></div>
      <div className="card"><span className="eyebrow">Pending updates</span><h2>{health?.webhook?.pendingUpdateCount ?? 0}</h2><p>{health?.webhook?.lastErrorMessage ?? "No reported delivery error"}</p></div>
    </div>
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Transport controls</h3>
      <p className="muted">Polling controls are available only in development. Deleting a webhook is safe but stops webhook delivery.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => void action(opsApi.startBotPolling, "Polling started.")}><Play size={14} /> Start polling</button>
        <button className="btn btn-ghost" onClick={() => void action(opsApi.stopBot, "Bot stopped.")}><Square size={14} /> Stop bot</button>
        <button className="btn btn-red" onClick={() => { if (window.confirm("Delete the Telegram webhook?")) void action(opsApi.deleteBotWebhook, "Webhook deleted."); }}>Delete webhook</button>
      </div>
    </div>
  </div>;
}
