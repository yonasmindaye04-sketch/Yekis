// === IMPORTS ===
import { useState } from "react";
import { Check, Plus, Upload, WalletCards } from "lucide-react";
import { api, type TopUpRequest, type WalletResponse } from "./api/client";


// === MAIN COMPONENT ===
export function BrowserWallet({ wallet, topUps, onChanged, canWithdraw = false }: { wallet: WalletResponse; topUps: TopUpRequest[]; onChanged: () => Promise<void>; canWithdraw?: boolean }) {
  const [rail, setRail] = useState<"TELEBIRR" | "CBE_BIRR">("TELEBIRR");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutIdentifier, setPayoutIdentifier] = useState("");

  const submit = async () => {
    if (!amount || !reference || !receipt) { setMessage("Add the amount sent, reference number, and receipt."); return; }
    setIsSubmitting(true); setMessage("");
    try {
      const data = new FormData();
      data.append("amountEtb", amount); data.append("rail", rail); data.append("senderName", "Yekis client"); data.append("senderReference", reference); data.append("receipt", receipt);
      await api.createTopUpRequest(data); setAmount(""); setReference(""); setReceipt(null); setMessage("Submitted for staff approval."); await onChanged();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to submit top-up"); }
    finally { setIsSubmitting(false); }
  };

  const withdraw = async () => {
    const amountMinor = Math.round(Number(withdrawAmount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0 || !payoutIdentifier.trim()) { setMessage("Enter a withdrawal amount and payout phone or account."); return; }
    setIsSubmitting(true); setMessage("");
    try {
      const result = await api.withdrawWallet({ amountMinor, provider: rail, payoutAccountIdentifier: payoutIdentifier.trim() });
      setMessage(result.error === "HELD_FOR_REVIEW" ? "Withdrawal held for compliance review; your balance was not debited." : "Withdrawal request recorded.");
      if (!result.error) { setWithdrawAmount(""); setPayoutIdentifier(""); }
      await onChanged();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to request withdrawal"); }
    finally { setIsSubmitting(false); }
  };

  return <div className="browser-wallet-stack"><section className="wallet-hero"><div><p className="eyebrow">Available balance</p><strong>ETB {(wallet.balanceMinor / 100).toLocaleString()}</strong><span>Updated from approved receipts and released milestones.</span></div><WalletCards size={36} /></section>{canWithdraw && <section className="panel withdraw-panel"><div className="panel-heading"><div><p className="eyebrow">Tier 2 payout</p><h2>Withdraw earnings</h2></div><WalletCards size={22} /></div><div className="browser-topup-fields"><label>Amount<input type="number" min="1" max={wallet.balanceMinor / 100} value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} placeholder="ETB" /></label><label>Payout phone or account<input value={payoutIdentifier} onChange={(event) => setPayoutIdentifier(event.target.value)} placeholder="Must match your verified identity" /></label></div><button className="btn-primary" disabled={isSubmitting || wallet.balanceMinor <= 0} onClick={() => void withdraw()}>Request withdrawal</button></section>}<section className="panel browser-topup-panel"><div className="panel-heading"><div><p className="eyebrow">Manual top-up</p><h2>Add funds with a receipt</h2></div><Plus size={22} /></div><p className="wallet-help">Send money to your selected account, then upload the receipt for staff approval.</p><div className="payment-grid"><button className={rail === "TELEBIRR" ? "payment-account selected" : "payment-account"} onClick={() => setRail("TELEBIRR")}><strong>Telebirr</strong><span>Yekis top-up account</span><code>0911 223 344</code></button><button className={rail === "CBE_BIRR" ? "payment-account selected" : "payment-account"} onClick={() => setRail("CBE_BIRR")}><strong>CBE Bank</strong><span>Yekis top-up account</span><code>1000 223 344</code></button></div><div className="browser-topup-fields"><label>Amount sent<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" placeholder="ETB" /></label><label>Reference number<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. TB-12345" /></label><label className="browser-upload">Receipt<small><Upload size={15} /> {receipt?.name ?? "Choose an image or PDF"}</small><input type="file" accept="image/*,.pdf" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} /></label></div>{message && <p className="wallet-message"><Check size={16} />{message}</p>}<button className="btn-primary" onClick={() => void submit()} disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit for approval"}</button></section><section className="panel"><div className="panel-heading"><h2>Recent top-ups</h2></div>{topUps.length === 0 ? <p className="empty-state">No top-ups submitted yet.</p> : topUps.map((item) => <div className="list-row" key={item.id}><div><strong>ETB {(item.amountMinor / 100).toLocaleString()}</strong><span>{item.rail} · {item.senderReference}</span></div><span className="status-pill">{item.status.replace("_", " ")}</span></div>)}</section></div>;
}
