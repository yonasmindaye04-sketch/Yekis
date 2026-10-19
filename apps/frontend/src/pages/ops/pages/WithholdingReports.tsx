import { useCallback, useEffect, useState } from "react";
import { FileCheck, RefreshCw } from "lucide-react";
import { opsApi } from "../opsApi";
import { PageHead, LoadingBox, useToast } from "../components/ui";

type Report = { id: string; periodMonth: string; totalWithholdingMinor: number; transactionCount: number; filedAt: string | null; eraReferenceNumber: string | null };
const money = (minor: number) => `${(minor / 100).toLocaleString()} ETB`;

export default function WithholdingReports() {
  const toast = useToast();
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await opsApi.withholdingReports({ limit: 100 }) as { items: Report[] }; setRows(result.items ?? []); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not load tax reports"); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { void load(); }, [load]);
  const file = async (row: Report) => {
    const value = ref[row.id]?.trim();
    if (!value) { toast("Enter the ERA reference number."); return; }
    try { await opsApi.fileWithholdingReport(row.id, value); toast("Report marked as filed."); await load(); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not file report"); }
  };
  if (loading && rows.length === 0) return <LoadingBox />;
  return <div className="fade">
    <PageHead title="Tax Reports" sub="Track withholding remittances and record ERA filing references." right={<button className="btn btn-ghost" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>} />
    <div className="card"><table className="ops-table"><thead><tr><th>Period</th><th>Amount</th><th>Status</th><th>ERA reference</th><th /></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td>{row.periodMonth}</td><td>{money(row.totalWithholdingMinor)}<br /><small>{row.transactionCount} transactions</small></td><td>{row.filedAt ? `Filed ${new Date(row.filedAt).toLocaleDateString()}` : "Pending filing"}</td><td>{row.filedAt ? row.eraReferenceNumber : <input className="inp" placeholder="ERA reference" value={ref[row.id] ?? ""} onChange={(e) => setRef((prev) => ({ ...prev, [row.id]: e.target.value }))} />}</td><td>{!row.filedAt ? <button className="btn btn-primary btn-sm" onClick={() => void file(row)}><FileCheck size={13} /> Mark filed</button> : null}</td></tr>)}
    </tbody></table>{rows.length === 0 ? <p className="muted">No withholding reports found.</p> : null}</div>
  </div>;
}
