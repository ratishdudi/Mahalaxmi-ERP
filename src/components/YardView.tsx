import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  [STATUS.YARD]: { label: "Waiting in Yard", color: "#9ca3af", icon: "⏳" },
  [STATUS.CUTTING]: { label: "On Gangsaw — Cutting", color: "#f59e0b", icon: "⚙️" },
  [STATUS.UNPOLISHED]: { label: "Cut — Awaiting Polish", color: "#3b82f6", icon: "🔵" },
  [STATUS.POLISHING]: { label: "On Liner — Polishing", color: "#a855f7", icon: "✨" },
  [STATUS.FINISHED]: { label: "Finished — Ready to Sell", color: "#22c55e", icon: "✅" },
  [STATUS.READY_TO_SELL]: { label: "Ready to Sell", color: "#10b981", icon: "🏪" },
  [STATUS.SOLD]: { label: "Sold & Dispatched", color: "#e5e7eb", icon: "💰" },
};

type Block = {
  id: string;
  block_no: string;
  stone_type: string;
  quarry_name: string;
  weight_tons: number;
  landed_cost: number;
  is_own_block: boolean;
  status: string;
  created_at: string;
};

export default function YardView() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlocks(true);

    if (!document.getElementById("fancy-animations")) {
      const style = document.createElement("style");
      style.id = "fancy-animations";
      style.innerHTML = `
        @keyframes fancyFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    const interval = setInterval(() => {
      if (!loading && document.visibilityState === 'visible') {
        fetchBlocks(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function fetchBlocks(isInitial = false) {
    try {
      if (isInitial) setLoading(true);
      
      const { data, error } = await supabase
        .from("blocks")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Supabase Error:", error.message);
        return;
      }
      
      if (data) setBlocks(data);
    } catch (err) {
      console.error("Unexpected fetch error:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  const statusOptions = ["all", STATUS.YARD, STATUS.CUTTING, STATUS.UNPOLISHED, STATUS.POLISHING, STATUS.FINISHED, STATUS.SOLD];
  const filtered = filter === "all" ? blocks : blocks.filter((b) => b.status === filter);

 const counts = {
  [STATUS.YARD]: blocks.filter((b) => b.status === STATUS.YARD).length,
  [STATUS.CUTTING]: blocks.filter((b) => b.status === STATUS.CUTTING).length,
  [STATUS.UNPOLISHED]: blocks.filter((b) => b.status === STATUS.UNPOLISHED).length,
  [STATUS.POLISHING]: blocks.filter((b) => b.status === STATUS.POLISHING).length,
  [STATUS.FINISHED]: blocks.filter((b) => b.status === STATUS.FINISHED).length,
  [STATUS.READY_TO_SELL]: blocks.filter((b) => b.status === STATUS.READY_TO_SELL).length, // 👈 ADD THIS LINE
};

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, animation: "fancyFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>📦 Yard View</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
        {[
          { key: STATUS.YARD, label: "Waiting", color: "#9ca3af" },
          { key: STATUS.CUTTING, label: "Cutting", color: "#f59e0b" },
          { key: STATUS.UNPOLISHED, label: "Unpolished", color: "#3b82f6" },
          { key: STATUS.POLISHING, label: "Polishing", color: "#a855f7" },
          { key: STATUS.FINISHED, label: "Finished", color: "#22c55e" },
        ].map((s) => (
          <div key={s.key} style={{ background: "var(--code-bg)", border: `1px solid ${s.color}33`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{counts[s.key as keyof typeof counts]}</div>
            <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {statusOptions.map((s) => {
          const cfg = s === "all" ? { label: "All", color: "#e5e7eb" } : STATUS_CONFIG[s];
          return (
            <button type="button" key={s} onClick={() => setFilter(s)}
              style={{ padding: "5px 12px", minHeight: 44, border: "1px solid", borderColor: filter === s ? (cfg?.color || "#e5e7eb") : "var(--border)", background: filter === s ? `${cfg?.color}22` : "transparent", color: filter === s ? (cfg?.color || "#e5e7eb") : "var(--text)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              {s === "all" ? "All" : cfg?.label?.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ color: "var(--text)", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--text)", fontSize: 13, textAlign: "center", padding: 40, border: "1px dashed var(--border)", borderRadius: 12 }}>No blocks found.</div>
      ) : (
        filtered.map((block) => {
          const cfg = STATUS_CONFIG[block.status] || STATUS_CONFIG[STATUS.YARD];
          
          return (
            <div key={block.id} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderLeft: `3px solid ${cfg.color}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{block.block_no}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: "var(--text-h)" }}>{block.stone_type}</div>
                </div>
                <div style={{ fontSize: 10, background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 6, padding: "3px 8px", fontWeight: 700, textTransform: "uppercase" }}>
                  {cfg.icon} {cfg.label}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Weight", value: `${block.weight_tons}T` },
                  { label: "Cost", value: `₹${block.landed_cost.toLocaleString()}` },
                  { label: "Cost/Ton", value: `₹${Math.round(block.landed_cost / block.weight_tons).toLocaleString()}` },
                ].map((col) => (
                  <div key={col.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-h)" }}>{col.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}