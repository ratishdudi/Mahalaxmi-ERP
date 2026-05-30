// Centralize your design system here
export const UI = {
  colors: {
    primary: "#2563eb",      // Strong Blue
    bg: "#f8fafc",           // Light Page Background
    card: "#ffffff",         // White Card Background
    textMain: "#111827",     // High Contrast Black
    textSub: "#64748b",      // Readable Gray
    border: "#e5e7eb",       // Subtle Borders
    error: "#ef4444",
    success: "#22c55e",
  },
  spacing: {
    padding: "16px",
    borderRadius: "12px",
  },
  shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  font: {
    family: "Inter, system-ui, sans-serif",
  }
};

// Reusable card container styles to fix the "ugly" look
export const cardStyle = {
  background: UI.colors.card,
  border: `1px solid ${UI.colors.border}`,
  borderRadius: UI.spacing.borderRadius,
  padding: UI.spacing.padding,
  boxShadow: UI.shadow,
};