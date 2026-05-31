import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { MACHINE_PROFILES, money } from "../costing";
import SmartTextInput from "./SmartTextInput";
import { canonicalName, uniqueCanonicalNames } from "../names";

type LedgerType = "expense" | "income" | "asset" | "adjustment";

type FactoryLedgerRow = {
  id: string;
  entry_date: string;
  entry_type: LedgerType;
  category: string;
  description: string | null;
  amount: number;
  block_id: string | null;
  party_name: string | null;
  quarry_name: string | null;
  stone_type: string | null;
  processed_sqft: number | null;
  machine_id?: string | null;
  created_at: string;
};

type BlockRow = {
  id: string;
  block_no: string;
  stone_type: string;
  quarry_name: string | null;
  landed_cost: number;
  created_at: string;
};

type SaleRow = {
  id: string;
  buyer_name: string;
  total_amount: number;
  amount_paid: number;
  sold_at: string;
  blocks?: { block_no: string; stone_type: string; quarry_name?: string | null } | { block_no: string; stone_type: string; quarry_name?: string | null }[] | null;
};

type MonthlyCostRow = {
  id: string;
  month: string;
  total_overhead: number;
  sqft_processed: number;
  cost_per_sqft: number;
  created_at: string;
};

type LedgerViewRow = {
  id: string;
  date: string;
  source: "ledger" | "block" | "sale" | "monthly";
  type: LedgerType;
  category: string;
  description: string;
  amount: number;
  party?: string | null;
  block?: string | null;
  stone?: string | null;
  quarry?: string | null;
  processedSqft?: number | null;
  machineId?: string | null;
};

const CATEGORIES = [
  "block_purchase",
  "electricity",
  "labour",
  "diamond_segments",
  "polishing_bricks",
  "epoxy_resin",
  "machine_repair",
  "transport",
  "loading_dispatch",
  "job_work",
  "payment_received",
  "sale_invoice",
  "sale_receipt",
  "opening_cash",
  "owner_withdrawal",
  "other",
];

function periodKey(date: string) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function cashDelta(row: LedgerViewRow) {
  if (row.type === "income" && row.category !== "sale_invoice") return row.amount;
  if (row.type === "expense" || row.type === "asset") return -row.amount;
  if (row.type === "adjustment") return row.category === "opening_cash" ? row.amount : 0;
  return 0;
}

function isReceipt(row: LedgerViewRow) {
  return row.type === "income" && row.category !== "sale_invoice";
}

function isInvoice(row: LedgerViewRow) {
  return row.type === "income" && row.category === "sale_invoice";
}

