import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const STONE_VARIETIES = [
  "Markino Black", "Rajasthan Black", "Pebble Black", "Coin Black",
  "Ash Black", "Pearl Black", "Black Galaxy", "Kotda Black",
  "Majestic Black", "Forest Black", "Fish Black",
  "P-White (Platinum)", "S White", "Cotton White", "China White",
  "Alaska White", "Viscon White", "Steel Grey", "Armani Grey",
  "Web Grey", "Moon White", "Kashmir White",
  "Crystal Yellow", "Alaska Gold", "Alaska Mango", "Tiger Skin Gold",
  "Titanium Gold", "Imperial Gold", "Desert Brown", "Z Brown", "Brazil Brown",
  "Sindoori Red", "Kharda Red", "Ruby Red", "Lakha Red", "Rosy Pink", "Chima Pink",
  "Blue Dunes", "Jasper Blue", "Alaska Pink", "Alaska Red", "Fantasy Brown",
];

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

export default function BlockInward() {
  const [stoneType, setStoneType] = useState("");
  const [quarryName, setQuarryName] = useState("");
  const [weightTons, setWeightTons] = useState("");
  const [landedCost, setLandedCost] = useState("");
  const [isOwnBlock, setIsOwnBlock] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [nextBlockNo, setNextBlockNo] = useState("MLG-001");

  useEffect(() => { fetchBlocks(); }, []);

 async function fetchBlocks() {
    const { data } = await supabase
      .from("blocks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setBlocks(data);
      setNextBlockNo(`MLG-${String(data.length + 1).padStart(3, "0")}`);
    }

    // Inject fancy animation keyframes into the page header dynamically
    if (!document.getElementById("fancy-animations")) {
      const style = document.createElement("style");
      style.id = "fancy-animations";
      style.innerHTML = `
        @keyframes fancyFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes liveIndicator {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .live-pulse { animation: liveIndicator 1.5s infinite ease-in-out; }
      `;
      document.head.appendChild(style);
    }
  }

  function handleStoneTypeChange(value: string) {
    setStoneType(value);
    setSuggestions(value.length > 0
      ? STONE_VARIETIES.filter((v) => v.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
      : []);
  }

  async function handleSubmit() {
    if (!stoneType || !weightTons || !landedCost) {
      setMessage("❌ Please fill Stone Type, Weight and Cost.");
      return;
    }
    setLoading(true);
    setMessage("");
    await supabase.from("stone_varieties").upsert({ name: stoneType }, { onConflict: "name" });
    const { error } = await supabase.from("blocks").insert({
      block_no: nextBlockNo,
      stone_type: stoneType,
      quarry_name: quarryName,
      weight_tons: parseFloat(weightTons),
      landed_cost: parseFloat(landedCost),
      is_own_block: isOwnBlock,
      status: "yard",
    });
    setLoading(false);
    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage(`✅ Block ${nextBlockNo} logged!`);
      setStoneType(""); setQuarryName(""); setWeightTons(""); setLandedCost("");
      setIsOwnBlock(true);
      fetchBlocks();
    }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "0 auto", padding: 24 },
    label: { fontSize: 11, color: "var(--text)", textTransform: "uppercase" as const, letterSpacing: "0.1em", display: "block", marginBottom: 6 },
    /* Added minHeight 44px for accessibility touch targets */
    input: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" as const },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 32 },
  };

  return (
    <div style={{ ...S.page, animation: "fancyFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
      <div style={{ marginBottom: 32, paddingTop: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>Block Inward Entry</h1>
        <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>Log every block that enters the factory gate.</p>
      </div>

      <div style={S.card}>
        {/* Auto Block Number */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--accent-border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={S.label}>Auto Block ID</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{nextBlockNo}</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text)", textAlign: "right" }}>Auto-assigned<br />on save</div>
        </div>

        {/* Block Type */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Block Type *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ val: true, label: "🪨 Own Block", color: "#ef4444" }, { val: false, label: "🔧 Job Work", color: "#3b82f6" }].map((opt) => (
              <button key={String(opt.val)} onClick={() => setIsOwnBlock(opt.val)}
                /* Added minHeight 44px here */
                style={{ flex: 1, padding: "10px 0", minHeight: 44, border: "1px solid", borderColor: isOwnBlock === opt.val ? opt.color : "var(--border)", background: isOwnBlock === opt.val ? `${opt.color}22` : "transparent", color: isOwnBlock === opt.val ? opt.color : "var(--text)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stone Type */}
        <div style={{ marginBottom: 16, position: "relative" }}>
          <label style={S.label}>Stone Type *</label>
          <input value={stoneType} onChange={(e) => handleStoneTypeChange(e.target.value)} placeholder="Start typing e.g. Rajasthan..." style={S.input} />
          {suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 10 }}>
              {suggestions.map((s) => (
                <div key={s} onClick={() => { setStoneType(s); setSuggestions([]); }}
                  /* Added minHeight 44px here to ensure dropdown items are easy to tap */
                  style={{ padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text-h)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quarry */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Quarry / Supplier Name</label>
          <input value={quarryName} onChange={(e) => setQuarryName(e.target.value)} placeholder="e.g. Bhilwara Quarry, Rajasthan" style={S.input} />
        </div>

        {/* Weight + Cost */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Weight (Tons) *</label>
            <input type="number" value={weightTons} onChange={(e) => setWeightTons(e.target.value)} placeholder="e.g. 12.5" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Total Purchase Cost (₹) *</label>
            <input type="number" value={landedCost} onChange={(e) => setLandedCost(e.target.value)} placeholder="e.g. 85000" style={S.input} />
          </div>
        </div>

        {weightTons && landedCost && (
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--text)" }}>
            💡 Cost per ton: <strong style={{ color: "var(--text-h)" }}>₹{Math.round(parseFloat(landedCost) / parseFloat(weightTons)).toLocaleString()}</strong>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          /* Added minHeight 44px here */
          style={{ width: "100%", padding: "12px 0", minHeight: 44, background: loading ? "var(--border)" : "var(--accent)", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Saving..." : `⬇ Log Block ${nextBlockNo} Into Yard`}
        </button>

        {message && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: message.includes("✅") ? "#22c55e22" : "#ef444422", borderRadius: 8, fontSize: 13, color: message.includes("✅") ? "#22c55e" : "#ef4444" }}>
            {message}
          </div>
        )}
      </div>

      {/* Blocks List */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-h)" }}>Blocks in Yard ({blocks.length})</h2>
      {blocks.length === 0 ? (
        <div style={{ color: "var(--text)", fontSize: 13, textAlign: "center", padding: 40, border: "1px dashed var(--border)", borderRadius: 12 }}>No blocks logged yet.</div>
      ) : (
        blocks.map((block) => (
          <div key={block.id} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
            {[
              { label: "Block ID", value: block.block_no, color: "#ef4444" },
              { label: "Stone Type", value: block.stone_type },
              { label: "Type", value: block.is_own_block ? "Own" : "Job Work", color: block.is_own_block ? "#ef4444" : "#3b82f6" },
              { label: "Weight", value: `${block.weight_tons}T` },
              { label: "Cost", value: `₹${block.landed_cost.toLocaleString()}` },
            ].map((col) => (
              <div key={col.label}>
                <div style={{ fontSize: 10, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: col.color || "var(--text-h)" }}>{col.value}</div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}