import { useState } from "react";
import BlockInward from "./BlockInward";
import MachineSession from "./MachineSession";

const TABS = [
  { id: "blocks", label: "Block Inward", icon: "🪨" },
  { id: "machines", label: "Machine Sessions", icon: "⚙️" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("blocks");

  return (
    <div style={{ fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "#e8e8e8" }}>
      
      {/* Top Nav */}
      <div style={{ borderBottom: "1px solid #1e1e1e", background: "#0a0a0a", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "white", padding: "3px 7px", borderRadius: 4, fontSize: 16, fontWeight: 900, letterSpacing: -2 }}>
              <span style={{ color: "#1D264F" }}>M</span>
              <span style={{ color: "#c0392b" }}>L</span>
              <span style={{ color: "#1D264F" }}>G</span>
            </div>
            <div style={{ fontSize: 12, color: "#555", fontWeight: 600, letterSpacing: "0.05em" }}>
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
                  padding: "6px 14px",
                  border: "1px solid",
                  borderColor: activeTab === tab.id ? "#c0392b" : "#1e1e1e",
                  background: activeTab === tab.id ? "#c0392b22" : "transparent",
                  color: activeTab === tab.id ? "#c0392b" : "#555",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      {activeTab === "blocks" && <BlockInward />}
      {activeTab === "machines" && <MachineSession />}
    </div>
  );
}