export default function MonthlyCosts() {
  const [ledger, setLedger] = useState<FactoryLedgerRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [legacyMonthly, setLegacyMonthly] = useState<MonthlyCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ledgerMissing, setLedgerMissing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const [entryType, setEntryType] = useState<LedgerType>("expense");
  const [category, setCategory] = useState("electricity");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [partyName, setPartyName] = useState("");
  const [blockId, setBlockId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [processedSqft, setProcessedSqft] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [ledgerRes, blocksRes, salesRes, monthlyRes] = await Promise.all([
      supabase.from("factory_ledger").select("*").order("entry_date", { ascending: false }),
      supabase.from("blocks").select("id, block_no, stone_type, quarry_name, landed_cost, created_at").order("created_at", { ascending: false }),
      supabase.from("sales").select("id, buyer_name, total_amount, amount_paid, sold_at, blocks(block_no, stone_type, quarry_name)").order("sold_at", { ascending: false }),
      supabase.from("monthly_costs").select("id, month, total_overhead, sqft_processed, cost_per_sqft, created_at").order("created_at", { ascending: false }),
    ]);

    if (ledgerRes.error) {
      setLedgerMissing(true);
      setLedger([]);
    } else {
      setLedgerMissing(false);
      setLedger((ledgerRes.data || []) as FactoryLedgerRow[]);
    }

    if (blocksRes.data) setBlocks(blocksRes.data as BlockRow[]);
    if (salesRes.data) setSales(salesRes.data as unknown as SaleRow[]);
    if (monthlyRes.data) setLegacyMonthly(monthlyRes.data as MonthlyCostRow[]);
    setLoading(false);
  }

  async function saveLedgerEntry() {
    const value = Number(amount || 0);
    if (!value || value <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }

    setSaving(true);
    setMessage("");

    const selectedBlock = blocks.find((block) => block.id === blockId);
    const partySuggestions = uniqueCanonicalNames([...sales.map((sale) => sale.buyer_name), ...ledger.map((entry) => entry.party_name || "")]);
    const finalCategory = entryType === "income" && partyName && category === "other" ? "payment_received" : category;
    const { error } = await supabase.from("factory_ledger").insert({
      entry_date: entryDate,
      entry_type: entryType,
      category: finalCategory,
      description,
      amount: value,
      block_id: blockId || null,
      party_name: partyName ? canonicalName(partyName, partySuggestions) : null,
      quarry_name: selectedBlock?.quarry_name || null,
      stone_type: selectedBlock?.stone_type || null,
      machine_id: machineId || null,
      processed_sqft: processedSqft ? Number(processedSqft) : null,
    });

    setSaving(false);
    if (error) {
      setMessage(error.message.includes("factory_ledger")
        ? "Ledger table is not created yet. Apply the Supabase migration in supabase/migrations first."
        : error.message);
      return;
    }

    setMessage("Ledger entry saved.");
    setAmount("");
    setDescription("");
    setPartyName("");
    setBlockId("");
    setMachineId("");
    setProcessedSqft("");
    await fetchAll();
  }

  const rows = useMemo<LedgerViewRow[]>(() => {
    const manualRows: LedgerViewRow[] = ledger.map((entry) => ({
      id: `ledger-${entry.id}`,
      date: entry.entry_date,
      source: "ledger",
      type: entry.entry_type,
      category: entry.category,
      description: entry.description || entry.category.replaceAll("_", " "),
      amount: Number(entry.amount || 0),
      party: entry.party_name,
      stone: entry.stone_type,
      quarry: entry.quarry_name,
      processedSqft: entry.processed_sqft,
      machineId: entry.machine_id,
    }));

    const blockRows: LedgerViewRow[] = blocks.map((block) => ({
      id: `block-${block.id}`,
      date: block.created_at,
      source: "block",
      type: "asset",
      category: "block_purchase",
      description: `Block purchase ${block.block_no}`,
      amount: Number(block.landed_cost || 0),
      block: block.block_no,
      stone: block.stone_type,
      quarry: block.quarry_name,
    }));

    const saleRows: LedgerViewRow[] = sales.map((sale) => {
      const block = Array.isArray(sale.blocks) ? sale.blocks[0] : sale.blocks;
      return {
        id: `sale-${sale.id}`,
        date: sale.sold_at,
        source: "sale",
        type: "income",
        category: "sale_invoice",
        description: `Sale to ${sale.buyer_name}`,
        amount: Number(sale.total_amount || 0),
        party: sale.buyer_name,
        block: block?.block_no,
        stone: block?.stone_type,
        quarry: block?.quarry_name,
      };
    });

    const paymentRows: LedgerViewRow[] = sales
      .filter((sale) => Number(sale.amount_paid || 0) > 0)
      .map((sale) => {
        const block = Array.isArray(sale.blocks) ? sale.blocks[0] : sale.blocks;
        return {
          id: `payment-${sale.id}`,
          date: sale.sold_at,
          source: "sale",
          type: "income",
          category: "payment_received",
          description: `Payment received from ${sale.buyer_name}`,
          amount: Number(sale.amount_paid || 0),
          party: sale.buyer_name,
          block: block?.block_no,
          stone: block?.stone_type,
          quarry: block?.quarry_name,
        };
      });

    const monthlyRows: LedgerViewRow[] = legacyMonthly.map((cost) => ({
      id: `monthly-${cost.id}`,
      date: cost.created_at,
      source: "monthly",
      type: "expense",
      category: "legacy_monthly_overhead",
      description: `Legacy overhead: ${cost.month}`,
      amount: Number(cost.total_overhead || 0),
      processedSqft: Number(cost.sqft_processed || 0),
    }));

    const fallbackRows = [...blockRows, ...saleRows, ...paymentRows, ...monthlyRows];
    const integratedRows = manualRows.length > 0 ? manualRows : fallbackRows;

    return integratedRows
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, blocks, sales, legacyMonthly]);

  const periods = Array.from(new Set(rows.map((row) => periodKey(row.date)))).sort().reverse();
  const periodRows = selectedPeriod === "all" ? rows : rows.filter((row) => periodKey(row.date) === selectedPeriod);
  const previousRows = selectedPeriod === "all" ? [] : rows.filter((row) => periodKey(row.date) < selectedPeriod);
  const openingCash = previousRows.reduce((sum, row) => sum + cashDelta(row), 0);
  const receipts = periodRows.filter(isReceipt).reduce((sum, row) => sum + row.amount, 0);
  const invoiced = periodRows.filter(isInvoice).reduce((sum, row) => sum + row.amount, 0);
  const expenses = periodRows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const purchases = periodRows.filter((row) => row.type === "asset").reduce((sum, row) => sum + row.amount, 0);
  const cashMovement = periodRows.reduce((sum, row) => sum + cashDelta(row), 0);
  const closingCash = openingCash + cashMovement;
  const totalInvoiced = rows.filter(isInvoice).reduce((sum, row) => sum + row.amount, 0);
  const totalReceived = rows.filter(isReceipt).reduce((sum, row) => sum + row.amount, 0);
  const receivables = Math.max(totalInvoiced - totalReceived, 0);
  const processed = periodRows.reduce((sum, row) => sum + Number(row.processedSqft || 0), 0);
  const overheadPerSqft = processed > 0 ? expenses / processed : 0;
  const partySuggestions = uniqueCanonicalNames([...sales.map((sale) => sale.buyer_name), ...ledger.map((entry) => entry.party_name || "")]);

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 1100, margin: "0 auto", padding: 16 },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 },
    label: { fontSize: 10, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 },
    input: { width: "100%", padding: "10px 12px", minHeight: 42, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 13 },
  };

  return (
    <div style={S.page}>
      <div style={{ paddingTop: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>Factory Ledger</h1>
        <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>
          Accounts view for invoices, receipts, cash movement, purchases and factory expenses.
        </p>
      </div>

      {ledgerMissing && (
        <div style={{ ...S.card, borderColor: "#f59e0b", background: "#fffbeb", marginBottom: 16, color: "#92400e", fontSize: 13 }}>
          The new flexible ledger table is not in Supabase yet. Existing block purchases, sales and old monthly costs are still shown below. Apply the migration at <strong>supabase/migrations/20260531020000_factory_ledger.sql</strong> to enable manual ledger entries.
        </div>
      )}

      <div style={{ ...S.card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-h)" }}>Accounting Period</div>
          <div style={{ fontSize: 12, color: "var(--text)", marginTop: 2 }}>Invoices are separated from actual cash received.</div>
        </div>
        <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={{ ...S.input, width: 220 }}>
          <option value="all">All time</option>
          {periods.map((key) => (
            <option key={key} value={key}>{periodLabel(key)}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
        {[
          { label: "Opening Cash", value: money(openingCash), color: openingCash >= 0 ? "#2563eb" : "#ef4444" },
          { label: "Cash Received", value: money(receipts), color: "#16a34a" },
          { label: "Cash Out", value: money(expenses + purchases), color: "#ef4444" },
          { label: "Closing Cash", value: money(closingCash), color: closingCash >= 0 ? "#16a34a" : "#ef4444" },
        ].map((item) => (
          <div key={item.label} style={S.card}>
            <div style={S.label}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Invoiced", value: money(invoiced), color: "#7c3aed" },
          { label: "Receivables", value: money(receivables), color: "#f59e0b" },
          { label: "Factory Expenses", value: money(expenses), color: "#ef4444" },
          { label: "Overhead / Sqft", value: overheadPerSqft > 0 ? money(overheadPerSqft) : "Need sqft", color: "#f59e0b" },
        ].map((item) => (
          <div key={item.label} style={S.card}>
            <div style={S.label}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...S.card, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 14px", color: "var(--text-h)" }}>Add Ledger Entry</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={S.label}>Date</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Type</label>
            <select
              value={entryType}
              onChange={(e) => {
                const nextType = e.target.value as LedgerType;
                setEntryType(nextType);
                if (nextType === "income") setCategory("payment_received");
                if (nextType === "expense") setCategory("electricity");
                if (nextType === "asset") setCategory("block_purchase");
              }}
              style={S.input}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="asset">Asset / Purchase</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.input}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={S.input} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={S.label}>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Segment purchase, transport, repair" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Party</label>
            <SmartTextInput value={partyName} onChange={setPartyName} suggestions={partySuggestions} placeholder="Optional" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Block Link</label>
            <select value={blockId} onChange={(e) => setBlockId(e.target.value)} style={S.input}>
              <option value="">No block</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>{block.block_no} - {block.stone_type}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>Machine Link</label>
            <select value={machineId} onChange={(e) => setMachineId(e.target.value)} style={S.input}>
              <option value="">Shared / no machine</option>
              {MACHINE_PROFILES.map((machine) => (
                <option key={machine.id} value={machine.id}>{machine.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>Processed Sqft</label>
            <input type="number" value={processedSqft} onChange={(e) => setProcessedSqft(e.target.value)} placeholder="Optional" style={S.input} />
          </div>
        </div>
        <button onClick={saveLedgerEntry} disabled={saving || ledgerMissing}
          style={{ marginTop: 12, width: "100%", minHeight: 42, border: "none", borderRadius: 8, background: ledgerMissing ? "#cbd5e1" : "#111827", color: "white", fontWeight: 700, cursor: ledgerMissing ? "not-allowed" : "pointer" }}>
          {saving ? "Saving..." : "Save Ledger Entry"}
        </button>
        {message && (
          <div style={{ marginTop: 10, fontSize: 13, color: message.includes("saved") ? "#16a34a" : "#ef4444" }}>{message}</div>
        )}
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, margin: 0 }}>Unified Ledger</h2>
          <span style={{ fontSize: 12, color: "var(--text)" }}>{periodRows.length} entries</span>
        </div>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--text)" }}>Loading ledger...</div>
        ) : periodRows.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--text)" }}>No ledger entries yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 900, width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  {["Date", "Type", "Category", "Description", "Machine", "Block", "Stone", "Quarry", "Amount", "Source"].map((head) => (
                    <th key={head} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodRows.slice(0, 100).map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px" }}>{new Date(row.date).toLocaleDateString("en-IN")}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: row.type === "income" ? "#16a34a" : row.type === "expense" ? "#ef4444" : "#2563eb" }}>{row.type}</td>
                    <td style={{ padding: "10px 12px" }}>{row.category.replaceAll("_", " ")}</td>
                    <td style={{ padding: "10px 12px" }}>{row.description}</td>
                    <td style={{ padding: "10px 12px" }}>{row.machineId || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>{row.block || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>{row.stone || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>{row.quarry || "-"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 800 }}>{money(row.amount)}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text)" }}>{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
