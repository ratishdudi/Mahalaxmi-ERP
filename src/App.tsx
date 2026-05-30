import { useState } from "react";
import Layout from "./components/Layout";

// --- IMPORT ALL YOUR SCREENS HERE ---
import AdminDashboard from "./components/AdminDashboard";
import BlockInward from "./components/BlockInward";
import YardView from "./components/YardView";
import MachineSession from "./components/MachineSession";
import FinishedStock from "./components/FinishedStock";
import SalesEntry from "./components/SalesEntry";
import MonthlyCosts from "./components/MonthlyCosts";
import BreakEven from "./components/BreakEven";

export default function App() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {(() => {
        switch (activeTab) {
          // DASHBOARD
          case "Overview": 
            return <AdminDashboard />;
          
          // OPERATIONS
          case "Block Inward": 
            return <BlockInward />;
          case "Yard Stock": 
            return <YardView />;
          case "Production": 
            return <MachineSession />;
          case "Finished Stock": 
            return <FinishedStock />;
          
          // SALES
          case "Sales": 
            return <SalesEntry />;
          case "Parties": 
            return (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                <h2 style={{ color: "#111827" }}>👥 Party Ledger</h2>
                <p>This module is currently being built...</p>
              </div>
            );
          
          // ACCOUNTS
          case "Expenses": 
            return <MonthlyCosts />;
          case "Profitability": 
            return <BreakEven />;
          
          // FALLBACK
          default: 
            return <AdminDashboard />;
        }
      })()}
    </Layout>
  );
}