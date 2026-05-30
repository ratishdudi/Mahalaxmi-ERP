import { useState } from "react";
import Layout from "./components/Layout";
import AdminDashboard from "./components/AdminDashboard";
import AiAssistant from "./components/AiAssistant";
import BlockInward from "./components/BlockInward";
import MachineSession from "./components/MachineSession";
import YardView from "./components/YardView";
import FinishedStock from "./components/FinishedStock";
import SalesEntry from "./components/SalesEntry";
import MonthlyCosts from "./components/MonthlyCosts";
import BreakEven from "./components/BreakEven";

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard": return <AdminDashboard />;
      case "Parties": return <div>Party Manager Coming Soon...</div>;
      case "Inventory": return <BlockInward />;
      case "Machines": return <MachineSession />;
      case "Yard": return <YardView />;
      case "Finished": return <FinishedStock />;
      case "Sales": return <SalesEntry />;
      case "Expenses": return <MonthlyCosts />;
      case "Break-Even": return <BreakEven />;
      case "AI Assistant": return <AiAssistant />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}