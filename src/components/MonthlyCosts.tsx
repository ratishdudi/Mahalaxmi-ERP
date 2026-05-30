import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

type MonthlyCost = {
  id: string;
  month: string;
  electricity_bill: number;
  total_wages: number;
  segments_cost: number;
  polishing_bricks_cost: number;
  epoxy_cost: number;
  other_cost: number;
  other_description: string;
  total_overhead: number;
  sqft_processed: number;
  cost_per_sqft: number;
  created_at: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2024", "2025", "2026", "2027"];

export default function MonthlyCosts() {
  const [costs, setCosts] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sqftThisMonth, setSqftThisMonth] = useState(0);

  // Form state
  const currentMonth = MONTHS[new Date().getMonth()];
  const currentYear = String(new Date().getFullYear());
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [electricity, setElectricity] = useState("");
  const [wages, setWages] = useState("");
  const [segments, setSegments] = useState("");
  const [polishingBricks, setPolishingBricks] = useState("");
  const [epoxy, setEpoxy] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [otherDesc, setOtherDesc] = useState("");

  useEffect(() => {
    fetchCosts();
  }, []);

  // Fetch sqft processed this month from machine sessions
  useEffect(() => {
    fetchSqftThisMonth(month, year);
  }, [month, year]);

  async function fetchCosts() {
    const { data } = await supabase
      .from("monthly_costs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCosts(data);
  }

  async function fetchSqftThisMonth(m: string, y: string) {
    // Get all sales in this month to calculate sqft processed
    const monthIndex = MONTHS.indexOf(m) + 1;
    const paddedMonth = String(monthIndex).padStart(2, "0");
    const startDate = `${y}-${paddedMonth}-01`;
    const endDate = `${y}-${paddedMonth}-31`;

    const { data } = await supabase
      .from("sales")
      .select("sqft_sold")
      .gte("sold_at", startDate)
      .lte("sold_at", endDate);

    if (data) {
      const total = data.reduce((sum, s) => sum + Number(s.sqft_sold), 0);
      setSqftThisMonth(total);
    }
  }

  // Live calculation
  const totalOverhead =
    Number(electricity || 0) +
    Number(wages || 0) +
    Number(segments || 0) +
    Number(polishingBricks || 0) +
    Number(epoxy || 0) +
    Number(otherCost || 0);

  const costPerSqft = sqftThisMonth > 0
    ? Math.round(totalOverhead / sqftThisMonth)
    : 0;

  async function handleSubmit() {
    if (!electricity && !wages) {
      setMessage("❌ Enter at least electricity bill or wages.");
      return;
    }

    setLoading(true);
    setMessage("");

    const monthKey = `${month} ${year}`;

    // Check if this month already exists
    const existing = costs.find((c) => c.month === monthKey);
    if (existing) {
      setMessage(`❌ Costs for ${monthKey} already logged. Edit the existing entry instead.`);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("monthly_costs").insert({
      month: monthKey,
      electricity_bill: Number(electricity || 0),
      total_wages: Number(wages || 0),
      segments_cost: Number(segments || 0),
      polishing_bricks_cost: Number(polishingBricks || 0),
      epoxy_cost: Number(epoxy || 0),
      other_cost: Number(otherCost || 0),
      other_description: otherDesc,
      total_overhead: totalOverhead,
      sqft_processed: sqftThisMonth,
      cost_per_sqft: costPerSqft,
    });

    setLoading(false);

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage(`✅ Costs for ${monthKey} logged! Overhead: ₹${totalOverhead.toLocaleString()} | Cost/Sqft: ₹${costPerSqft}`);
      setElectricity("");
      setWages("");
      setSegments("");
      setPolishingBricks("");
      setEpoxy("");
      setOtherCost("");
      setOtherDesc("");
      fetchCosts();
    }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "0 auto", padding: 16 },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 24 },
    label: { fontSize: 11, color: "var(--text)", textTransform: "uppercase" as const, letterSpacing: "0.1em", display: "block", marginBottom: 6 },
    input: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" as const },
    select: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" as const },
  };

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>📊 Monthly Costs</h1>
        <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>
          Log all factory expenses. System calculates real overhead cost per sqft.
        </p>
      </div>

      {/* Form */}
      <div style={S.card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-h)" }}>Log This Month's Expenses</h2>

        {/* Month + Year */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Month *</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} style={S.select}>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Year *</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} style={S.select}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Sqft processed this month — auto pulled */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={S.label}>Sqft Sold This Month (Auto)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: sqftThisMonth > 0 ? "#22c55e" : "#f59e0b" }}>
              {sqftThisMonth > 0 ? `${sqftThisMonth.toLocaleString()} Sqft` : "No sales logged yet"}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text)", textAlign: "right" }}>
            Pulled from<br />Sales records
          </div>
        </div>

        {/* Electricity */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>⚡ Electricity Bill (₹)</label>
          <input type="number" value={electricity} onChange={(e) => setElectricity(e.target.value)}
            placeholder="Total bill amount from electricity receipt" style={S.input} />
        </div>

        {/* Wages */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>👷 Total Wages Paid (₹)</label>
          <input type="number" value={wages} onChange={(e) => setWages(e.target.value)}
            placeholder="Sum of all operator payments this month" style={S.input} />
        </div>

        {/* Consumables */}
        <div style={{ marginBottom: 4 }}>
          <label style={S.label}>🔧 Consumables Purchased</label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 4 }}>Diamond Segments (₹)</div>
            <input type="number" value={segments} onChange={(e) => setSegments(e.target.value)}
              placeholder="0" style={S.input} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 4 }}>Polishing Bricks (₹)</div>
            <input type="number" value={polishingBricks} onChange={(e) => setPolishingBricks(e.target.value)}
              placeholder="0" style={S.input} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 4 }}>Epoxy / Resin (₹)</div>
            <input type="number" value={epoxy} onChange={(e) => setEpoxy(e.target.value)}
              placeholder="0" style={S.input} />
          </div>
        </div>

        {/* Other */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div>
            <label style={S.label}>Other Expense (₹)</label>
            <input type="number" value={otherCost} onChange={(e) => setOtherCost(e.target.value)}
              placeholder="0" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <input type="text" value={otherDesc} onChange={(e) => setOtherDesc(e.target.value)}
              placeholder="e.g. Machine repair, transport" style={S.input} />
          </div>
        </div>

        {/* Live Calculation Panel */}
        {totalOverhead > 0 && (
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Live Calculation
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 4 }}>Total Overhead</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>
                  ₹{totalOverhead.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 4 }}>Sqft Processed</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>
                  {sqftThisMonth.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 4 }}>Overhead / Sqft</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: costPerSqft > 0 ? "#22c55e" : "#555" }}>
                  {costPerSqft > 0 ? `₹${costPerSqft}` : "Need sales data"}
                </div>
              </div>
            </div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "12px 0", minHeight: 44, background: loading ? "var(--border)" : "#22c55e", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Saving..." : `💾 Log ${month} ${year} Costs`}
        </button>

        {message && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: message.includes("✅") ? "#22c55e22" : "#ef444422", borderRadius: 8, fontSize: 13, color: message.includes("✅") ? "#22c55e" : "#ef4444" }}>
            {message}
          </div>
        )}
      </div>

      {/* Historical Costs */}
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--text-h)" }}>
        Cost History ({costs.length} months)
      </h2>
      {costs.length === 0 ? (
        <div style={{ color: "var(--text)", fontSize: 13, textAlign: "center", padding: 32, border: "1px dashed var(--border)", borderRadius: 12 }}>
          No monthly costs logged yet.
        </div>
      ) : (
        costs.map((cost) => (
          <div key={cost.id} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-h)" }}>{cost.month}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
                ₹{cost.cost_per_sqft}/sqft overhead
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
              {[
                { label: "Electricity", value: `₹${cost.electricity_bill.toLocaleString()}` },
                { label: "Wages", value: `₹${cost.total_wages.toLocaleString()}` },
                { label: "Segments", value: `₹${cost.segments_cost.toLocaleString()}` },
                { label: "Polish Bricks", value: `₹${cost.polishing_bricks_cost.toLocaleString()}` },
                { label: "Epoxy", value: `₹${cost.epoxy_cost.toLocaleString()}` },
                { label: "Other", value: `₹${cost.other_cost.toLocaleString()}` },
              ].map((col) => (
                <div key={col.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-h)" }}>{col.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg)", borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text)" }}>
                Total Overhead: <strong style={{ color: "#ef4444" }}>₹{cost.total_overhead.toLocaleString()}</strong>
              </span>
              <span style={{ fontSize: 11, color: "var(--text)" }}>
                Sqft Processed: <strong style={{ color: "#f59e0b" }}>{cost.sqft_processed.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}