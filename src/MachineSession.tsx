import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const MACHINES = [
  { id: "14-blade", label: "14 Blade Cutter", icon: "⚙️", color: "#c0392b" },
  { id: "7-blade", label: "7 Blade Cutter", icon: "🔪", color: "#d4a843" },
  { id: "liner", label: "Liner Polish Machine", icon: "✨", color: "#2980b9" },
];

const OPERATORS = [
  "raju kharra",
  "kishan lal", 
  "himmat saini",
  "suresh kumar",
  "arjun yadav",
];

type Block = {
  id: string;
  block_no: string;
  stone_type: string;
  quarry_name: string;
  is_own_block: boolean;
  status: string;
};

type Session = {
  id: string;
  block_id: string;
  block_no: string;
  stone_type: string;
  machine_id: string;
  operator_name: string;
  started_at: string;
  stopped_at: string | null;
  duration_mins: number | null;
};

export default function MachineSession() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Session[]>([]);

  // New session form
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Live timer ticks
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchBlocks();
    fetchSessions();
    // Tick every second for live timers
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

 async function fetchBlocks() {
  const { data } = await supabase
    .from("blocks")
    .select("id, block_no, stone_type, quarry_name, is_own_block, status")
    .in("status", ["yard", "unpolished_stock"]) // Fetch BOTH types of blocks
    .order("created_at", { ascending: false });
  if (data) setBlocks(data);
}

  async function fetchSessions() {
    const { data } = await supabase
      .from("machine_sessions")
      .select("*")
      .order("started_at", { ascending: false });

    if (data) {
      setActiveSessions(data.filter((s: Session) => !s.stopped_at));
      setCompletedSessions(data.filter((s: Session) => s.stopped_at).slice(0, 10));
    }
  }

  // Calculate live duration from start time
  function getLiveDuration(startedAt: string) {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diffMs = now - start;
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours > 0) return `${hours}h ${remainMins}m ${secs}s`;
    return `${remainMins}m ${secs}s`;
  }

  // Check if machine already has active session
  function machineIsActive(machineId: string) {
    return activeSessions.some((s) => s.machine_id === machineId);
  }

  async function handleStart() {
    if (!selectedMachine || !selectedBlock || !selectedOperator) {
      setMessage("❌ Select machine, block and operator.");
      return;
    }
    if (machineIsActive(selectedMachine)) {
      setMessage("❌ This machine already has an active session. Stop it first.");
      return;
    }

    setLoading(true);
    setMessage("");

    const block = blocks.find((b) => b.id === selectedBlock);

    const { error } = await supabase.from("machine_sessions").insert({
      block_id: selectedBlock,
      block_no: block?.block_no,
      stone_type: block?.stone_type,
      machine_id: selectedMachine,
      operator_name: selectedOperator,
      started_at: new Date().toISOString(),
      stopped_at: null,
      duration_mins: null,
    });

    setLoading(false);

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage("✅ Session started!");
      setSelectedMachine("");
      setSelectedBlock("");
      setSelectedOperator("");
      fetchSessions();
    }
  }

  async function handleStop(session: Session) {
    const stoppedAt = new Date().toISOString();
    const startMs = new Date(session.started_at).getTime();
    const stopMs = new Date(stoppedAt).getTime();
    const durationMins = Math.round((stopMs - startMs) / 60000);

    // 1. Update the session in the database
    const { error: sessionError } = await supabase
      .from("machine_sessions")
      .update({ stopped_at: stoppedAt, duration_mins: durationMins })
      .eq("id", session.id);

    // 2. Automatically update the block status
    // If the machine was a cutter, block becomes 'unpolished_stock'
    // If the machine was a liner, block becomes 'finished_stock'
    let newStatus = "";
    if (session.machine_id === "14-blade" || session.machine_id === "7-blade") {
      newStatus = "unpolished_stock";
    } else if (session.machine_id === "liner") {
      newStatus = "finished_stock";
    }

    if (newStatus) {
      await supabase
        .from("blocks")
        .update({ status: newStatus })
        .eq("id", session.block_id);
    }

    if (!sessionError) {
      fetchSessions();
      fetchBlocks(); // Refresh the list so the status change shows up
    }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto", padding: 24, background: "#0a0a0a", minHeight: "100vh", color: "#e8e8e8" },
    label: { fontSize: 11, color: "#555", textTransform: "uppercase" as const, letterSpacing: "0.1em", display: "block", marginBottom: 6 },
    select: { width: "100%", padding: "10px 14px", background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: 8, color: "#e8e8e8", fontSize: 14, boxSizing: "border-box" as const },
    card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 24, marginBottom: 24 },
  };

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: "#c0392b", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>◆ Mahalaxmi Granites — Internal ERP</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Machine Session Tracker</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Start and stop machine sessions. Every second is tracked.</p>
      </div>

      {/* Live Machine Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
        {MACHINES.map((machine) => {
          const activeSession = activeSessions.find((s) => s.machine_id === machine.id);
          const isActive = !!activeSession;
          return (
            <div key={machine.id} style={{ background: "#111", border: `1px solid ${isActive ? machine.color : "#1e1e1e"}`, borderRadius: 16, padding: 20, transition: "all 0.3s" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{machine.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{machine.label}</div>
              {isActive ? (
                <>
                  <div style={{ fontSize: 10, color: machine.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>● ACTIVE</div>
                  <div style={{ fontSize: 11, color: "#e8e8e8", marginBottom: 2 }}>{activeSession.stone_type}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{activeSession.block_no}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>By: {activeSession.operator_name}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: machine.color, marginBottom: 12, fontVariantNumeric: "tabular-nums" }}>
                    {getLiveDuration(activeSession.started_at)}
                  </div>
                  <button
                    onClick={() => handleStop(activeSession)}
                    style={{ width: "100%", padding: "8px 0", background: machine.color, border: "none", borderRadius: 8, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    ⏹ STOP SESSION
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em" }}>● IDLE</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Start New Session Form */}
      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>▶ Start New Session</h2>

        {/* Machine Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Select Machine *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {MACHINES.map((m) => {
              const isActive = machineIsActive(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => !isActive && setSelectedMachine(m.id)}
                  style={{
                    padding: "10px 8px", border: "1px solid",
                    borderColor: selectedMachine === m.id ? m.color : isActive ? "#333" : "#1e1e1e",
                    background: selectedMachine === m.id ? `${m.color}22` : "transparent",
                    color: isActive ? "#333" : selectedMachine === m.id ? m.color : "#555",
                    borderRadius: 8, cursor: isActive ? "not-allowed" : "pointer",
                    fontSize: 11, fontWeight: 700, textAlign: "center" as const,
                  }}
                >
                  {m.icon} {m.label}
                  {isActive && <div style={{ fontSize: 9, marginTop: 2 }}>ALREADY RUNNING</div>}
                </button>
              );
            })}
          </div>
        </div>

       {/* Block Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Select Block *</label>
          <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} style={S.select}>
            <option value="">-- Choose Block --</option>
            {blocks
              .filter((b) => {
                if (selectedMachine === "14-blade" || selectedMachine === "7-blade") {
                  return b.status === "yard";
                }
                if (selectedMachine === "liner") {
                  return b.status === "unpolished_stock";
                }
                return false;
              })
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.block_no} — {b.stone_type} {b.status === "unpolished_stock" ? "· UNPOLISHED" : ""}
                </option>
              ))}
          </select>
        </div>

        {/* Operator Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Operator *</label>
          <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)} style={S.select}>
            <option value="">-- Select Operator --</option>
            {OPERATORS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          style={{ width: "100%", padding: "12px 0", background: loading ? "#333" : "#27ae60", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Starting..." : "▶ START SESSION"}
        </button>

        {message && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: message.includes("✅") ? "#27ae6022" : "#c0392b22", borderRadius: 8, fontSize: 13, color: message.includes("✅") ? "#27ae60" : "#c0392b" }}>
            {message}
          </div>
        )}
      </div>

      {/* Completed Sessions */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Completed Sessions</h2>
        {completedSessions.length === 0 ? (
          <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 32, border: "1px dashed #1e1e1e", borderRadius: 12 }}>
            No completed sessions yet.
          </div>
        ) : (
          completedSessions.map((s) => {
            const machine = MACHINES.find((m) => m.id === s.machine_id);
            return (
              <div key={s.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 2 }}>Machine</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: machine?.color }}>{machine?.icon} {machine?.label}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 2 }}>Block</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.block_no}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 2 }}>Stone</div>
                  <div style={{ fontSize: 12 }}>{s.stone_type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 2 }}>Operator</div>
                  <div style={{ fontSize: 12 }}>{s.operator_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 2 }}>Duration</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#27ae60" }}>{s.duration_mins} mins</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}