import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";
import SmartTextInput from "./SmartTextInput";
import { canonicalName, uniqueCanonicalNames } from "../names";

type Block = {
  id: string;
  block_no: string;
  stone_type: string;
  quarry_name: string;
  weight_tons: number;
  total_sqft: number;
  status: string;
};

type Sale = {
  id: string;
  block_id: string;
  buyer_name: string;
  sqft_sold: number;
  rate_per_sqft: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  sold_at: string;
  blocks?: {
    block_no: string;
    stone_type: string;
  };
};

export default function SalesEntry() {
  const [finishedBlocks, setFinishedBlocks] = useState<Block[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]); 
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  
  // Form State
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [sqftSold, setSqftSold] = useState("");
  const [ratePerSqft, setRatePerSqft] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [totalYieldInput, setTotalYieldInput] = useState(""); 
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    const { data: blocksData } = await supabase
      .from("blocks")
      .select("id, block_no, stone_type, quarry_name, weight_tons, total_sqft, status")
      .eq("status", STATUS.READY_TO_SELL) 
      .order("created_at", { ascending: false });

    const { data: salesData } = await supabase
      .from("sales")
      .select("*, blocks(block_no, stone_type)")
      .order("sold_at", { ascending: false });

    if (blocksData) setFinishedBlocks(blocksData);
    if (salesData) {
      setAllSales(salesData);
      setRecentSales(salesData.slice(0, 10)); 
    }
    setLoading(false);
  }

  // Derived calculations
  const selectedBlock = finishedBlocks.find((b) => b.id === selectedBlockId);
  
  const totalSoldSoFar = allSales
    .filter((s) => s.block_id === selectedBlockId)
    .reduce((sum, s) => sum + Number(s.sqft_sold), 0);

  const isYieldRequired = selectedBlock && (!selectedBlock.total_sqft || selectedBlock.total_sqft === 0);
  const currentTotalSqft = isYieldRequired ? Number(totalYieldInput) : (selectedBlock?.total_sqft || 0);
  const remainingSqft = Math.max(currentTotalSqft - totalSoldSoFar, 0);

  // Auto-calculated Invoice Logic
  const computedTotalAmount = Number(sqftSold) * Number(ratePerSqft) || 0;
  const currentPaid = Number(amountPaid) || 0;
  const partySuggestions = uniqueCanonicalNames(allSales.map((sale) => sale.buyer_name));

  // 🔥 Smart Payment Status Logic 
  let autoPaymentStatus = "due";
  if (computedTotalAmount > 0) {
    if (currentPaid >= computedTotalAmount) {
      autoPaymentStatus = "paid";
    } else if (currentPaid > 0) {
      autoPaymentStatus = "partial";
    }
  }

  async function handleSaveSale(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBlockId || !buyerName || !sqftSold || !ratePerSqft) {
      setMessage("❌ Please fill out all required fields.");
      return;
    }

    const inputSqft = Number(sqftSold);
    const inputRate = Number(ratePerSqft);
    const inputPaid = Number(amountPaid) || 0;

    if (inputSqft <= 0 || inputRate <= 0) {
      setMessage("❌ Quantities and rates must be greater than zero.");
      return;
    }

    if (isYieldRequired && (!currentTotalSqft || currentTotalSqft <= 0)) {
      setMessage("❌ Enter the total block yield before recording this sale.");
      return;
    }

    if (inputPaid > computedTotalAmount) {
      setMessage("❌ Amount paid cannot be more than the invoice value.");
      return;
    }

    if (inputSqft > remainingSqft || (isYieldRequired && inputSqft + totalSoldSoFar > currentTotalSqft)) {
      setMessage(`❌ Cannot sell ${inputSqft} Sqft. Only ${remainingSqft} Sqft remaining on this block.`);
      return;
    }

    setLoading(true);
    setMessage("");
    const cleanBuyerName = canonicalName(buyerName, partySuggestions);

    if (isYieldRequired) {
      const { error: yieldError } = await supabase
        .from("blocks")
        .update({ total_sqft: currentTotalSqft })
        .eq("id", selectedBlockId);

      if (yieldError) {
        setMessage("❌ Failed to save total block yield: " + yieldError.message);
        setLoading(false);
        return;
      }
    }

    // Insert using the Smart Status
    const { error: saleError } = await supabase.from("sales").insert({
      block_id: selectedBlockId,
      buyer_name: cleanBuyerName,
      sqft_sold: inputSqft,
      rate_per_sqft: inputRate,
      total_amount: computedTotalAmount,
      amount_paid: inputPaid,
      payment_status: autoPaymentStatus, // 👈 Pushes the auto-calculated status directly to DB
      sold_at: new Date().toISOString(),
    });

    if (saleError) {
      setMessage("❌ Failed to record sale: " + saleError.message);
      setLoading(false);
      return;
    }

    if (remainingSqft - inputSqft === 0) {
      await supabase
        .from("blocks")
        .update({ status: STATUS.SOLD })
        .eq("id", selectedBlockId);
    }

    setMessage("✅ Sale recorded successfully!");
    
    // Reset Form Fields
    setSelectedBlockId("");
    setBuyerName("");
    setSqftSold("");
    setRatePerSqft("");
    setAmountPaid("");
    setTotalYieldInput("");
    
    await fetchData();
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "0 auto", padding: 16 },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 24 },
    label: { fontSize: 11, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 },
    input: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" },
    select: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" },
    badge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, textTransform: "uppercase" },
  };

  return (
    <div style={S.page}>
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>💰 Sales Entry</h1>
        <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>Log partial or full slab sales directly from finished inventory.</p>
      </div>

      <div style={S.card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-h)" }}>▶ Record New Transaction</h2>
        <form onSubmit={handleSaveSale}>
          
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Select Finished Block *</label>
            <select value={selectedBlockId} onChange={(e) => { setSelectedBlockId(e.target.value); setMessage(""); }} style={S.select}>
              <option value="">-- Choose Block --</option>
              {finishedBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.block_no} — {b.stone_type} ({b.quarry_name || "Unknown Quarry"})
                </option>
              ))}
            </select>
          </div>

          {selectedBlock && (
            <div style={{ marginBottom: 16, padding: 14, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text)" }}>TOTAL STOCK SOLD SO FAR</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-h)" }}>{totalSoldSoFar} Sqft</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text)" }}>CURRENT REMAINING INVENTORY</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>
                  {isYieldRequired ? "Awaiting total yield entry..." : `${remainingSqft} Sqft`}
                </div>
              </div>
            </div>
          )}

          {isYieldRequired && (
            <div style={{ marginBottom: 16, padding: 14, background: "#f59e0b11", border: "1px dashed #f59e0b", borderRadius: 10 }}>
              <label style={{ ...S.label, color: "#f59e0b" }}>⚠️ Total Block Yield (Sqft) *</label>
              <p style={{ margin: "0 0 8px 0", fontSize: 11, color: "var(--text)" }}>This block has no total yield recorded yet. Enter the total production square footage before writing a sale.</p>
              <input type="number" placeholder="e.g. 2450" value={totalYieldInput} onChange={(e) => setTotalYieldInput(e.target.value)} style={S.input} />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Buyer Name *</label>
              <SmartTextInput
                value={buyerName}
                onChange={setBuyerName}
                suggestions={partySuggestions}
                placeholder="Start typing party name"
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Square Feet Sold *</label>
              <input type="number" placeholder={selectedBlock ? `Max ${remainingSqft} Sqft` : "Quantity sold"} value={sqftSold} onChange={(e) => setSqftSold(e.target.value)} style={S.input} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={S.label}>Rate per Sqft (₹) *</label>
              <input type="number" placeholder="Rate in ₹" value={ratePerSqft} onChange={(e) => setRatePerSqft(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Amount Paid (₹)</label>
              <input type="number" placeholder="Leave empty if due" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Payment Status</label>
              {/* 🔥 Smart Status UI: Replaced dropdown with an auto-updating badge */}
              <div style={{
                padding: "10px 14px",
                minHeight: 44,
                background: autoPaymentStatus === "paid" ? "#22c55e22" : autoPaymentStatus === "partial" ? "#f59e0b22" : "#ef444422",
                border: `1px solid ${autoPaymentStatus === "paid" ? "#22c55e" : autoPaymentStatus === "partial" ? "#f59e0b" : "#ef4444"}`,
                borderRadius: 8,
                color: autoPaymentStatus === "paid" ? "#22c55e" : autoPaymentStatus === "partial" ? "#f59e0b" : "#ef4444",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                boxSizing: "border-box"
              }}>
                {autoPaymentStatus === "paid" ? "🟢 Fully Paid" : autoPaymentStatus === "partial" ? "🟡 Partial Paid" : "🔴 Fully Due"}
              </div>
            </div>
          </div>

          {computedTotalAmount > 0 && (
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Calculated Invoice Value:</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-h)" }}>₹{computedTotalAmount.toLocaleString()}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px 0", minHeight: 44, background: loading ? "var(--border)" : "#22c55e", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Processing Sale..." : "💾 RECORD TRANSACTION"}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: message.includes("✅") ? "#22c55e22" : "#ef444422", borderRadius: 8, fontSize: 13, color: message.includes("✅") ? "#22c55e" : "#ef4444" }}>
            {message}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--text-h)" }}>📋 Recent Sales Ledger</h2>
      {recentSales.length === 0 ? (
        <div style={{ color: "var(--text)", fontSize: 13, textAlign: "center", padding: 30, border: "1px dashed var(--border)", borderRadius: 12 }}>No sales recorded yet.</div>
      ) : (
        recentSales.map((sale) => {
          const statusColors: Record<string, string> = { paid: "#22c55e", partial: "#f59e0b", due: "#ef4444" };
          const color = statusColors[sale.payment_status] || "var(--text)";
          return (
            <div key={sale.id} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 8, display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 90px", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-h)" }}>{sale.buyer_name}</div>
                <div style={{ fontSize: 10, color: "var(--text)", marginTop: 2 }}>Block: <span style={{ color: "#ef4444", fontWeight: 600 }}>{sale.blocks?.block_no}</span> ({sale.blocks?.stone_type})</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase" }}>Quantity</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-h)" }}>{sale.sqft_sold} Sqft</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase" }}>Rate</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-h)" }}>₹{sale.rate_per_sqft}/ft</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase" }}>Total Price</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-h)" }}>₹{sale.total_amount.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ ...S.badge, background: `${color}18`, color: color, border: `1px solid ${color}33` }}>
                  {sale.payment_status}
                </span>
              </div>
              <button type="button" onClick={() => setInvoiceSale(sale)} style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                Invoice
              </button>
            </div>
          );
        })
      )}
      {invoiceSale && (
        <InvoiceModal sale={invoiceSale} onClose={() => setInvoiceSale(null)} />
      )}
    </div>
  );
}

function InvoiceModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const due = Number(sale.total_amount || 0) - Number(sale.amount_paid || 0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(780px, 100%)", background: "#fff", borderRadius: 10, boxShadow: "0 24px 80px rgba(15, 23, 42, 0.25)", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <strong>Invoice Preview</strong>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.print()} style={{ padding: "8px 12px", border: "none", borderRadius: 8, background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Print</button>
            <button onClick={onClose} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer" }}>Close</button>
          </div>
        </div>
        <div id="invoice-print" style={{ padding: 32, color: "#111827" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111827", paddingBottom: 18, marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>Mahalaxmi Granites</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Kishangarh, Rajasthan</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>TAX INVOICE</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>#{sale.id.slice(0, 8).toUpperCase()}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{new Date(sale.sold_at).toLocaleDateString("en-IN")}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Bill To</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{sale.buyer_name}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Block</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{sale.blocks?.block_no || "-"}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{sale.blocks?.stone_type || "-"}</div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Description", "Sqft", "Rate", "Amount"].map((h) => (
                  <th key={h} style={{ padding: 12, textAlign: h === "Description" ? "left" : "right", borderBottom: "1px solid #e2e8f0", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>{sale.blocks?.stone_type || "Granite slabs"}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>{Number(sale.sqft_sold).toLocaleString("en-IN")}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Rs. {Number(sale.rate_per_sqft).toLocaleString("en-IN")}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #e2e8f0", textAlign: "right", fontWeight: 800 }}>Rs. {Number(sale.total_amount).toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 280 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span>Total</span><strong>Rs. {Number(sale.total_amount).toLocaleString("en-IN")}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span>Paid</span><strong>Rs. {Number(sale.amount_paid).toLocaleString("en-IN")}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid #111827", fontSize: 18 }}><span>Due</span><strong>Rs. {due.toLocaleString("en-IN")}</strong></div>
            </div>
          </div>
          <div style={{ marginTop: 28, fontSize: 11, color: "#64748b" }}>Generated by Mahalaxmi ERP. Please verify dispatch and payment details before sharing.</div>
        </div>
      </div>
    </div>
  );
}
