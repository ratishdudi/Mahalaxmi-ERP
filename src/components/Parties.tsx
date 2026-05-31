import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { money } from "../costing";
import { normalizeName, titleCaseName } from "../names";

type Party = {
  buyer_name: string;
  aliases: string[];
  total_sales: number;
  sales_paid: number;
  ledger_paid: number;
  total_paid: number;
  outstanding: number;
  last_purchase: string;
  sale_count: number;
};

type SaleRow = {
  id: string;
  buyer_name: string;
  block_id: string;
  sqft_sold: number;
  rate_per_sqft: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  sold_at: string;
  blocks?: { block_no: string; stone_type: string };
};

type LedgerPayment = {
  id: string;
  entry_date: string;
  category: string;
  description: string | null;
  amount: number;
  party_name: string | null;
};

function paymentStatus(total: number, paid: number) {
  if (paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "due";
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [payments, setPayments] = useState<LedgerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");

  useEffect(() => { fetchParties(); }, []);

  async function fetchParties() {
    setLoading(true);
    const [salesRes, ledgerRes] = await Promise.all([
      supabase.from("sales").select("buyer_name, total_amount, amount_paid, sold_at"),
      supabase.from("factory_ledger").select("id, entry_date, category, description, amount, party_name").eq("entry_type", "income").in("category", ["payment_received", "sale_receipt"]),
    ]);

    const map: Record<string, Party> = {};

    (salesRes.data || []).forEach((sale) => {
      const key = normalizeName(sale.buyer_name);
      if (!map[key]) {
        map[key] = { buyer_name: titleCaseName(sale.buyer_name), aliases: [], total_sales: 0, sales_paid: 0, ledger_paid: 0, total_paid: 0, outstanding: 0, last_purchase: sale.sold_at, sale_count: 0 };
      }
      if (!map[key].aliases.includes(sale.buyer_name)) map[key].aliases.push(sale.buyer_name);
      map[key].total_sales += Number(sale.total_amount || 0);
      map[key].sales_paid += Number(sale.amount_paid || 0);
      if (new Date(sale.sold_at) > new Date(map[key].last_purchase)) map[key].last_purchase = sale.sold_at;
      map[key].sale_count++;
    });

    (ledgerRes.data || []).forEach((entry) => {
      if (!entry.party_name) return;
      const key = normalizeName(entry.party_name);
      if (!map[key]) {
        map[key] = { buyer_name: titleCaseName(entry.party_name), aliases: [entry.party_name], total_sales: 0, sales_paid: 0, ledger_paid: 0, total_paid: 0, outstanding: 0, last_purchase: entry.entry_date, sale_count: 0 };
      }
      if (!map[key].aliases.includes(entry.party_name)) map[key].aliases.push(entry.party_name);
      map[key].ledger_paid += Number(entry.amount || 0);
    });

    Object.values(map).forEach((party) => {
      party.total_paid = party.ledger_paid > 0 ? party.ledger_paid : party.sales_paid;
      party.outstanding = party.total_sales - party.total_paid;
    });

    setParties(Object.values(map).sort((a, b) => b.outstanding - a.outstanding));
    setLoading(false);
  }

  async function fetchPartyDetails(name: string, sourceParties = parties) {
    setSelected(name);
    setMessage("");
    const selectedParty = sourceParties.find((p) => p.buyer_name === name);
    const aliases = selectedParty?.aliases?.length ? selectedParty.aliases : [name];

    const [salesRes, paymentsRes] = await Promise.all([
      supabase
        .from("sales")
        .select("*, blocks(block_no, stone_type)")
        .in("buyer_name", aliases)
        .order("sold_at", { ascending: false }),
      supabase
        .from("factory_ledger")
        .select("id, entry_date, category, description, amount, party_name")
        .in("party_name", aliases)
        .eq("entry_type", "income")
        .in("category", ["payment_received", "sale_receipt"])
        .order("entry_date", { ascending: false }),
    ]);

    setSales((salesRes.data || []) as SaleRow[]);
    setPayments((paymentsRes.data || []) as LedgerPayment[]);
  }

  async function recordPayment() {
    const selectedParty = selected ? parties.find((p) => p.buyer_name === selected) : null;
    const value = Number(paymentAmount || 0);
    if (!selectedParty || value <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    let remaining = value;
    const aliases = selectedParty.aliases.length ? selectedParty.aliases : [selectedParty.buyer_name];
    const { data, error } = await supabase
      .from("sales")
      .select("id, total_amount, amount_paid")
      .in("buyer_name", aliases)
      .order("sold_at", { ascending: true });

    if (error || !data) {
      setMessage(error?.message || "Could not load unpaid invoices.");
      return;
    }

    const unpaid = data
      .map((sale) => ({ ...sale, due: Number(sale.total_amount || 0) - Number(sale.amount_paid || 0) }))
      .filter((sale) => sale.due > 0);

    if (!unpaid.length) {
      setMessage("This party has no unpaid sales to allocate against.");
      return;
    }

    setSavingPayment(true);
    for (const sale of unpaid) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, sale.due);
      const newPaid = Number(sale.amount_paid || 0) + applied;
      const { error: updateError } = await supabase
        .from("sales")
        .update({
          amount_paid: newPaid,
          payment_status: paymentStatus(Number(sale.total_amount || 0), newPaid),
        })
        .eq("id", sale.id);

      if (updateError) {
        setSavingPayment(false);
        setMessage(updateError.message);
        return;
      }
      remaining -= applied;
    }

    if (remaining > 0) {
      await supabase.from("factory_ledger").insert({
        entry_date: paymentDate,
        entry_type: "income",
        category: "payment_received",
        description: `Advance / extra payment from ${selectedParty.buyer_name}`,
        amount: remaining,
        party_name: selectedParty.buyer_name,
      });
    }

    setSavingPayment(false);
    setPaymentAmount("");
    setMessage(remaining > 0 ? `Payment saved. ${money(remaining)} kept as extra ledger receipt.` : "Payment allocated to unpaid sales.");
    await fetchParties();
    await fetchPartyDetails(selectedParty.buyer_name);
  }

  const filtered = parties.filter((p) => p.buyer_name.toLowerCase().includes(search.toLowerCase()));
  const selectedParty = parties.find((p) => p.buyer_name === selected);

  const S: Record<string, React.CSSProperties> = {
    card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 },
    label: { fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 },
    input: { padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", color: "#111827", width: "100%", boxSizing: "border-box" },
    badge: { fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 700 },
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.5fr" : "1fr", gap: 20, height: "calc(100vh - 108px)", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Party Ledger</h1>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} parties</div>
        </div>

        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search party name..." style={S.input} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ ...S.card, borderTop: "3px solid #f59e0b" }}>
            <div style={S.label}>Total Outstanding</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{money(parties.reduce((s, p) => s + Math.max(p.outstanding, 0), 0))}</div>
          </div>
          <div style={{ ...S.card, borderTop: "3px solid #22c55e" }}>
            <div style={S.label}>Total Received</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{money(parties.reduce((s, p) => s + p.total_paid, 0))}</div>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>Loading parties...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>No parties found.</div>
          ) : (
            filtered.map((p) => (
              <button key={p.buyer_name} onClick={() => fetchPartyDetails(p.buyer_name)} style={{ ...S.card, cursor: "pointer", textAlign: "left", borderLeft: `3px solid ${p.outstanding > 0 ? "#f59e0b" : "#22c55e"}`, background: selected === p.buyer_name ? "#eff6ff" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{p.buyer_name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.sale_count} sales - Received {money(p.total_paid)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {p.outstanding > 0 ? (
                      <div style={{ ...S.badge, background: "#fef3c7", color: "#92400e" }}>{money(p.outstanding)} due</div>
                    ) : (
                      <div style={{ ...S.badge, background: "#dcfce7", color: "#166534" }}>Clear</div>
                    )}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Sales {money(p.total_sales)}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selected && selectedParty && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{selected}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>Close</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Total Sales", value: money(selectedParty.total_sales), color: "#111827" },
              { label: "Received", value: money(selectedParty.total_paid), color: "#22c55e" },
              { label: "Outstanding", value: money(Math.max(selectedParty.outstanding, 0)), color: selectedParty.outstanding > 0 ? "#f59e0b" : "#22c55e" },
            ].map((metric) => (
              <div key={metric.label} style={S.card}>
                <div style={S.label}>{metric.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: metric.color }}>{metric.value}</div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <div style={S.label}>Payment Date</div>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={S.input} />
              </div>
              <div>
                <div style={S.label}>Amount Received</div>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" style={S.input} />
              </div>
              <button onClick={recordPayment} disabled={savingPayment} style={{ height: 38, padding: "0 14px", border: "none", borderRadius: 8, background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {savingPayment ? "Saving..." : "Record"}
              </button>
            </div>
            {message && <div style={{ marginTop: 8, fontSize: 12, color: message.includes("allocated") || message.includes("saved") ? "#16a34a" : "#ef4444" }}>{message}</div>}
          </div>

          <div style={{ ...S.card, padding: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700, color: "#111827" }}>Sales and Payment History</div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date", "Block", "Sqft", "Total", "Paid", "Due", "Status"].map((head) => (
                      <th key={head} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const due = Math.max(Number(sale.total_amount || 0) - Number(sale.amount_paid || 0), 0);
                    const statusColor = sale.payment_status === "paid" ? "#22c55e" : sale.payment_status === "partial" ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={sale.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{new Date(sale.sold_at).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "8px 12px", color: "#2563eb", fontWeight: 600 }}>{sale.blocks?.block_no || "-"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{sale.sqft_sold}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "#111827" }}>{money(Number(sale.total_amount || 0))}</td>
                        <td style={{ padding: "8px 12px", color: "#22c55e" }}>{money(Number(sale.amount_paid || 0))}</td>
                        <td style={{ padding: "8px 12px", color: due > 0 ? "#f59e0b" : "#22c55e" }}>{money(due)}</td>
                        <td style={{ padding: "8px 12px" }}><span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700, background: `${statusColor}18`, color: statusColor }}>{sale.payment_status}</span></td>
                      </tr>
                    );
                  })}
                  {payments.filter((payment) => !payment.description?.startsWith("Payment received from")).map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                      <td style={{ padding: "8px 12px" }}>{new Date(payment.entry_date).toLocaleDateString("en-IN")}</td>
                      <td style={{ padding: "8px 12px" }} colSpan={3}>{payment.description || payment.category.replaceAll("_", " ")}</td>
                      <td style={{ padding: "8px 12px", color: "#22c55e", fontWeight: 700 }}>{money(Number(payment.amount || 0))}</td>
                      <td style={{ padding: "8px 12px" }} colSpan={2}>Ledger receipt</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
