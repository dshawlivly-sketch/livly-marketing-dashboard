import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SEED_SKILLS } from "./data/seedSkills.js";
import { fetchStatus } from "./lib/api.js";

const StoreContext = createContext(null);

function usePersisted(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full/unavailable — keep going in-memory */
    }
  }, [key, value]);
  return [value, setValue];
}

let runCounter = 0;
export function newId(prefix) {
  runCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${runCounter}`;
}

export function StoreProvider({ children }) {
  // Per-provider local overrides: { apiKey, baseUrl, generatePath }.
  // Stored in this browser only; sent only to your own /api proxy.
  const [overrides, setOverrides] = usePersisted("harness.overrides", {});
  const [skills, setSkills] = usePersisted("harness.skills", SEED_SKILLS);
  const [runs, setRuns] = usePersisted("harness.runs", []);
  const [modelCache, setModelCache] = usePersisted("harness.modelCache", {});
  const [testResults, setTestResults] = usePersisted("harness.testResults", {});
  const [serverStatus, setServerStatus] = useState(null);
  const runsRef = useRef(runs);
  runsRef.current = runs;

  const refreshStatus = useCallback(async () => {
    try {
      setServerStatus(await fetchStatus());
    } catch {
      setServerStatus(null);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const addRun = useCallback(
    (run) => {
      const full = {
        id: newId("run"),
        ts: Date.now(),
        status: "running",
        output: "",
        ...run,
      };
      setRuns((prev) => [full, ...prev].slice(0, 300));
      return full.id;
    },
    [setRuns]
  );

  const updateRun = useCallback(
    (id, patch) => {
      setRuns((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...(typeof patch === "function" ? patch(r) : patch) } : r))
      );
    },
    [setRuns]
  );

  const clearRuns = useCallback(() => setRuns([]), [setRuns]);

  // A provider counts as connected if the server has a key for it, a local
  // override exists, or its last connection test succeeded.
  const isConnected = useCallback(
    (provider) => {
      if (provider === "opendesign") {
        return Boolean(
          serverStatus?.opendesign?.configured || overrides.opendesign?.baseUrl
        );
      }
      return Boolean(
        serverStatus?.[provider]?.configured || overrides[provider]?.apiKey
      );
    },
    [serverStatus, overrides]
  );

  const value = {
    overrides,
    setOverrides,
    skills,
    setSkills,
    runs,
    addRun,
    updateRun,
    clearRuns,
    modelCache,
    setModelCache,
    testResults,
    setTestResults,
    serverStatus,
    refreshStatus,
    isConnected,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
