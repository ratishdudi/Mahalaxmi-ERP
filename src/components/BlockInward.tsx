import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { cardStyle } from "../styles"; // Assuming these exist
import { getCostProfile, QUARRY_PROFILES, STONE_PROFILES, money } from "../costing";

const STONE_VARIETIES = STONE_PROFILES.map((stone) => stone.name);

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
  const [quarrySuggestions, setQuarrySuggestions] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [nextBlockNo, setNextBlockNo] = useState("MLG-001");

  useEffect(() => {
    fetchBlocks();
    // Inject global animations
    if (!document.getElementById("fancy-animations")) {
      const style = document.createElement("style");
      style.id = "fancy-animations";
      style.innerHTML = `
        @keyframes fancyFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fancy-in { animation: fancyFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  async function fetchBlocks() {
    const { data } = await supabase.from("blocks").select("*").order("created_at", { ascending: false });
    if (data) {
      setBlocks(data);
      setNextBlockNo(`MLG-${String(data.length + 1).padStart(3, "0")}`);
    }
  }

  function handleStoneTypeChange(value: string) {
    setStoneType(value);
    setSuggestions(value.length > 0
      ? STONE_VARIETIES.filter((v) => v.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
      : []);
  }

  function handleQuarryChange(value: string) {
    setQuarryName(value);
    setQuarrySuggestions(value.length > 0
      ? QUARRY_PROFILES
          .filter((q) => q.name.toLowerCase().includes(value.toLowerCase()) || q.region.toLowerCase().includes(value.toLowerCase()))
          .map((q) => q.name)
          .slice(0, 5)
      : []);
  }

  async function handleSubmit() {
    if (!stoneType || !weightTons || !landedCost) {
      setMessage("❌ Please fill all fields.");
      return;
    }
    setLoading(true);
    const { error: stoneTypeError } = await supabase.from("stone_types").upsert(
      { name: stoneType.trim() },
      { onConflict: "name" }
    );
    if (stoneTypeError && !["PGRST205", "42P01"].includes(stoneTypeError.code || "")) {
      setMessage("âŒ Stone type master update failed: " + stoneTypeError.message);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("blocks").insert({
      block_no: nextBlockNo, stone_type: stoneType.trim(), quarry_name: quarryName.trim(),
      weight_tons: parseFloat(weightTons), landed_cost: parseFloat(landedCost),
      is_own_block: isOwnBlock, status: "yard"
    });

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage(`✅ Block ${nextBlockNo} logged!`);
      setStoneType(""); setQuarryName(""); setWeightTons(""); setLandedCost("");
      fetchBlocks();
    }
    setLoading(false);
  }

  const S = {
    input: { width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 16, boxSizing: "border-box" as const },
    label: { fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, marginBottom: 6, display: "block" }
  };
  const costProfile = getCostProfile(stoneType, quarryName);
  const landedCostNumber = Number(landedCost || 0);
  const expectedSqft = Number(weightTons || 0) > 0 ? Math.round(Number(weightTons) * 1000 * (costProfile.expectedYieldPct / 100)) : 0;
  const purchasePerExpectedSqft = expectedSqft > 0 ? landedCostNumber / expectedSqft : 0;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px" }} className="fancy-in">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Block Inward Entry</h1>

      {/* Form Card */}
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 12, marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={S.label}>Next ID</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{nextBlockNo}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Block Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[true, false].map((val) => (
              <button key={String(val)} onClick={() => setIsOwnBlock(val)} style={{ flex: 1, padding: "12px", borderRadius: 8, border: `1px solid ${isOwnBlock === val ? "#2563eb" : "#e5e7eb"}`, background: isOwnBlock === val ? "#eff6ff" : "white", fontWeight: 600, cursor: "pointer" }}>
                {val ? "🪨 Own" : "🔧 Job Work"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16, position: "relative" }}>
          <label style={S.label}>Stone Type</label>
          <input value={stoneType} onChange={(e) => handleStoneTypeChange(e.target.value)} placeholder="e.g. Rajasthan Black" style={S.input} />
          {suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, zIndex: 10, marginTop: 4, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
              {suggestions.map((s) => <div key={s} onClick={() => { setStoneType(s); setSuggestions([]); }} style={{ padding: "12px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}>{s}</div>)}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16, position: "relative" }}>
          <label style={S.label}>Quarry / Source</label>
          <input value={quarryName} onChange={(e) => handleQuarryChange(e.target.value)} placeholder="e.g. Jalore, Kotda, Ongole" style={S.input} />
          {quarrySuggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, zIndex: 10, marginTop: 4, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
              {quarrySuggestions.map((q) => <div key={q} onClick={() => { setQuarryName(q); setQuarrySuggestions([]); }} style={{ padding: "12px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}>{q}</div>)}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Weight (Tons)</label>
            <input type="number" value={weightTons} onChange={(e) => setWeightTons(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Cost (₹)</label>
            <input type="number" value={landedCost} onChange={(e) => setLandedCost(e.target.value)} style={S.input} />
          </div>
        </div>

        {(stoneType || quarryName || weightTons || landedCost) && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#111827", marginBottom: 10 }}>Cost Intelligence Preview</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "Hardness", value: `${costProfile.hardnessMultiplier}x`, color: costProfile.hardnessMultiplier > 1.12 ? "#ef4444" : "#2563eb" },
                { label: "Yield Est.", value: `${costProfile.expectedYieldPct}%`, color: "#16a34a" },
                { label: "Base Price", value: costProfile.basePrice ? money(costProfile.basePrice) : "Learning", color: "#111827" },
                { label: "Est. Buy/Sqft", value: purchasePerExpectedSqft > 0 ? money(purchasePerExpectedSqft) : "-", color: "#f59e0b" },
              ].map((item) => (
                <div key={item.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {costProfile.quarry && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>{costProfile.quarry.notes}</div>
            )}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "14px", background: "#111827", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Saving..." : "Log Block"}
        </button>
        {message && <div style={{ marginTop: 12, fontSize: 13, color: message.includes("✅") ? "green" : "red" }}>{message}</div>}
      </div>

      {/* List View */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Recent ({blocks.length})</h2>
      {blocks.map((block) => (
        <div key={block.id} style={{ ...cardStyle, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{block.block_no}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{block.stone_type}{block.quarry_name ? ` / ${block.quarry_name}` : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{block.weight_tons}T</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>₹{block.landed_cost.toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
