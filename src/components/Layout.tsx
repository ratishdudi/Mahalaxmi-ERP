import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import "./Layout.css";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV = [
  {
    group: "DASHBOARD",
    items: [{ id: "Dashboard", label: "Overview", short: "Home", icon: "H" }],
  },
  {
    group: "OPERATIONS",
    items: [
      { id: "Inventory", label: "Block Inward", short: "Inward", icon: "I" },
      { id: "Yard", label: "Yard Stock", short: "Yard", icon: "Y" },
      { id: "Machines", label: "Production", short: "Machines", icon: "M" },
      { id: "Finished", label: "Finished Stock", short: "Stock", icon: "F" },
    ],
  },
  {
    group: "SALES",
    items: [
      { id: "Sales", label: "Sales Entry", short: "Sales", icon: "S" },
      { id: "Parties", label: "Parties", short: "Parties", icon: "P" },
    ],
  },
  {
    group: "ACCOUNTS",
    items: [
      { id: "Expenses", label: "Ledger", short: "Ledger", icon: "L" },
      { id: "Break-Even", label: "Profitability", short: "Profit", icon: "B" },
    ],
  },
  {
    group: "TOOLS",
    items: [{ id: "AI Assistant", label: "AI Assistant", short: "AI", icon: "AI" }],
  },
];

const MOBILE_TABS = ["Dashboard", "Inventory", "Machines", "Sales", "Expenses"];

type Msg = { role: "user" | "ai"; content: string };

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = useMemo(() => NAV.flatMap((section) => section.items), []);
  const activeItem = items.find((item) => item.id === activeTab);
  const mobileItems = MOBILE_TABS.map((id) => items.find((item) => item.id === id)).filter(Boolean) as typeof items;

  function chooseTab(tab: string) {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (tab === "AI Assistant") setAiOpen(true);
  }

  return (
    <div className="erp-shell">
      {sidebarOpen && <button className="erp-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <aside className={`erp-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <Brand />
        <nav className="erp-nav" aria-label="Primary navigation">
          {NAV.map((section) => (
            <section key={section.group} className="erp-nav-section">
              <div className="erp-nav-heading">{section.group}</div>
              {section.items.map((item) => {
                const active = activeTab === item.id || (item.id === "AI Assistant" && aiOpen);
                return (
                  <button key={item.id} className={`erp-nav-item ${active ? "is-active" : ""}`} onClick={() => chooseTab(item.id)}>
                    <span className="erp-nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="erp-plant">
          <span className="erp-plant-dot" />
          Kishangarh Unit
        </div>
      </aside>

      <section className="erp-workspace">
        <header className="erp-topbar">
          <button className="erp-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <div className="erp-title-block">
            <div className="erp-current">{activeItem?.label || activeTab}</div>
            <div className="erp-subtitle">Mahalaxmi Granite ERP</div>
          </div>
          <div className="erp-top-actions">
            <div className="erp-date">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
            <button className={`erp-ai-button ${aiOpen ? "is-active" : ""}`} onClick={() => setAiOpen((open) => !open)}>
              AI
            </button>
          </div>
        </header>

        <div className="erp-content-row">
          <main className="erp-main">{children}</main>
          {aiOpen && (
            <aside className="erp-ai-drawer">
              <AiDrawer />
            </aside>
          )}
        </div>

        <footer className="erp-statusbar">
          <span><strong>Live</strong> Supabase workspace</span>
          <span>{activeItem?.label || activeTab}</span>
          <span>Kishangarh operations</span>
        </footer>
      </section>

      <nav className="erp-mobile-nav" aria-label="Mobile navigation">
        {mobileItems.map((item) => (
          <button key={item.id} className={`erp-mobile-tab ${activeTab === item.id ? "is-active" : ""}`} onClick={() => chooseTab(item.id)}>
            <span className="erp-mobile-icon">{item.icon}</span>
            <span>{item.short}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <div className="erp-brand">
      <div className="erp-logo" aria-hidden="true">
        <span>M</span>
        <span>L</span>
        <span>G</span>
      </div>
      <div>
        <div className="erp-brand-name">Mahalaxmi ERP</div>
        <div className="erp-brand-sub">Granite Operations</div>
      </div>
    </div>
  );
}

function AiDrawer() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", content: "Ask about stock, sales, parties, machine rates, or pending payments." },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    const userMsg: Msg = { role: "user", content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("factory-ai", {
        body: { prompt: userMsg.content },
      });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "AI is not connected yet. Supabase Edge Function setup is required." }]);
    }
    setLoading(false);
  }

  return (
    <div className="erp-ai-panel">
      <div className="erp-ai-head">
        <div>
          <strong>Factory AI</strong>
          <span>Operational assistant</span>
        </div>
      </div>
      <div className="erp-ai-prompts">
        {["Who owes money?", "Machine cost trend", "Slow stock"].map((q) => (
          <button key={q} onClick={() => setPrompt(q)}>{q}</button>
        ))}
      </div>
      <div className="erp-ai-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`erp-message ${msg.role === "user" ? "is-user" : ""}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="erp-ai-loading">Thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <form className="erp-ai-form" onSubmit={send}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask factory AI..." />
        <button type="submit" disabled={loading || !prompt.trim()}>Send</button>
      </form>
    </div>
  );
}
