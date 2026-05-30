import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { STATUS } from "../constants";

const MACHINES = [
  { id: "14-blade", label: "14 Blade Cutter", icon: "⚙️", color: "#f59e0b", type: "gangsaw" },
  { id: "7-blade", label: "7 Blade Cutter", icon: "🔪", color: "#ef4444", type: "gangsaw" },
  { id: "liner", label: "Liner Polish", icon: "✨", color: "#3b82f6", type: "liner" },
];

const OPERATORS = [
  "Raju Kharra",
  "Kishan Lal",
  "Himmat Saini",
  "Suresh Kumar",
  "Arjun Yadav",
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
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [loading, setLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    fetchBlocks();
    fetchSessions();
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBlocks() {
    const { data } = await supabase
      .from("blocks")
      .select("id, block_no, stone_type, quarry_name, is_own_block, status")
      .in("status", [STATUS.YARD, STATUS.UNPOLISHED])
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
      setCompletedSessions(data.filter((s: Session) => !!s.stopped_at).slice(0, 15));
    }
  }

  function getLiveDuration(startedAt: string) {
    const diffMs = Date.now() - new Date(startedAt).getTime();
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  }

  function machineIsActive(machineId: string) {
    return activeSessions.some((s) => s.machine_id === machineId);
  }

  function getValidBlocks() {
    const machine = MACHINES.find((m) => m.id === selectedMachine);
    if (!machine) return [];
    if (machine.type === "gangsaw") 
      return blocks.filter((b) => b.status === STATUS.YARD);
    if (machine.type === "liner") 
      return blocks.filter((b) => b.status === STATUS.UNPOLISHED);
    return [];
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

    const machine = MACHINES.find((m) => m.id === selectedMachine);
    const block = blocks.find((b) => b.id === selectedBlock);

    if (machine?.type === "gangsaw" && block?.status !== STATUS.YARD) {
      setMessage("❌ Gangsaws only accept blocks waiting in yard.");
      return;
    }
    if (machine?.type === "liner" && block?.status !== STATUS.UNPOLISHED) {
      setMessage("❌ Liner only accepts cut blocks awaiting polish.");
      return;
    }

    setLoading(true);
    setMessage("");

    let newBlockStatus;
    if (machine?.type === "gangsaw") {
      newBlockStatus = STATUS.CUTTING;
    } else if (machine?.type === "liner") {
      newBlockStatus = STATUS.POLISHING;
    } else {
      setMessage("❌ Error: Unknown machine type.");
      setLoading(false);
      return;
    }
    
    const { error: blockError } = await supabase
      .from("blocks")
      .update({ status: newBlockStatus })
      .eq("id", selectedBlock);

    if (blockError) {
      setMessage("❌ Failed to update block status: " + blockError.message);
      setLoading(false);
      return;
    }

    const { error: sessionError } = await supabase.from("machine_sessions").insert({
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

    if (sessionError) {
      await supabase.from("blocks").update({ status: block?.status }).eq("id", selectedBlock);
      setMessage("❌ " + sessionError.message);
    } else {
      setMessage("✅ Session started!");
      setSelectedMachine("");
      setSelectedBlock("");
      setSelectedOperator("");
      fetchBlocks();
      fetchSessions();
    }
  }

  async function handleStop(session: Session) {
    setStopLoading(session.id);

    const stoppedAt = new Date().toISOString();
    const machine = MACHINES.find((m) => m.id === session.machine_id);
    
    let nextBlockStatus;
    if (machine?.type === "gangsaw") {
      nextBlockStatus = STATUS.UNPOLISHED;
    } else if (machine?.type === "liner") {
      nextBlockStatus = STATUS.FINISHED;
    } else {
      setMessage("❌ Error: Machine type unrecognized. Cannot determine next status.");
      setStopLoading(null);
      return; 
    }

    const { error: blockError } = await supabase
      .from("blocks")
      .update({ status: nextBlockStatus })
      .eq("id", session.block_id);

    if (blockError) {
      setMessage("❌ Failed: " + blockError.message);
      setStopLoading(null);
      return;
    }

    const durationMins = Math.round(
      (new Date(stoppedAt).getTime() - new Date(session.started_at).getTime()) / 60000
    );

    const { error: sessionError } = await supabase
      .from("machine_sessions")
      .update({ stopped_at: stoppedAt, duration_mins: durationMins })
      .eq("id", session.id);

    if (sessionError) {
      setMessage("❌ Session close failed: " + sessionError.message);
      setStopLoading(null);
      return;
    }

    setMessage(`✅ Block moved to: ${nextBlockStatus === STATUS.UNPOLISHED ? "Cut — Awaiting Polish" : "Finished"}`);
    setStopLoading(null);
    await fetchBlocks();
    await fetchSessions();
  }

  const validBlocks = getValidBlocks();

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "0 auto", padding: 16 },
    label: { fontSize: 11, color: "var(--text)", textTransform: "uppercase" as const, letterSpacing: "0.1em", display: "block", marginBottom: 6 },
    select: { width: "100%", padding: "10px 14px", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-h)", fontSize: 14, boxSizing: "border-box" as const },
    card: { background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20 },
  };

  return (
    <div style={S.page}>
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-h)" }}>⚙️ Machine Sessions</h1>
        <p style={{ color: "var(--text)", fontSize: 13, marginTop: 4 }}>Start and stop sessions. Status updates automatically.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {MACHINES.map((machine) => {
          const activeSession = activeSessions.find((s) => s.machine_id === machine.id);
          const isActive = !!activeSession;
          const isStopping = activeSession && stopLoading === activeSession.id;
          return (
            <div key={machine.id} style={{ background: "var(--code-bg)", border: `1px solid ${isActive ? machine.color : "var(--border)"}`, borderRadius: 14, padding: 14, transition: "all 0.3s" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{machine.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, lineHeight: 1.3, color: "var(--text-h)" }}>{machine.label}</div>
              {isActive && activeSession ? (
                <>
                  <div style={{ fontSize: 9, color: machine.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>● ACTIVE</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 1, color: "var(--text-h)" }}>{activeSession.stone_type}</div>
                  <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 1 }}>{activeSession.block_no}</div>
                  <div style={{ fontSize: 10, color: "var(--text)", marginBottom: 10 }}>{activeSession.operator_name}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: machine.color, marginBottom: 10, fontVariantNumeric: "tabular-nums" }}>
                    {getLiveDuration(activeSession.started_at)}
                  </div>
                  <button
                    onClick={() => handleStop(activeSession)}
                    disabled={!!isStopping}
                    style={{ width: "100%", padding: "8px 0", minHeight: 44, background: isStopping ? "#333" : machine.color, border: "none", borderRadius: 8, color: "white", fontSize: 11, fontWeight: 700, cursor: isStopping ? "not-allowed" : "pointer" }}
                  >
                    {isStopping ? "Stopping..." : "⏹ STOP"}
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 10, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.1em" }}>● IDLE</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 11, color: "var(--text)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "#9ca3af" }}>⏳ Yard</span>
        <span>→</span>
        <span style={{ color: "#f59e0b" }}>⚙️ Cutting</span>
        <span>→</span>
        <span style={{ color: "#3b82f6" }}>🔵 Awaiting Polish</span>
        <span>→</span>
        <span style={{ color: "#a855f7" }}>✨ Polishing</span>
        <span>→</span>
        <span style={{ color: "#22c55e" }}>✅ Finished</span>
      </div>

      <div style={S.card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-h)" }}>▶ Start New Session</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Select Machine *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {MACHINES.map((m) => {
              const isActive = machineIsActive(m.id);
              return (
                <button key={m.id}
                  onClick={() => { if (!isActive) { setSelectedMachine(m.id); setSelectedBlock(""); } }}
                  style={{ padding: "10px 6px", minHeight: 56, border: "1px solid", borderColor: selectedMachine === m.id ? m.color : isActive ? "#222" : "var(--border)", background: selectedMachine === m.id ? `${m.color}22` : "transparent", color: isActive ? "#333" : selectedMachine === m.id ? m.color : "var(--text)", borderRadius: 8, cursor: isActive ? "not-allowed" : "pointer", fontSize: 10, fontWeight: 700, textAlign: "center" }}>
                  {m.icon}<br />{m.label}
                  {isActive && <div style={{ fontSize: 8, marginTop: 2 }}>RUNNING</div>}
                </button>
              );
            })}
          </div>
          {selectedMachine && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text)", padding: "6px 10px", background: "var(--bg)", borderRadius: 6 }}>
              {MACHINES.find(m => m.id === selectedMachine)?.type === "gangsaw"
                ? "⚙️ Shows blocks waiting in yard only"
                : "✨ Shows cut blocks awaiting polish only"}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Select Block *</label>
          <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} style={S.select}>
            <option value="">-- Choose Block --</option>
            {validBlocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.block_no} — {b.stone_type} {b.quarry_name ? `(${b.quarry_name})` : ""} · {b.is_own_block ? "Own" : "Job"}
              </option>
            ))}
          </select>
          {selectedMachine && validBlocks.length === 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#f59e0b" }}>
              ⚠ No eligible blocks for this machine right now.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Operator *</label>
          <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)} style={S.select}>
            <option value="">-- Select Operator --</option>
            {OPERATORS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        <button onClick={handleStart} disabled={loading}
          style={{ width: "100%", padding: "12px 0", minHeight: 44, background: loading ? "var(--border)" : "#22c55e", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Starting..." : "▶ START SESSION"}
        </button>

        {message && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: message.includes("✅") ? "#22c55e22" : "#ef444422", borderRadius: 8, fontSize: 13, color: message.includes("✅") ? "#22c55e" : "#ef4444" }}>
            {message}
          </div>
        )}
      </div>

      <button onClick={() => setShowCompleted(!showCompleted)}
        style={{ width: "100%", padding: "12px 0", minHeight: 44, background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
        {showCompleted ? "▲ Hide" : "▼ Show"} Completed Sessions ({completedSessions.length})
      </button>

      {showCompleted && completedSessions.map((s) => {
        const machine = MACHINES.find((m) => m.id === s.machine_id);
        return (
          <div key={s.id} style={{ background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
            {[
              { label: "Machine", value: `${machine?.icon} ${machine?.label}`, color: machine?.color },
              { label: "Block", value: s.block_no, color: "#ef4444" },
              { label: "Stone", value: s.stone_type },
              { label: "Operator", value: s.operator_name },
              { label: "Duration", value: `${s.duration_mins} mins`, color: "#22c55e" },
            ].map((col) => (
              <div key={col.label}>
                <div style={{ fontSize: 9, color: "var(--text)", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: col.color || "var(--text-h)" }}>{col.value}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}