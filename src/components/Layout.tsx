import React, { useState, useEffect } from "react";
import AiAssistant from "./AiAssistant"; // Ensure your AI file is exactly named AiAssistant.tsx
import { UI } from "../styles"; // Import your new style system

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({
  children,
  activeTab,
  setActiveTab,
}: LayoutProps) {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Injecting responsive CSS
  useEffect(() => {
    if (!document.getElementById("layout-responsive-styles")) {
      const style = document.createElement("style");
      style.id = "layout-responsive-styles";
      style.innerHTML = `
        .app-sidebar {
          width: 260px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ai-drawer {
          width: 400px;
          right: -450px;
        }
        .ai-drawer.open {
          right: 0;
        }
        .mobile-toggle { display: none; }
        
        @media (max-width: 768px) {
          .app-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 50;
            transform: translateX(-100%);
          }
          .app-sidebar.open {
            transform: translateX(0);
          }
          .mobile-toggle { display: block; }
          .header-status { display: none !important; }
          
          .ai-drawer {
            width: 100vw;
            right: -100vw;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const sections = [
    {
      title: "DASHBOARD",
      items: ["Overview"],
    },
    {
      title: "OPERATIONS",
      items: ["Block Inward", "Yard Stock", "Production", "Finished Stock"],
    },
    {
      title: "SALES",
      items: ["Sales", "Parties"],
    },
    {
      title: "ACCOUNTS",
      items: ["Expenses", "Profitability"],
    },
  ];

  const handleNavClick = (item: string) => {
    setActiveTab(item);
    setIsMobileMenuOpen(false);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: UI.colors.bg,
        color: UI.colors.textMain,
        fontFamily: UI.font.family,
      }}
    >
      {/* Mobile Sidebar Dark Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <nav
        className={`app-sidebar ${isMobileMenuOpen ? "open" : ""}`}
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          padding: "20px 20px 0 20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            marginBottom: 32,
            paddingBottom: 20,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1e3a8a", letterSpacing: "-0.5px" }}>
            🏢 Mahalaxmi ERP
          </div>
          <button 
            className="mobile-toggle"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ background: "none", border: "none", fontSize: 20, color: "#6b7280", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }} className="hide-scrollbar">
          {sections.map((section) => (
            <div key={section.title} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: "#9ca3af",
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {section.title}
              </div>

              {section.items.map((item) => {
                const active = activeTab === item;
                return (
                  <div
                    key={item}
                    onClick={() => handleNavClick(item)}
                    style={{
                      padding: "10px 14px",
                      marginBottom: 4,
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: active ? "#eff6ff" : "transparent",
                      color: active ? "#2563eb" : "#4b5563",
                      fontWeight: active ? 600 : 500,
                      border: active ? "1px solid #bfdbfe" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    {item}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ padding: "20px 0", borderTop: "1px solid #e5e7eb", marginTop: "auto" }}>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsAiOpen(true);
            }}
            style={{
              width: "100%",
              padding: "12px",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              color: "#374151",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
          >
            🤖 Ask AI Assistant
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            height: 70,
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="mobile-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ background: "none", border: "none", fontSize: 24, color: "#111827", cursor: "pointer", padding: 0 }}
            >
              ☰
            </button>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
              {activeTab}
            </div>
          </div>
          
          <div className="header-status" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#059669", background: "#d1fae5", padding: "6px 12px", borderRadius: 20 }}>
              🟢 Live Server
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
              MM
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>

      {/* --- AI DRAWER OVERLAY --- */}
      {isAiOpen && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(2px)", zIndex: 60,
          }}
          onClick={() => setIsAiOpen(false)}
        />
      )}

      {/* --- AI DRAWER PANEL --- */}
      <div
        className={`ai-drawer ${isAiOpen ? "open" : ""}`}
        style={{
          position: "fixed", top: 0, 
          height: "100vh", background: "#ffffff",
          boxShadow: "-8px 0 30px rgba(0, 0, 0, 0.1)",
          transition: "right 0.3s cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 70,
          display: "flex", flexDirection: "column"
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#111827" }}>🤖 Mahalaxmi AI</h2>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Factory Intelligence</div>
          </div>
          <button 
            onClick={() => setIsAiOpen(false)} 
            style={{ background: "#e5e7eb", border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontWeight: "bold", fontSize: 14 }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <AiAssistant />
        </div>
      </div>
    </div>
  );
}