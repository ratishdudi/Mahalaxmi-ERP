import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";
import { money } from "../costing";
import { cardStyle, UI } from "../styles";

type DashboardMetrics = {
  totalRevenue: number;
  totalOutstanding: number;
  activeBlocksInYard: number;
  readyToSellSqft: number;
  machineRunning: number;
  salesCount: number;
};

type PendingPayment = {
  id: string;
  buyer_name: string;
  total_amount: number;
  amount_paid: number;
  dueAmount: number;
};

type MetricCardProps = {
  title: string;
  value: string | number;
  hint: string;
  tone: string;
};

const MetricCard = ({ title, value, hint, tone }: MetricCardProps) => (
  <div style={{ ...cardStyle, borderLeft: `4px solid ${tone}`, minHeight: 104 }}>
    <div style={{ fontSize: 10, color: UI.colors.textSub, textTransform: "uppercase", marginBottom: 8, fontWeight: 800, letterSpacing: "0.06em" }}>
      {title}
    </div>
    <div style={{ fontSize: 22, fontWeight: 850, color: UI.colors.textMain, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 12, color: UI.colors.textSub, marginTop: 8 }}>{hint}</div>
  </div>
);

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalOutstanding: 0,
    activeBlocksInYard: 0,
    readyToSellSqft: 0,
    machineRunning: 0,
    salesCount: 0,
  });
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const [blocksRes, salesRes, sessionsRes] = await Promise.all([
      supabase.from("blocks").select("status, total_sqft"),
      supabase.from("sales").select("id, buyer_name, total_amount, amount_paid, payment_status"),
      supabase.from("machine_sessions").select("id, stopped_at").is("stopped_at", null),
    ]);

    let activeYard = 0;
    let readySqft = 0;
    let revenue = 0;
    let outstanding = 0;
    const dueList: PendingPayment[] = [];

    blocksRes.data?.forEach((block) => {
      if ([STATUS.YARD, STATUS.CUTTING, STATUS.UNPOLISHED, STATUS.POLISHING].includes(block.status)) activeYard++;
      if (block.status === STATUS.READY_TO_SELL) readySqft += Number(block.total_sqft || 0);
    });

    salesRes.data?.forEach((sale) => {
      revenue += Number(sale.total_amount || 0);
      const due = Number(sale.total_amount || 0) - Number(sale.amount_paid || 0);
      if (due > 0) {
        outstanding += due;
        dueList.push({ ...sale, dueAmount: due });
      }
    });

    dueList.sort((a, b) => b.dueAmount - a.dueAmount);
    setMetrics({
      totalRevenue: revenue,
      totalOutstanding: outstanding,
      activeBlocksInYard: activeYard,
      readyToSellSqft: readySqft,
      machineRunning: sessionsRes.data?.length || 0,
      salesCount: salesRes.data?.length || 0,
    });
    setPendingPayments(dueList);
    setLoading(false);
  }

  const collectionRisk = metrics.totalRevenue > 0 ? Math.round((metrics.totalOutstanding / metrics.totalRevenue) * 100) : 0;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 850, margin: 0, color: UI.colors.textMain }}>Command Center</h1>
          <p style={{ color: UI.colors.textSub, fontSize: 13, marginTop: 4 }}>Today’s factory position, collections and stock readiness.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          style={{ padding: "9px 14px", borderRadius: 9, border: `1px solid ${UI.colors.border}`, cursor: "pointer", background: "white", fontSize: 12, fontWeight: 800 }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: UI.colors.textSub }}>Syncing factory data...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
            <MetricCard title="Outstanding" value={money(metrics.totalOutstanding)} hint={`${collectionRisk}% of invoiced value`} tone="#f79009" />
            <MetricCard title="Revenue" value={money(metrics.totalRevenue)} hint={`${metrics.salesCount} total invoices`} tone="#12b76a" />
            <MetricCard title="Ready Stock" value={metrics.readyToSellSqft.toLocaleString("en-IN")} hint="Sqft ready to sell" tone="#174a87" />
            <MetricCard title="Production" value={metrics.machineRunning} hint={`${metrics.activeBlocksInYard} active blocks in flow`} tone="#7a5af8" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 14 }}>
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${UI.colors.border}`, background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 850, margin: 0, color: UI.colors.textMain }}>Priority Collections</h2>
                  <div style={{ fontSize: 12, color: UI.colors.textSub, marginTop: 2 }}>Oldest and largest dues should be called first.</div>
                </div>
                <div style={{ fontSize: 11, background: "#fff7ed", color: "#c2410c", padding: "5px 10px", borderRadius: 999, fontWeight: 800 }}>
                  {pendingPayments.length} pending
                </div>
              </div>

              {pendingPayments.length === 0 ? (
                <div style={{ padding: 34, textAlign: "center", color: UI.colors.textSub, fontSize: 14 }}>All party accounts are clear.</div>
              ) : (
                pendingPayments.slice(0, 8).map((payment) => (
                  <div key={payment.id} style={{ padding: "14px 16px", borderBottom: `1px solid ${UI.colors.border}`, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: UI.colors.textMain }}>{payment.buyer_name}</div>
                      <div style={{ fontSize: 11, color: UI.colors.textSub, marginTop: 3 }}>Invoice {payment.id.split("-")[0].toUpperCase()} · billed {money(Number(payment.total_amount || 0))}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: UI.colors.textSub, textTransform: "uppercase", fontWeight: 800 }}>Due</div>
                      <div style={{ fontSize: 15, fontWeight: 850, color: UI.colors.error }}>{money(payment.dueAmount)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ ...cardStyle }}>
              <h2 style={{ fontSize: 15, fontWeight: 850, margin: "0 0 12px", color: UI.colors.textMain }}>Operating Focus</h2>
              {[
                { label: "Collections risk", value: `${collectionRisk}%`, tone: collectionRisk > 35 ? "#d92d20" : "#12b76a" },
                { label: "Ready stock", value: `${metrics.readyToSellSqft.toLocaleString("en-IN")} sqft`, tone: "#174a87" },
                { label: "Machines running", value: String(metrics.machineRunning), tone: metrics.machineRunning > 0 ? "#12b76a" : "#667085" },
              ].map((item) => (
                <div key={item.label} style={{ padding: "11px 0", borderBottom: `1px solid ${UI.colors.border}` }}>
                  <div style={{ fontSize: 11, color: UI.colors.textSub, textTransform: "uppercase", fontWeight: 800 }}>{item.label}</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 850, color: item.tone }}>{item.value}</div>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#f8fafc", color: UI.colors.textSub, fontSize: 12, lineHeight: 1.5 }}>
                Keep ledger entries machine-linked wherever possible. That is what lets the system learn ageing machine cost.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
