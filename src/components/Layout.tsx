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
  const sections = [
    {
      title: "DASHBOARD",
      items: ["Dashboard"],
    },
    {
      title: "OPERATIONS",
      items: ["Inventory", "Yard", "Machines", "Finished"],
    },
    {
      title: "SALES",
      items: ["Sales", "Parties"],
    },
    {
      title: "ACCOUNTS",
      items: ["Expenses", "Break-Even"],
    },
    {
      title: "TOOLS",
      items: ["AI Assistant"],
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#f8fafc",
        color: "#111827",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <nav
        style={{
          width: 260,
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            marginBottom: 32,
            paddingBottom: 20,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            MAHALAXMI ERP
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 4,
            }}
          >
            Marble Factory Management
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                color: "#9ca3af",
                marginBottom: 8,
              }}
            >
              {section.title}
            </div>

            {section.items.map((item) => {
              const active = activeTab === item;

              return (
                <div
                  key={item}
                  onClick={() => setActiveTab(item)}
                  style={{
                    padding: "12px 14px",
                    marginBottom: 6,
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: active ? "#eff6ff" : "transparent",
                    color: active ? "#2563eb" : "#4b5563",
                    fontWeight: active ? 600 : 500,
                    border: active
                      ? "1px solid #bfdbfe"
                      : "1px solid transparent",
                  }}
                >
                  {item}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

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
            padding: "0 28px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {activeTab}
            </div>
          </div>

          <div
            style={{
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            Mahalaxmi Marble Industries
          </div>
        </header>

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}