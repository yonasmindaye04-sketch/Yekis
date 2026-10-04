/* ────────────────────────────────────────────────────────────────────────
   Risk.tsx — TMS transaction-monitoring flags. GET /admin/risk-flags
   ──────────────────────────────────────────────────────────────────────── */

import { RefreshCw, TriangleAlert } from "lucide-react";
import { dts, opsApi, useApi } from "../opsApi";
import type { RiskFlag } from "../opsTypes";
import { RISK_LEVEL } from "../opsTypes";
import { Banner, ErrorBox, LoadingBox, OpsTable, PageHead, Pager, Pill } from "../components/ui";

export default function Risk() {
  const { data, error, loading, reload } = useApi<RiskFlag[]>(opsApi.riskFlags);

  if (loading && !data) return <LoadingBox />;
  if (error || !data) return <ErrorBox error={error ?? "No data"} reload={reload} />;

  const open = data.filter((f) => f.status === "OPEN").length;

  return (
    <div className="fade">
      <PageHead
        title="Risk Flags"
        sub="Transaction monitoring alerts from the TMS queue"
        right={<button className="btn btn-ghost" onClick={reload}><RefreshCw size={14} /> Refresh</button>}
      />
      {open ? (
        <Banner tone="b-red" icon={TriangleAlert} strong={`${open} flags require immediate attention.`} rest="WALLET_MISMATCH is CRITICAL — freeze related wallets until reviewed." />
      ) : null}
      <OpsTable heads={["Flag Type", "Risk Level", "Status", "Detected", ""]} foot={<Pager n={data.length} />}>
        {data.map((f) => {
          const lv = RISK_LEVEL[f.type] ?? "LOW";
          return (
            <tr key={f.id}>
              <td><div className="cell-main">{f.type.replace(/_/g, " ")}</div><div className="cell-sub mono">{f.id}</div></td>
              <td><Pill s={lv} /></td>
              <td><Pill s={f.status} /></td>
              <td style={{ color: "var(--ops-text-2)", fontSize: 12.5 }}>{dts(f.created)}</td>
              <td><button className="btn btn-ghost btn-sm">Review</button></td>
            </tr>
          );
        })}
      </OpsTable>
    </div>
  );
}
