import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";
import { cardStyle, UI } from "../styles";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  [STATUS.YARD]: { label: "Waiting in Yard", color: "#9ca3af", icon: "⏳" },
  [STATUS.CUTTING]: { label: "On Gangsaw — Cutting", color: "#f59e0b", icon: "⚙️" },
  [STATUS.UNPOLISHED]: { label: "Cut — Awaiting Polish", color: "#3b82f6", icon: "🔵" },
  [STATUS.POLISHING]: { label: "On Liner — Polishing", color: "#a855f7", icon: "✨" },
  [STATUS.FINISHED]: { label: "Finished — Ready to Sell", color: "#22c55e", icon: "✅" },
  [STATUS.READY_TO_SELL]: { label: "Ready to Sell", color: "#10b981", icon: "🏪" },
  [STATUS.SOLD]: { label: "Sold & Dispatched", color: "#e5e7eb", icon: "💰" },
};

// --- MINI COMPONENTS (These clean up the "div soup") ---

const StatCard = ({ count, label, color }: any) => (
  <div style={{ ...cardStyle, textAlign: "center", padding: "10px 8px" }}>
    <div style={{ fontSize: 20, fontWeight: 800, color: color }}>{count}</div>
    <div style={{ fontSize: 9, color: UI.colors.textSub, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
  </div>
);

// --- MAIN COMPONENT ---

export default function YardView() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBlocks(true); }, []);

  async function fetchBlocks(isInitial = false) {
    if (isInitial) setLoading(true);
    const { data } = await supabase.from("blocks").select("*").order("created_at", { ascending: false });
    if (data) setBlocks(data);
    setLoading(false);
  }

  const counts = {
    [STATUS.YARD]: blocks.filter((b) => b.status === STATUS.YARD).length,
    [STATUS.CUTTING]: blocks.filter((b) => b.status === STATUS.CUTTING).length,
    [STATUS.UNPOLISHED]: blocks.filter((b) => b.status === STATUS.UNPOLISHED).length,
    [STATUS.POLISHING]: blocks.filter((b) => b.status === STATUS.POLISHING).length,
    [STATUS.FINISHED]: blocks.filter((b) => b.status === STATUS.FINISHED).length,
  };

  const filtered = filter === "all" ? blocks : blocks.filter((b) => b.status === filter);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: UI.spacing.padding }}>
      
      {/* Header */}
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, color: UI.colors.textMain }}>📦 Yard View</h1>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
        <StatCard count={counts[STATUS.YARD]} label="Waiting" color="#9ca3af" />
        <StatCard count={counts[STATUS.CUTTING]} label="Cutting" color="#f59e0b" />
        <StatCard count={counts[STATUS.UNPOLISHED]} label="Unpolished" color="#3b82f6" />
        <StatCard count={counts[STATUS.POLISHING]} label="Polishing" color="#a855f7" />
        <StatCard count={counts[STATUS.FINISHED]} label="Finished" color="#22c55e" />
      </div>

      {/* Filter Buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", STATUS.YARD, STATUS.CUTTING, STATUS.UNPOLISHED, STATUS.POLISHING, STATUS.FINISHED].map((s) => (
          <button 
            key={s} 
            onClick={() => setFilter(s)}
            style={{ 
              padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filter === s ? UI.colors.primary : "#f3f4f6",
              color: filter === s ? "#fff" : UI.colors.textSub,
              border: "none"
            }}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s].label.split("—")[0]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: UI.colors.textSub }}>Loading blocks...</div>
      ) : (
        filtered.map((block) => {
          const cfg = STATUS_CONFIG[block.status] || STATUS_CONFIG[STATUS.YARD];
          return (
            <div key={block.id} style={{ ...cardStyle, borderLeft: `4px solid ${cfg.color}`, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: UI.colors.textMain }}>{block.block_no}</div>
                <div style={{ fontSize: 13, color: UI.colors.textSub }}>{block.stone_type}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.icon} {cfg.label.split("—")[0]}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>₹{block.landed_cost.toLocaleString()}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}