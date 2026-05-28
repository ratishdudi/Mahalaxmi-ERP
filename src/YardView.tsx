import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  yard: { label: "Waiting in Yard", color: "#555", icon: "⏳" },
  cutting: { label: "On Gangsaw — Cutting", color: "#d4a843", icon: "⚙️" },
  unpolished_stock: { label: "Cut — Awaiting Polish", color: "#2980b9", icon: "🔵" },
  polishing: { label: "On Liner — Polishing", color: "#8e44ad", icon: "✨" },
  finished: { label: "Finished — Ready to Sell", color: "#27ae60", icon: "✅" },
  sold: { label: "Sold & Dispatched", color: "#333", icon: "💰" },
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

  useEffect(() => { fetchBlocks(); }, []);

  async function fetchBlocks() {
    setLoading(true);
    const { data } = await supabase
      .from("blocks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBlocks(data);
    setLoading(false);
  }

  const statusOptions = ["all", "yard", "cutting", "unpolished_stock", "polishing", "finished", "sold"];

  const filtered = filter === "all" ? blocks : blocks.filter((b) => b.status === filter);

  const counts = {
    yard: blocks.filter((b) => b.status === "yard").length,
    cutting: blocks.filter((b) => b.status === "cutting").length,
    unpolished_stock: blocks.filter((b) => b.status === "unpolished_stock").length,
    polishing: blocks.filter((b) => b.status === "polishing").length,
    finished: blocks.filter((b) => b.status === "finished").length,
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>

      {/* Header */}
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>📦 Yard View</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Track every block from gate to sale.</p>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
        {[
          { key: "yard", label: "Waiting", color: "#555" },
          { key: "cutting", label: "Cutting", color: "#d4a843" },
          { key: "unpolished_stock", label: "Unpolished", color: "#2980b9" },
          { key: "polishing", label: "Polishing", color: "#8e44ad" },
          { key: "finished", label: "Finished", color: "#27ae60" },
        ].map((s) => (
          <div key={s.key} style={{ background: "#111", border: `1px solid ${s.color}33`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{counts[s.key as keyof typeof counts]}</div>
            <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {statusOptions.map((s) => {
          const cfg = s === "all" ? { label: "All", color: "#e8e8e8" } : STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: "5px 12px", border: "1px solid", borderColor: filter === s ? (cfg?.color || "#e8e8e8") : "#1e1e1e", background: filter === s ? `${cfg?.color}22` : "transparent", color: filter === s ? (cfg?.color || "#e8e8e8") : "#555", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              {s === "all" ? "All" : cfg?.label?.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Blocks List */}
      {loading ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 40, border: "1px dashed #1e1e1e", borderRadius: 12 }}>No blocks found.</div>
      ) : (
        filtered.map((block) => {
          const cfg = STATUS_CONFIG[block.status] || STATUS_CONFIG.yard;
          return (
            <div key={block.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderLeft: `3px solid ${cfg.color}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#c0392b" }}>{block.block_no}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{block.stone_type}</div>
                  {block.quarry_name && <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{block.quarry_name}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 6, padding: "3px 8px", fontWeight: 700 }}>
                    {cfg.icon} {cfg.label}
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>{block.is_own_block ? "Own Block" : "Job Work"}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Weight", value: `${block.weight_tons}T` },
                  { label: "Purchase Cost", value: `₹${block.landed_cost.toLocaleString()}` },
                  { label: "Cost/Ton", value: `₹${Math.round(block.landed_cost / block.weight_tons).toLocaleString()}` },
                ].map((col) => (
                  <div key={col.label} style={{ background: "#0a0a0a", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{col.value}</div>
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