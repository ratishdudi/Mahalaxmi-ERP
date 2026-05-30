import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

type Message = { role: "user" | "ai"; content: string };

// --- Custom Icons ---
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const UserAvatar = () => (
  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4b5563", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
    👤
  </div>
);

const AiAvatar = () => (
  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
    ✨
  </div>
);

export default function AiAssistant() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Load saved history 
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("factoryChatHistory");
    return saved ? JSON.parse(saved) : [{ role: "ai", content: "Hello. I am the Mahalaxmi Command AI. How can I help you analyze the factory today?" }];
  });

  // 2. Auto-save and auto-scroll
  useEffect(() => {
    localStorage.setItem("factoryChatHistory", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function askGemini(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt(""); 
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('factory-ai', {
      body: { prompt: userMessage.content } 
    });

    if (error) {
      setMessages((prev) => [...prev, { role: "ai", content: "❌ Connection Error: " + error.message }]);
    } else {
      setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
    }
    
    setLoading(false);
  }

  // --- High-End LLM Styles ---
  const S: Record<string, React.CSSProperties> = {
    layout: { display: "flex", flexDirection: "column", height: "88vh", background: "#111111", color: "#ececec", fontFamily: "system-ui, -apple-system, sans-serif" },
    header: { padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2a2a2a" },
    title: { fontSize: 16, fontWeight: 600, margin: 0, color: "#a1a1aa", letterSpacing: "0.5px" },
    clearBtn: { background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 4, transition: "0.2s" },
    
    chatScrollArea: { flex: 1, overflowY: "auto", padding: "24px 0" },
    messageContainer: { maxWidth: 768, margin: "0 auto", padding: "16px 24px", display: "flex", gap: 16, lineHeight: 1.6, fontSize: 15 },
    messageContent: { flex: 1, whiteSpace: "pre-wrap", paddingTop: 4, color: "#e4e4e7" },
    
    inputWrapper: { padding: "24px", background: "linear-gradient(180deg, transparent, #111111 20%)" },
    inputContainer: { maxWidth: 768, margin: "0 auto", position: "relative", display: "flex", alignItems: "flex-end", background: "#212121", borderRadius: 24, border: "1px solid #3f3f46", padding: "8px 16px" },
    input: { flex: 1, background: "transparent", border: "none", color: "#ececec", fontSize: 15, padding: "10px 0", outline: "none", resize: "none", minHeight: 24, maxHeight: 200, fontFamily: "inherit" },
    sendBtn: { background: prompt.trim() ? "#ececec" : "#3f3f46", color: "#111111", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: prompt.trim() ? "pointer" : "default", transition: "0.2s", marginLeft: 12, marginBottom: 6 }
  };

  return (
    <div style={S.layout}>
      {/* Subtle Header */}
      <div style={S.header}>
        <h2 style={S.title}>MAHALAXMI COMMAND AI</h2>
        <button 
          onClick={() => { if(window.confirm("Clear all memories?")) { setMessages([{ role: "ai", content: "Memory cleared. What's next?" }]); localStorage.removeItem("factoryChatHistory"); } }} 
          style={S.clearBtn}
          onMouseOver={(e) => e.currentTarget.style.color = "#ececec"}
          onMouseOut={(e) => e.currentTarget.style.color = "#71717a"}
        >
          Clear Chat
        </button>
      </div>

      {/* Chat Area */}
      <div style={S.chatScrollArea} className="hide-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} style={{ background: msg.role === "user" ? "transparent" : "#1a1a1a", borderBottom: msg.role === "ai" ? "1px solid #2a2a2a" : "none", borderTop: msg.role === "ai" ? "1px solid #2a2a2a" : "none" }}>
            <div style={S.messageContainer}>
              {msg.role === "user" ? <UserAvatar /> : <AiAvatar />}
              <div style={S.messageContent}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", borderTop: "1px solid #2a2a2a" }}>
            <div style={S.messageContainer}>
              <AiAvatar />
              <div style={{...S.messageContent, opacity: 0.5 }}>
                <span className="pulse-text">Analyzing database...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Modern Floating Input */}
      <div style={S.inputWrapper}>
        <form onSubmit={askGemini} style={S.inputContainer}>
          <input 
            type="text" 
            placeholder="Message the Factory AI..." 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={S.input}
            disabled={loading}
            autoComplete="off"
          />
          <button type="submit" disabled={loading || !prompt.trim()} style={S.sendBtn}>
            <SendIcon />
          </button>
        </form>
        <p style={{ textAlign: "center", color: "#71717a", fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          AI can make mistakes. Verify critical financial data against the main dashboard.
        </p>
      </div>
    </div>
  );
}