import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";
import { cardStyle, UI } from "../styles"; // Our design system

// --- MINI COMPONENTS ---

const MetricCard = ({ title, value, color, suffix = "" }: any) => (
  <div style={{ ...cardStyle, borderTop: `4px solid ${color}` }}>
    <div style={{ fontSize: 10, color: UI.colors.textSub, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color }}>
      {value} <span style={{ fontSize: 12, color: UI.colors.textSub }}>{suffix}</span>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalOutstanding: 0, activeBlocksInYard: 0, readyToSellSqft: 0 });
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const [blocksRes, salesRes] = await Promise.all([
      supabase.from("blocks").select("status, total_sqft"),
      supabase.from("sales").select("id, buyer_name, total_amount, amount_paid, payment_status")
    ]);

    let activeYard = 0, readySqft = 0, revenue = 0, outstanding = 0;
    const dueList: any[] = [];

    if (blocksRes.data) {
      blocksRes.data.forEach((block) => {
        if ([STATUS.YARD, STATUS.CUTTING, STATUS.UNPOLISHED, STATUS.POLISHING].includes(block.status)) activeYard++;
        if (block.status === STATUS.READY_TO_SELL) readySqft += Number(block.total_sqft || 0);
      });
    }

    if (salesRes.data) {
      salesRes.data.forEach((sale) => {
        revenue += Number(sale.total_amount);
        const due = Number(sale.total_amount) - Number(sale.amount_paid);
        if (due > 0) {
          outstanding += due;
          dueList.push({ ...sale, dueAmount: due });
        }
      });
    }

    dueList.sort((a, b) => b.dueAmount - a.dueAmount);
    setMetrics({ totalRevenue: revenue, totalOutstanding: outstanding, activeBlocksInYard: activeYard, readyToSellSqft: readySqft });
    setPendingPayments(dueList);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: UI.spacing.padding }}>
      
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: UI.colors.textMain }}>🏢 Factory Command Center</h1>
          <p style={{ color: UI.colors.textSub, fontSize: 13, marginTop: 4 }}>Live overview of operations and market credit.</p>
        </div>
        <button onClick={fetchDashboardData} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${UI.colors.border}`, cursor: "pointer", background: "white" }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: UI.colors.textSub }}>Syncing data...</div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            <MetricCard title="Market Outstanding" value={`₹${metrics.totalOutstanding.toLocaleString()}`} color="#f59e0b" />
            <MetricCard title="Total Revenue" value={`₹${metrics.totalRevenue.toLocaleString()}`} color="#22c55e" />
            <MetricCard title="Ready To Sell" value={metrics.readyToSellSqft.toLocaleString()} color="#3b82f6" suffix="Sqft" />
            <MetricCard title="Blocks In Yard" value={metrics.activeBlocksInYard} color="#a855f7" suffix="Active" />
          </div>

          {/* Pending Collections List */}
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${UI.colors.border}`, background: "#f8fafc", display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: UI.colors.textMain }}>🚨 Priority Collections</h2>
              <div style={{ fontSize: 11, background: "#fee2e2", color: "#ef4444", padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>
                {pendingPayments.length} Pending
              </div>
            </div>

            {pendingPayments.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: UI.colors.textSub }}>All accounts clear! 🎉</div>
            ) : (
              pendingPayments.slice(0, 10).map((payment) => (
                <div key={payment.id} style={{ padding: "16px 20px", borderBottom: `1px solid ${UI.colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: UI.colors.textMain }}>{payment.buyer_name}</div>
                    <div style={{ fontSize: 10, color: UI.colors.textSub, textTransform: "uppercase" }}>Invoice ID: {payment.id.split("-")[0]}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: UI.colors.textSub }}>Balance Due</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: UI.colors.error }}>₹{payment.dueAmount.toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}