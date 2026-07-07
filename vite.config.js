import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Loads .env into process.env so the api/ handlers see keys during local dev
// (Vite only exposes env to the client bundle; the handlers run in Node).
function loadDotEnv(root) {
  const file = path.join(root, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

// Mounts the Vercel-style handlers in api/ onto the Vite dev server, so
// `npm run dev` runs the full stack locally — no `vercel dev` needed.
function localApi() {
  return {
    name: "local-api",
    configureServer(server) {
      loadDotEnv(server.config.root);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();
        const name = req.url.slice(5).split("?")[0].replace(/[^a-z0-9-]/gi, "");
        const file = path.join(server.config.root, "api", `${name}.js`);
        if (!fs.existsSync(file)) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          await mod.default(req, res);
        } catch (err) {
          console.error(`[api/${name}]`, err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
          }
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
});
