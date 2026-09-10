import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import SendInvoice from "./pages/SendInvoice.jsx";
import InvoiceHistory from "./pages/InvoiceHistory.jsx";
import Configuration from "./pages/Configuration.jsx";
import About from "./pages/About.jsx";

// Application opens directly to Dashboard — no auth.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/send" element={<SendInvoice />} />
      <Route path="/history" element={<InvoiceHistory />} />
      <Route path="/configuration" element={<Configuration />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
