import { Hono } from "hono";
import type { Env } from "../index";

const app = new Hono<{ Bindings: Env }>();

const AGENTS = [
  { id: "atlas",    name: "Atlas",    role: "Expansion Intelligence", status: "active",  color: "#00C97C", tasks: "3 market scans/min" },
  { id: "sentinel", name: "Sentinel", role: "Security & Compliance",  status: "active",  color: "#22d3ee", tasks: "0 threats today" },
  { id: "nova",     name: "Nova",     role: "Payment Routing",        status: "active",  color: "#38bdf8", tasks: "12 routes optimised" },
  { id: "forge",    name: "Forge",    role: "DevOps Automation",      status: "active",  color: "#818cf8", tasks: "77 repos monitored" },
  { id: "echo",     name: "Echo",     role: "Communications Layer",   status: "idle",    color: "#f472b6", tasks: "Standby" },
  { id: "pulse",    name: "Pulse",    role: "Logistics Optimisation", status: "active",  color: "#fb923c", tasks: "24 routes active" },
  { id: "lee",      name: "Lee",      role: "AI Orchestrator",        status: "active",  color: "#fbbf24", tasks: "6 agents managed" },
];

app.get("/", (c) =>
  c.json({
    agents: AGENTS,
    total: AGENTS.length,
    active: AGENTS.filter((a) => a.status === "active").length,
    idle: AGENTS.filter((a) => a.status === "idle").length,
    timestamp: new Date().toISOString(),
  })
);

app.get("/:id", (c) => {
  const agent = AGENTS.find((a) => a.id === c.req.param("id"));
  if (!agent) return c.json({ error: "agent not found" }, 404);
  return c.json(agent);
});

export default app;
