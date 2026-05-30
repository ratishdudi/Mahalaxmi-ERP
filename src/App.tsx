import { useState } from "react";
import Layout from "./components/Layout";
import BlockInward from "./components/BlockInward";
import MachineSession from "./components/MachineSession";
import YardView from "./components/YardView";
import FinishedStock from "./components/FinishedStock";
import SalesEntry from "./components/SalesEntry";
import Parties from "./components/Parties";
import AiAssistant from "./components/AiAssistant";
import MonthlyCosts from "./components/MonthlyCosts";
import BreakEven from "./components/BreakEven";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "Dashboard"   && <AdminDashboard />}
      {activeTab === "Inventory"   && <BlockInward />}
      {activeTab === "Yard"        && <YardView />}
      {activeTab === "Machines"    && <MachineSession />}
      {activeTab === "Finished"    && <FinishedStock />}
      {activeTab === "Sales"       && <SalesEntry />}
      {activeTab === "Parties"     && <Parties />}
      {activeTab === "Expenses"    && <MonthlyCosts />}
      {activeTab === "Break-Even"  && <BreakEven />}
      {activeTab === "AI Assistant" && <AiAssistant />}
    </Layout>
  );
}
