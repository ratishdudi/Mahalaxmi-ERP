import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";
type Block = {
  id: string;
  block_no: string;
  stone_type: string;
  quarry_name: string;
  weight_tons: number;
  landed_cost: number;
  is_own_block: boolean;
  status: string;
  total_sqft: number;
};

type Sale = {
  id: string;
  block_id: string;
  sqft_sold: number;
  rate_per_sqft: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
};

type MonthlyCost = {
  month: string;
  cost_per_sqft: number;
  total_overhead: number;
  sqft_processed: number;
};

type BlockAnalysis = {
  block: Block;
  totalSqftSold: number;
  totalRevenue: number;
  totalPaid: number;
  totalDue: number;
  avgSaleRate: number;
  purchaseCostPerSqft: number;
  overheadPerSqft: number;
  breakEvenPerSqft: number;
  profitPerSqft: number;
  totalProfit: number;
  marginPct: number;
  isProfit: boolean;
};

export default function BreakEven() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [blocksRes, salesRes, costsRes] = await Promise.all([
      supabase.from("blocks").select("*").in("status", [STATUS.READY_TO_SELL, STATUS.SOLD, STATUS.FINISHED]),
      supabase.from("sales").select("*"),
      supabase.from("monthly_costs").select("*").order("created_at", { ascending: false }),
    ]);

    if (blocksRes.data) setBlocks(blocksRes.data);
    if (salesRes.data) setSales(salesRes.data);
    if (costsRes.data) setMonthlyCosts(costsRes.data);
    setLoading(false);
  }

  // Get latest overhead per sqft from most recent monthly cost entry
  const latestOverhead = monthlyCosts.length > 0 ? monthlyCosts[0].cost_per_sqft : 0;

  // Build analysis for each block
  const analyses: BlockAnalysis[] = blocks
    .filter((b) => b.is_own_block) // Only own blocks have profit — job work doesn't
    .map((block) => {
      const blockSales = sales.filter((s) => s.block_id === block.id);
      const totalSqftSold = blockSales.reduce((sum, s) => sum + Number(s.sqft_sold), 0);
      const totalRevenue = blockSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalPaid = blockSales.reduce((sum, s) => sum + Number(s.amount_paid), 0);
      const totalDue = totalRevenue - totalPaid;
      const avgSaleRate = totalSqftSold > 0 ? totalRevenue / totalSqftSold : 0;

      // Cost calculations
      const totalSqft = block.total_sqft || 0;
      const purchaseCostPerSqft = totalSqft > 0 ? block.landed_cost / totalSqft : 0;
      const overheadPerSqft = latestOverhead;
      const breakEvenPerSqft = purchaseCostPerSqft + overheadPerSqft;
      const profitPerSqft = avgSaleRate - breakEvenPerSqft;
      const totalProfit = profitPerSqft * totalSqftSold;
      const marginPct = breakEvenPerSqft > 0 ? (profitPerSqft / breakEvenPerSqft) * 100 : 0;

      return {
        block,
        totalSqftSold,
        totalRevenue,
        totalPaid,
        totalDue,
        avgSaleRate,
        purchaseCostPerSqft,
        overheadPerSqft,
        breakEvenPerSqft,
        profitPerSqft,
        totalProfit,
        marginPct,
        isProfit: profitPerSqft > 0,
      };
    })
    .filter((a) => filter === "all" || (filter === "profit" && a.isProfit) || (filter === "loss" && !a.isProfit));

  // Summary stats
  const totalRevenue = analyses.reduce((sum, a) => sum + a.totalRevenue, 0);
  const totalProfit = analyses.reduce((sum, a) => sum + a.totalProfit, 0);
  const totalDue = analyses.reduce((sum, a) => sum + a.totalDue, 0);
  const profitBlocks = analyses.filter((a) => a.isProfit).length;
  const lossBlocks = analyses.filter((a) => !a.isProfit).length;

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "0 auto", padding: 16 },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 },
    label: { fontSize: 9, color: "var(--text)", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 4, display: "block" },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>🧮 Break-Even Calculator</h1>
        <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>
          Real profit and loss per block. Based on actual purchase cost + overhead.
        </p>
      </div>

      {/* Overhead info banner */}
      <div style={{ background: latestOverhead > 0 ? "#22c55e11" : "#f59e0b11", border: `1px solid ${latestOverhead > 0 ? "#22c55e33" : "#f59e0b33"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
            Current Overhead Rate (from Monthly Costs)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: latestOverhead > 0 ? "#22c55e" : "#f59e0b" }}>
            {latestOverhead > 0 ? `₹${latestOverhead}/sqft` : "⚠ Not set — log Monthly Costs first"}
          </div>
        </div>
        {monthlyCosts.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--text)", textAlign: "right" }}>
            From: {monthlyCosts[0].month}<br />
            {monthlyCosts[0].sqft_processed.toLocaleString()} sqft processed
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "#22c55e" },
          { label: "Total Profit", value: `₹${Math.round(totalProfit).toLocaleString()}`, color: totalProfit > 0 ? "#22c55e" : "#ef4444" },
          { label: "Amount Due", value: `₹${Math.round(totalDue).toLocaleString()}`, color: totalDue > 0 ? "#f59e0b" : "#22c55e" },
          { label: "Profit / Loss Blocks", value: `${profitBlocks}✅ ${lossBlocks}❌`, color: "var(--text-h)" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "all", label: "All Blocks" },
          { id: "profit", label: "✅ Profitable" },
          { id: "loss", label: "❌ Loss Making" },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: "6px 14px", minHeight: 36, border: "1px solid", borderColor: filter === f.id ? "#22c55e" : "var(--border)", background: filter === f.id ? "#22c55e22" : "transparent", color: filter === f.id ? "#22c55e" : "var(--text)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Block Analysis Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text)" }}>Calculating...</div>
      ) : analyses.length === 0 ? (
        <div style={{ color: "var(--text)", fontSize: 13, textAlign: "center", padding: 40, border: "1px dashed var(--border)", borderRadius: 12 }}>
          {blocks.length === 0
            ? "No finished blocks yet. Complete the full process flow first."
            : "No blocks match this filter."}
        </div>
      ) : (
        analyses.map((a) => (
          <div key={a.block.id} style={{ ...S.card, borderLeft: `3px solid ${a.isProfit ? "#22c55e" : "#ef4444"}` }}>
            {/* Block Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{a.block.block_no}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-h)", marginTop: 2 }}>{a.block.stone_type}</div>
                {a.block.quarry_name && <div style={{ fontSize: 11, color: "var(--text)", marginTop: 1 }}>📍 {a.block.quarry_name}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, background: `${a.isProfit ? "#22c55e" : "#ef4444"}22`, color: a.isProfit ? "#22c55e" : "#ef4444", border: `1px solid ${a.isProfit ? "#22c55e" : "#ef4444"}44`, borderRadius: 6, padding: "3px 10px", fontWeight: 700, marginBottom: 4 }}>
                  {a.isProfit ? "✅ PROFIT" : "❌ LOSS"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: a.isProfit ? "#22c55e" : "#ef4444" }}>
                  {a.marginPct > 0 ? "+" : ""}{Math.round(a.marginPct)}% margin
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Cost Breakdown per Sqft
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", padding: "8px 12px", background: "var(--code-bg)", borderRadius: 8, flex: 1 }}>
                  <div style={S.label}>Purchase</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>
                    ₹{a.block.total_sqft > 0 ? Math.round(a.purchaseCostPerSqft) : "?"}
                  </div>
                </div>
                <div style={{ fontSize: 16, color: "var(--text)" }}>+</div>
                <div style={{ textAlign: "center", padding: "8px 12px", background: "var(--code-bg)", borderRadius: 8, flex: 1 }}>
                  <div style={S.label}>Overhead</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#a855f7" }}>₹{Math.round(a.overheadPerSqft)}</div>
                </div>
                <div style={{ fontSize: 16, color: "var(--text)" }}>=</div>
                <div style={{ textAlign: "center", padding: "8px 12px", background: "var(--code-bg)", borderRadius: 8, flex: 1 }}>
                  <div style={S.label}>Break-Even</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>₹{Math.round(a.breakEvenPerSqft)}</div>
                </div>
                <div style={{ fontSize: 16, color: "var(--text)" }}>vs</div>
                <div style={{ textAlign: "center", padding: "8px 12px", background: "var(--code-bg)", borderRadius: 8, flex: 1 }}>
                  <div style={S.label}>Avg Sale Rate</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: a.isProfit ? "#22c55e" : "#ef4444" }}>
                    {a.avgSaleRate > 0 ? `₹${Math.round(a.avgSaleRate)}` : "Not sold yet"}
                  </div>
                </div>
                <div style={{ fontSize: 16, color: "var(--text)" }}>=</div>
                <div style={{ textAlign: "center", padding: "8px 12px", background: `${a.isProfit ? "#22c55e" : "#ef4444"}11`, border: `1px solid ${a.isProfit ? "#22c55e" : "#ef4444"}33`, borderRadius: 8, flex: 1 }}>
                  <div style={S.label}>Profit/Sqft</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: a.isProfit ? "#22c55e" : "#ef4444" }}>
                    {a.profitPerSqft > 0 ? "+" : ""}₹{Math.round(a.profitPerSqft)}
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue + Payment Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "Sqft Sold", value: `${a.totalSqftSold.toLocaleString()} sqft` },
                { label: "Total Revenue", value: `₹${a.totalRevenue.toLocaleString()}`, color: "#22c55e" },
                { label: "Amount Due", value: `₹${Math.round(a.totalDue).toLocaleString()}`, color: a.totalDue > 0 ? "#f59e0b" : "#22c55e" },
                { label: "Total Profit", value: `₹${Math.round(a.totalProfit).toLocaleString()}`, color: a.isProfit ? "#22c55e" : "#ef4444" },
              ].map((col) => (
                <div key={col.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: col.color || "var(--text-h)" }}>{col.value}</div>
                </div>
              ))}
            </div>

            {/* Warning if sqft not recorded */}
            {!a.block.total_sqft && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 8, fontSize: 11, color: "#f59e0b" }}>
                ⚠ Total sqft not recorded for this block. Enter it during the first sale to see accurate break-even.
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}