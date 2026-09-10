import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { crmApi, dashboardApi } from "../services/api";

// Global app state: clients (live from CRM) + system status.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [status, setStatus] = useState(null);

  const loadClients = useCallback(async (refresh = false) => {
    setClientsLoading(true);
    try {
      const data = await crmApi.clients(refresh);
      setClients(data.clients || []);
      setLastSync(data.last_sync || null);
      return data.clients || [];
    } catch (e) {
      return [];
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const s = await dashboardApi.status();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    loadClients(false);
    loadStatus();
    // Auto refresh clients every 30 minutes on the client side too.
    const t = setInterval(() => loadClients(true), 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadClients, loadStatus]);

  const value = {
    clients,
    clientsLoading,
    lastSync,
    status,
    loadClients,
    loadStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
