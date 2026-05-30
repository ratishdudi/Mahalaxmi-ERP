import { useMemo, useState } from "react";
import { suggestNames } from "../names";

type SmartTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  style?: React.CSSProperties;
};

export default function SmartTextInput({ value, onChange, suggestions, placeholder, style }: SmartTextInputProps) {
  const [focused, setFocused] = useState(false);
  const matches = useMemo(() => suggestNames(value, suggestions), [value, suggestions]);
  const open = focused && matches.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        style={style}
      />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)", overflow: "hidden" }}>
          {matches.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(name)}
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "white", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", color: "#111827", fontSize: 13 }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
