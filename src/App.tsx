import { useState } from "react";
import BlockInward from "./BlockInward";
import MachineSession from "./MachineSession";
import YardView from "./YardView";
import FinishedStock from "./FinishedStock";

const TABS = [
  { id: "blocks", label: "Block Inward", icon: "🪨" },
  { id: "machines", label: "Machine Sessions", icon: "⚙️" },
  { id: "yard", label: "Yard View", icon: "📦" },
  { id: "finished", label: "Finished Stock", icon: "✅" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("blocks");

  return (
    // Replaced inline fonts/backgrounds to let index.css variable variables govern the page layout
    <div style={{ fontFamily: "var(--sans)", background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>

      {/* Top Nav */}
      <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ background: "white", padding: "3px 6px", borderRadius: 4, fontSize: 15, fontWeight: 900, letterSpacing: -2 }}>
              <span style={{ color: "#1D264F" }}>M</span>
              <span style={{ color: "#ef4444" }}>L</span> {/* Fixed low-contrast red */}
              <span style={{ color: "#1D264F" }}>G</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text)", fontWeight: 600, letterSpacing: "0.08em", display: "none" }} className="desktop-label">
              INTERNAL ERP
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "8px 12px", /* Larger hit target for factory floor use */
                    border: "1px solid",
                    borderColor: isActive ? "var(--accent)" : "var(--border)",
                    background: isActive ? "var(--accent-bg)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--text)", /* Fixed low-contrast text (#555 turned into variable) */
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    minWidth: 70,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
                  <span style={{ fontSize: 10, letterSpacing: "0.03em" }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
        {activeTab === "blocks" && <BlockInward />}
        {activeTab === "machines" && <MachineSession />}
        {activeTab === "yard" && <YardView />}
        {activeTab === "finished" && <FinishedStock />}
      </main>
    </div>
  );
}