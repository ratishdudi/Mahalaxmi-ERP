import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";

type DashboardMetrics = {
  totalRevenue: number;
  totalOutstanding: number;
  activeBlocksInYard: number;
  readyToSellSqft: number;
};

type PendingPayment = {
  id: string;
  buyer_name: string;
  total_amount: number;
  amount_paid: number;
  dueAmount: number;
  payment_status: string;
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalOutstanding: 0,
    activeBlocksInYard: 0,
    readyToSellSqft: 0,
  });
  
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    // Fetch all necessary data in parallel for speed
    const [blocksRes, salesRes] = await Promise.all([
      supabase.from("blocks").select("status, total_sqft"),
      supabase.from("sales").select("id, buyer_name, total_amount, amount_paid, payment_status")
    ]);

    let activeYard = 0;
    let readySqft = 0;
    
    if (blocksRes.data) {
      blocksRes.data.forEach((block) => {
        // Active yard blocks (everything not finished or sold)
        if ([STATUS.YARD, STATUS.CUTTING, STATUS.UNPOLISHED, STATUS.POLISHING].includes(block.status)) {
          activeYard++;
        }
        // Finished stock ready to sell
        if (block.status === STATUS.READY_TO_SELL) {
          readySqft += Number(block.total_sqft || 0);
        }
      });
    }

    let revenue = 0;
    let outstanding = 0;
    const dueList: PendingPayment[] = [];

    if (salesRes.data) {
      salesRes.data.forEach((sale) => {
        revenue += Number(sale.total_amount);
        const due = Number(sale.total_amount) - Number(sale.amount_paid);
        
        if (due > 0) {
          outstanding += due;
          dueList.push({
            id: sale.id,
            buyer_name: sale.buyer_name,
            total_amount: Number(sale.total_amount),
            amount_paid: Number(sale.amount_paid),
            dueAmount: due,
            payment_status: sale.payment_status
          });
        }
      });
    }

    // Sort pending payments by highest due amount first
    dueList.sort((a, b) => b.dueAmount - a.dueAmount);

    setMetrics({
      totalRevenue: revenue,
      totalOutstanding: outstanding,
      activeBlocksInYard: activeYard,
      readyToSellSqft: readySqft,
    });
    setPendingPayments(dueList);
    setLoading(false);
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "0 auto", padding: 16 },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 },
    metricTitle: { fontSize: 10, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 },
  };

  return (
    <div style={S.page}>
      
      {/* Header */}
      <div style={{ paddingTop: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>🏢 Factory Command Center</h1>
          <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>Live overview of operations, stock, and market credit.</p>
        </div>
        <button onClick={fetchDashboardData} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", color: "var(--text-h)", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text)" }}>Syncing live factory data...</div>
      ) : (
        <>
          {/* Top 4 Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <div style={{ ...S.card, borderTop: "3px solid #f59e0b" }}>
              <div style={S.metricTitle}>Market Outstanding</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>₹{metrics.totalOutstanding.toLocaleString()}</div>
            </div>
            
            <div style={{ ...S.card, borderTop: "3px solid #22c55e" }}>
              <div style={S.metricTitle}>Total Revenue</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>₹{metrics.totalRevenue.toLocaleString()}</div>
            </div>

            <div style={{ ...S.card, borderTop: "3px solid #3b82f6" }}>
              <div style={S.metricTitle}>Ready To Sell</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>{metrics.readyToSellSqft.toLocaleString()} <span style={{ fontSize: 12, color: "var(--text)" }}>Sqft</span></div>
            </div>

            <div style={{ ...S.card, borderTop: "3px solid #a855f7" }}>
              <div style={S.metricTitle}>Blocks In Yard</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#a855f7" }}>{metrics.activeBlocksInYard} <span style={{ fontSize: 12, color: "var(--text)" }}>Active</span></div>
            </div>
          </div>

          {/* Pending Collections List */}
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-h)" }}>🚨 Priority Collections (Action Required)</h2>
              <div style={{ fontSize: 11, background: "#ef444422", color: "#ef4444", padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>
                {pendingPayments.length} Pending
              </div>
            </div>
            
            {pendingPayments.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text)", fontSize: 13 }}>
                All accounts are perfectly clear. No pending payments! 🎉
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {pendingPayments.slice(0, 10).map((payment, idx) => (
                  <div key={payment.id} style={{ 
                    display: "grid", 
                    gridTemplateColumns: "2fr 1fr 1fr 1fr", 
                    gap: 12, 
                    padding: "16px 20px", 
                    borderBottom: idx === Math.min(pendingPayments.length, 10) - 1 ? "none" : "1px solid var(--border)",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-h)" }}>{payment.buyer_name}</div>
                      <div style={{ fontSize: 10, color: "var(--text)", marginTop: 2, textTransform: "uppercase" }}>Invoice ID: {payment.id.split("-")[0]}</div>
                    </div>
                    <div>
                      <div style={S.metricTitle}>Deal Value</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-h)" }}>₹{payment.total_amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={S.metricTitle}>Amount Paid</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>₹{payment.amount_paid.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={S.metricTitle}>Balance Due</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}>₹{payment.dueAmount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {pendingPayments.length > 10 && (
                  <div style={{ padding: 12, textAlign: "center", background: "var(--bg)", color: "var(--text)", fontSize: 12, borderTop: "1px solid var(--border)" }}>
                    + {pendingPayments.length - 10} more accounts with pending balances.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}