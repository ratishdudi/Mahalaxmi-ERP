import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import MarkdownMessage from "./MarkdownMessage";

type Message = { role: "user" | "ai"; content: string };

export default function AiAssistant() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("factoryChatHistory");
    return saved ? JSON.parse(saved) : [{ role: "ai", content: "Hello. I am the Mahalaxmi Command AI. How can I help you analyze the factory today?" }];
  });

  // Inject animations once
  useEffect(() => {
    const styleId = "ai-chat-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .thinking-pulse { animation: pulse 1.5s infinite ease-in-out; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .chat-scrollbar::-webkit-scrollbar { width: 6px; }
        .chat-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("factoryChatHistory", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function askGemini(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: Message = { role: "user", content: prompt };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt("");
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('factory-ai', {
      body: { prompt: userMessage.content, messages: nextMessages.slice(-10) }
    });

    setMessages((prev) => [...prev, { role: "ai", content: error ? "❌ Error: " + error.message : data.message }]);
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e4e4e7", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#71717a", letterSpacing: "1px" }}>MAHALAXMI INTELLIGENCE</span>
        <button 
          onClick={() => { setMessages([{ role: "ai", content: "Memory reset." }]); localStorage.removeItem("factoryChatHistory"); }}
          style={{ background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", fontSize: 11, padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }} className="chat-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} style={{ padding: "16px 20px", display: "flex", gap: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "ai" ? "#18181b" : "transparent", fontSize: 16 }}>
              {msg.role === "ai" ? "✨" : "👤"}
            </div>
            <div style={{ flex: 1, lineHeight: 1.6, fontSize: 15, paddingTop: 2 }}>
              <MarkdownMessage content={msg.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: "16px 20px", display: "flex", gap: 16 }}>
            <div style={{ width: 28, height: 28, background: "#18181b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>✨</div>
            <div className="thinking-pulse" style={{ fontSize: 15, color: "#a1a1aa" }}>Thinking...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: 16, background: "#0a0a0a", borderTop: "1px solid #1f1f1f" }}>
        <form onSubmit={askGemini} style={{ display: "flex", alignItems: "flex-end", background: "#18181b", borderRadius: 12, padding: "8px 12px", border: "1px solid #27272a" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Analyze production data..."
            style={{ flex: 1, background: "transparent", border: "none", color: "white", padding: "8px 0", resize: "none", outline: "none", fontSize: 15, maxHeight: 100, minHeight: 20 }}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askGemini(e); } }}
          />
          <button type="submit" disabled={loading || !prompt.trim()} style={{ background: prompt.trim() ? "#e4e4e7" : "#27272a", color: "#000", border: "none", borderRadius: 6, padding: "6px 12px", marginLeft: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Send
          </button>
        </form>
        <div style={{ textAlign: "center", fontSize: 10, color: "#52525b", marginTop: 8 }}>
          AI models can make errors. Verify sensitive data.
        </div>
      </div>
    </div>
  );
}
