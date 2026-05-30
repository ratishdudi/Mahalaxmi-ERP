// Centralize your design system here
export const UI = {
  colors: {
    primary: "#174a87",
    bg: "#edf2f7",
    card: "#ffffff",
    textMain: "#172033",
    textSub: "#667085",
    border: "#d8e0ea",
    error: "#d92d20",
    success: "#12b76a",
  },
  spacing: {
    padding: "16px",
    borderRadius: "12px",
  },
  shadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
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
