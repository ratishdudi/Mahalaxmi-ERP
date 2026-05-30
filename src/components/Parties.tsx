import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { normalizeName, titleCaseName } from "../names";

type Party = {
  buyer_name: string;
  aliases: string[];
  total_sales: number;
  total_paid: number;
  outstanding: number;
  last_purchase: string;
  sale_count: number;
};

type SaleRow = {
  id: string;
  sqft_sold: number;
  rate_per_sqft: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  sold_at: string;
  blocks?: { block_no: string; stone_type: string };
};

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchParties(); }, []);

  async function fetchParties() {
    setLoading(true);
    const { data } = await supabase.from("sales").select("buyer_name, total_amount, amount_paid, sold_at");
    if (!data) { setLoading(false); return; }

    const map: Record<string, Party> = {};
    data.forEach((s) => {
      const key = normalizeName(s.buyer_name);
      if (!map[key]) {
        map[key] = { buyer_name: titleCaseName(s.buyer_name), aliases: [], total_sales: 0, total_paid: 0, outstanding: 0, last_purchase: s.sold_at, sale_count: 0 };
      }
      if (!map[key].aliases.includes(s.buyer_name)) map[key].aliases.push(s.buyer_name);
      map[key].total_sales += Number(s.total_amount);
      map[key].total_paid += Number(s.amount_paid);
      map[key].outstanding = map[key].total_sales - map[key].total_paid;
      if (new Date(s.sold_at) > new Date(map[key].last_purchase)) {
        map[key].last_purchase = s.sold_at;
      }
      map[key].sale_count++;
    });

    const sorted = Object.values(map).sort((a, b) => b.outstanding - a.outstanding);
    setParties(sorted);
    setLoading(false);
  }

  async function fetchPartySales(name: string) {
    setSelected(name);
    const selectedParty = parties.find((p) => p.buyer_name === name);
    const { data } = await supabase
      .from("sales")
      .select("*, blocks(block_no, stone_type)")
      .in("buyer_name", selectedParty?.aliases?.length ? selectedParty.aliases : [name])
      .order("sold_at", { ascending: false });
    if (data) setSales(data as SaleRow[]);
  }

  const filtered = parties.filter(p => p.buyer_name.toLowerCase().includes(search.toLowerCase()));
  const selectedParty = parties.find(p => p.buyer_name === selected);

  const S: Record<string, React.CSSProperties> = {
    card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 },
    label: { fontSize: 10, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 3 },
    badge: { fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 700 },
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.5fr" : "1fr", gap: 20, height: "calc(100vh - 108px)", overflow: "hidden" }}>

      {/* Party List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>👥 Party Ledger</h1>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} parties</div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search party name..."
          style={{ padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", color: "#111827" }}
        />

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ ...S.card, borderTop: "3px solid #f59e0b" }}>
            <div style={S.label}>Total Outstanding</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>
              ₹{parties.reduce((s, p) => s + p.outstanding, 0).toLocaleString()}
            </div>
          </div>
          <div style={{ ...S.card, borderTop: "3px solid #22c55e" }}>
            <div style={S.label}>Total Revenue</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>
              ₹{parties.reduce((s, p) => s + p.total_sales, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Party rows */}
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>Loading parties...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>No parties found.</div>
          ) : (
            filtered.map((p) => (
              <div key={p.buyer_name}
                onClick={() => fetchPartySales(p.buyer_name)}
                style={{ ...S.card, cursor: "pointer", borderLeft: `3px solid ${p.outstanding > 0 ? "#f59e0b" : "#22c55e"}`, background: selected === p.buyer_name ? "#eff6ff" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{p.buyer_name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.sale_count} transactions · Last: {new Date(p.last_purchase).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {p.outstanding > 0 ? (
                      <div style={{ ...S.badge, background: "#fef3c7", color: "#92400e" }}>₹{p.outstanding.toLocaleString()} due</div>
                    ) : (
                      <div style={{ ...S.badge, background: "#dcfce7", color: "#166534" }}>Clear</div>
                    )}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Total: ₹{p.total_sales.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Party Detail */}
      {selected && selectedParty && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{selected}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>✕ Close</button>
          </div>

          {/* Party metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Total Sales", value: `₹${selectedParty.total_sales.toLocaleString()}`, color: "#111827" },
              { label: "Amount Received", value: `₹${selectedParty.total_paid.toLocaleString()}`, color: "#22c55e" },
              { label: "Outstanding", value: `₹${selectedParty.outstanding.toLocaleString()}`, color: selectedParty.outstanding > 0 ? "#f59e0b" : "#22c55e" },
            ].map(m => (
              <div key={m.label} style={S.card}>
                <div style={S.label}>{m.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Transaction table */}
          <div style={{ ...S.card, padding: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#111827" }}>
              Transaction History
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date", "Block", "Stone", "Sqft", "Rate", "Total", "Paid", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => {
                    const statusColor = s.payment_status === "paid" ? "#22c55e" : s.payment_status === "partial" ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{new Date(s.sold_at).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "8px 12px", color: "#2563eb", fontWeight: 600 }}>{s.blocks?.block_no || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{s.blocks?.stone_type || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{s.sqft_sold}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>₹{s.rate_per_sqft}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "#111827" }}>₹{Number(s.total_amount).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", color: "#22c55e" }}>₹{Number(s.amount_paid).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700, background: `${statusColor}18`, color: statusColor }}>
                            {s.payment_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
