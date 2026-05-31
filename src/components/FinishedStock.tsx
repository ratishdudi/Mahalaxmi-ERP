import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const FINISHES = ["Polished", "Lapatro", "Leather"];
const THICKNESSES = ["16mm", "18mm", "30mm"];

type Block = {
  id: string;
  block_no: string;
  stone_type: string;
  quarry_name: string;
  weight_tons: number;
  landed_cost: number;
  is_own_block: boolean;
  status: string;
  slab_count?: number | null;
};

type FinishedEntry = {
  id: string;
  block_id: string;
  block_no: string;
  stone_type: string;
  finish: string;
  thickness: string;
  notes: string;
  created_at: string;
  blocks?: any; // Allows flexible access to the joined relationship payload safely
};

type SaleRow = {
  block_id: string;
  sqft_sold: number;
};

export default function FinishedStock() {
  const [finishedBlocks, setFinishedBlocks] = useState<Block[]>([]);
  const [entries, setEntries] = useState<FinishedEntry[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [finish, setFinish] = useState("Polished");
  const [thickness, setThickness] = useState("18mm");
  const [slabCount, setSlabCount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchFinishedBlocks();
    fetchEntries();
    fetchSales();
  }, []);

  async function fetchFinishedBlocks() {
    const { data } = await supabase
      .from("blocks")
      .select("*")
      .eq("status", "finished")
      .order("created_at", { ascending: false });
    if (data) setFinishedBlocks(data);
  }

  async function fetchEntries() {
    // Actively fetching total_sqft from the parent blocks table join
    const { data } = await supabase
      .from("finished_stock")
      .select("*, blocks(total_sqft, status)")
      .order("created_at", { ascending: false });
    if (data) setEntries(data as FinishedEntry[]);
  }

  async function fetchSales() {
    const { data } = await supabase.from("sales").select("block_id, sqft_sold");
    if (data) setSales(data as SaleRow[]);
  }

  async function handleSubmit() {
    if (!selectedBlock) {
      setMessage("❌ Select a finished block.");
      return;
    }

    setLoading(true);
    setMessage("");

    const block = finishedBlocks.find((b) => b.id === selectedBlock);

    const { error } = await supabase.from("finished_stock").insert({
      block_id: selectedBlock,
      block_no: block?.block_no,
      stone_type: block?.stone_type,
      finish,
      thickness,
      notes,
      sqft_sold: 0,
      is_own_block: block?.is_own_block,
    });

    const { error: statusError } = await supabase
      .from("blocks")
      .update({ status: "ready_to_sell", slab_count: slabCount ? Number(slabCount) : null })
      .eq("id", selectedBlock);

    setLoading(false);

    if (statusError) {
      setMessage("Save failed: " + statusError.message);
      return;
    }

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage(`✅ ${block?.block_no} logged as finished stock!`);
      setSelectedBlock("");
      setFinish("Polished");
      setThickness("18mm");
      setSlabCount("");
      setNotes("");
      fetchFinishedBlocks();
      fetchEntries();
    }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "0 auto", padding: 16 },
    label: { fontSize: 11, color: "var(--text)", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: 6 },
    select: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" as const },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20 },
    input: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" as const },
  };

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>✅ Finished Stock</h1>
        <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>
          Log polished slabs ready for sale. Sqft measured at sale time.
        </p>
      </div>

      {/* Info Banner */}
      <div style={{ background: "#27ae6011", border: "1px solid #27ae6033", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#27ae60" }}>
        💡 Only blocks that have completed the Liner Polish Machine appear here.
        Sqft will be recorded when the slab is actually sold.
      </div>

      {/* Form */}
      <div style={S.card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Log Finished Batch</h2>

        {/* Block Selection */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Select Finished Block *</label>
          {finishedBlocks.length === 0 ? (
            <div style={{ padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--text)" }}>
              No blocks with "finished" status yet. Complete a liner session first.
            </div>
          ) : (
            <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} style={S.select}>
              <option value="">-- Choose Block --</option>
              {finishedBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.block_no} — {b.stone_type} · {b.weight_tons}T · {b.is_own_block ? "Own" : "Job Work"}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Show block details when selected */}
        {selectedBlock && (() => {
          const block = finishedBlocks.find((b) => b.id === selectedBlock);
          return block ? (
            <div style={{ background: "var(--bg)", border: "1px solid #22c55e33", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Stone Type", value: block.stone_type },
                  { label: "Weight", value: `${block.weight_tons}T` },
                  { label: "Purchase Cost", value: `₹${block.landed_cost.toLocaleString()}` },
                ].map((col) => (
                  <div key={col.label}>
                    <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{col.value}</div>
                  </div>
                ))}
              </div>
              {block.quarry_name && (
                <div style={{ fontSize: 11, color: "var(--text)", marginTop: 8 }}>Location: {block.quarry_name}</div>
              )}
            </div>
          ) : null;
        })()}

        {/* Finish Type */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Surface Finish *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {FINISHES.map((f) => (
              <button key={f} onClick={() => setFinish(f)}
                style={{ padding: "10px 0", border: "1px solid", borderColor: finish === f ? "#22c55e" : "var(--border)", background: finish === f ? "#22c55e22" : "transparent", color: finish === f ? "#16a34a" : "var(--text)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Thickness */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Thickness *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {THICKNESSES.map((t) => (
              <button key={t} onClick={() => setThickness(t)}
                style={{ padding: "10px 0", border: "1px solid", borderColor: thickness === t ? "#22c55e" : "var(--border)", background: thickness === t ? "#22c55e22" : "transparent", color: thickness === t ? "#16a34a" : "var(--text)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                {t}{t === "18mm" ? " (Std)" : ""}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Slab Count</label>
          <input
            type="number"
            value={slabCount}
            onChange={(e) => setSlabCount(e.target.value)}
            placeholder="Number of slabs produced"
            style={S.input}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Notes (Optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 3 slabs broken during polishing, minor vein variation"
            style={S.input}
          />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "12px 0", background: loading ? "var(--border)" : "#22c55e", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Saving..." : "✅ Log as Finished Stock — Ready to Sell"}
        </button>

        {message && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: message.includes("✅") ? "#27ae6022" : "#c0392b22", borderRadius: 8, fontSize: 13, color: message.includes("✅") ? "#27ae60" : "#c0392b" }}>
            {message}
          </div>
        )}
      </div>

      {/* Finished Stock Ready to Sell */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
          Stock Ready to Sell ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <div style={{ color: "var(--text)", fontSize: 13, textAlign: "center", padding: 32, border: "1px dashed var(--border)", borderRadius: 12 }}>
            No finished stock yet.
          </div>
        ) : (
          entries.map((entry) => {
            // Safety parser: Extract total_sqft correctly whether Supabase maps it as an object or single-item array
            const relatedBlock = Array.isArray(entry.blocks) ? entry.blocks[0] : entry.blocks;
            const liveSqft = relatedBlock?.total_sqft;
            const soldSqft = sales
              .filter((sale) => sale.block_id === entry.block_id)
              .reduce((sum, sale) => sum + Number(sale.sqft_sold || 0), 0);
            const availableSqft = Math.max(Number(liveSqft || 0) - soldSqft, 0);

            return (
              <div key={entry.id} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderLeft: "3px solid #22c55e", borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#c0392b" }}>{entry.block_no}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{entry.stone_type}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, background: "#27ae6022", color: "#27ae60", border: "1px solid #27ae6044", borderRadius: 6, padding: "3px 8px", fontWeight: 700 }}>
                      ✅ Ready to Sell
                    </div>
                    
                    {/* Live Dynamic Square Footage Badge */}
                    <div style={{ fontSize: 11, color: "var(--text)", marginTop: 4 }}>
                      Available:{" "}
                      <span style={{ 
                        color: availableSqft > 0 ? "#22c55e" : "#d4a843", 
                        fontWeight: 600 
                      }}>
                        {liveSqft && liveSqft > 0 ? `${availableSqft.toLocaleString()} Sqft` : "Measured at sale"}
                      </span>
                    </div>
                    {liveSqft && soldSqft > 0 && (
                      <div style={{ fontSize: 10, color: "var(--text)", marginTop: 2 }}>
                        Sold {soldSqft.toLocaleString("en-IN")} of {Number(liveSqft).toLocaleString("en-IN")} Sqft
                      </div>
                    )}

                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Finish", value: entry.finish },
                    { label: "Thickness", value: entry.thickness },
                    { label: "Notes", value: entry.notes || "—" },
                  ].map((col) => (
                    <div key={col.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{col.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
