import { Router } from "express";
import { db } from "@workspace/db";
import { agentActivitiesTable } from "@workspace/db";

const router = Router();

const RALD_AGENTS = [
  { id: "atlas", name: "Atlas", role: "Infrastructure & deployment orchestration", description: "Manages Cloudflare deployments, GitHub sync, and infrastructure health across all RALD services" },
  { id: "sentinel", name: "Sentinel", role: "Security & threat detection", description: "Monitors repos for secret leaks, dependency vulnerabilities, and anomalous access patterns" },
  { id: "nova", name: "Nova", role: "Analytics & insights generation", description: "Processes Raldtics data, generates merchant insights, and powers the self-expansion recommendations" },
  { id: "forge", name: "Forge", role: "Code generation & SDK maintenance", description: "Keeps RALD SDKs up to date, generates boilerplate, and maintains API compatibility" },
  { id: "echo", name: "Echo", role: "Communications & notifications", description: "Routes messages across TERMII, email, and push channels. Manages Loop Voice SIP routing" },
  { id: "pulse", name: "Pulse", role: "Payments & logistics routing", description: "Optimizes payment provider selection and dispatch routing based on real-time success rates" },
  { id: "lee", name: "Lee", role: "Memory & context management", description: "Maintains shared agent memory, cross-repo context, and incident history for the AI layer" },
];

const SAMPLE_ACTIVITIES = [
  { agentName: "Atlas", action: "Deployed loop-dispatch Worker", detail: "Cloudflare Worker rald-dispatch-v2 deployed to dispatch.rald.cloud", status: "success" },
  { agentName: "Sentinel", action: "Secret scan completed", detail: "Scanned 54 repos — 0 exposed secrets found", status: "success" },
  { agentName: "Nova", action: "Expansion recommendation generated", detail: "Enugu and Onitsha flagged as high-priority expansion targets (38% MoM growth)", status: "success" },
  { agentName: "Pulse", action: "Payment routing updated", detail: "Paystack deprioritized for card transactions — Flutterwave success rate 97.2%", status: "success" },
  { agentName: "Forge", action: "SDK types regenerated", detail: "rald-sdk-payments v1.4.2 types synced from OpenAPI spec", status: "success" },
  { agentName: "Echo", action: "TERMII credentials validated", detail: "SMS provider health check passed — 99.1% delivery rate", status: "success" },
  { agentName: "Lee", action: "Context snapshot saved", detail: "Agent memory snapshot for 54 repos committed to rald-ai-memory", status: "success" },
  { agentName: "Atlas", action: "CI workflow synced", detail: "GitHub Actions CI pushed to 7 repos — all green", status: "success" },
  { agentName: "Sentinel", action: "Dependency audit", detail: "3 moderate vulnerabilities found in loop-core — PRs opened automatically", status: "success" },
  { agentName: "Nova", action: "Weekly analytics summary", detail: "₦47.8M processed, 14.3K transactions, 24% MoM growth", status: "success" },
];

async function ensureActivities() {
  const existing = await db.select({ id: agentActivitiesTable.id }).from(agentActivitiesTable).limit(1);
  if (existing.length > 0) return;
  const { randomUUID } = await import("crypto");
  for (let i = 0; i < SAMPLE_ACTIVITIES.length; i++) {
    const a = SAMPLE_ACTIVITIES[i];
    await db.insert(agentActivitiesTable).values({
      id: randomUUID(),
      agentName: a.agentName,
      action: a.action,
      detail: a.detail,
      status: a.status,
      timestamp: new Date(Date.now() - i * 1000 * 60 * 30),
    });
  }
}

router.get("/", (_req, res) => {
  const agents = RALD_AGENTS.map(a => ({
    ...a,
    status: "active" as const,
    tasksToday: Math.floor(Math.random() * 24) + 1,
    lastAction: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  }));
  res.json(agents);
});

router.get("/activity", async (_req, res) => {
  try {
    await ensureActivities();
    const activities = await db.select().from(agentActivitiesTable).orderBy(agentActivitiesTable.timestamp);
    res.json(activities.reverse().map(a => ({
      id: a.id, agentName: a.agentName, action: a.action, detail: a.detail,
      timestamp: a.timestamp.toISOString(), status: a.status as any,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
