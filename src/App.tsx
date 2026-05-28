import { useState } from "react";
import BlockInward from "./BlockInward";
import MachineSession from "./MachineSession";
import YardView from "./YardView";

const TABS = [
  { id: "blocks", label: "Block Inward", icon: "🪨" },
  { id: "machines", label: "Machine Sessions", icon: "⚙️" },
  { id: "yard", label: "Yard View", icon: "📦" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("blocks");

  return (
    <div style={{ fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "#e8e8e8" }}>

      {/* Top Nav */}
      <div style={{ borderBottom: "1px solid #1e1e1e", background: "#0a0a0a", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ background: "white", padding: "3px 6px", borderRadius: 4, fontSize: 15, fontWeight: 900, letterSpacing: -2 }}>
              <span style={{ color: "#1D264F" }}>M</span>
              <span style={{ color: "#c0392b" }}>L</span>
              <span style={{ color: "#1D264F" }}>G</span>
            </div>
            <div style={{ fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: "0.08em", display: "none" }} className="desktop-label">
              INTERNAL ERP
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid",
                  borderColor: activeTab === tab.id ? "#c0392b" : "#1e1e1e",
                  background: activeTab === tab.id ? "#c0392b22" : "transparent",
                  color: activeTab === tab.id ? "#c0392b" : "#555",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  minWidth: 64,
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span style={{ fontSize: 9, letterSpacing: "0.03em" }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      {activeTab === "blocks" && <BlockInward />}
      {activeTab === "machines" && <MachineSession />}
      {activeTab === "yard" && <YardView />}
    </div>
  );
}