import React, { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Console from "./components/Console.jsx";
import Skills from "./components/Skills.jsx";
import Agents from "./components/Agents.jsx";
import Connections from "./components/Connections.jsx";

export default function App() {
  const [page, setPage] = useState("console");
  // Skills can hand a filled prompt to the Console.
  const [consoleSeed, setConsoleSeed] = useState(null);

  const openInConsole = (seed) => {
    setConsoleSeed({ ...seed, _ts: Date.now() });
    setPage("console");
  };

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="main">
        {page === "console" && <Console seed={consoleSeed} />}
        {page === "skills" && <Skills openInConsole={openInConsole} />}
        {page === "agents" && <Agents />}
        {page === "connections" && <Connections />}
      </main>
    </div>
  );
}
