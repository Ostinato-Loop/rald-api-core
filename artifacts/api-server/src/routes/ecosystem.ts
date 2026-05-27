import { Router } from "express";

const router = Router();

const RALD_SERVICES = [
  { id: "loop", name: "Loop Business", slug: "loop", domain: "loop.rald.cloud", description: "Commerce & storefronts platform", category: "Commerce", repoUrl: "https://github.com/Ostinato-Loop/loop" },
  { id: "payrald", name: "PayRald", slug: "payrald", domain: "payrald.rald.cloud", description: "Payments & wallet infrastructure", category: "Finance", repoUrl: "https://github.com/Ostinato-Loop/payrald" },
  { id: "raldtics", name: "Raldtics", slug: "raldtics", domain: "raldtics.rald.cloud", description: "Analytics & merchant intelligence", category: "Intelligence", repoUrl: "https://github.com/Ostinato-Loop/raldtics" },
  { id: "dispatch", name: "Loop Dispatch", slug: "loop-dispatch", domain: "dispatch.rald.cloud", description: "Nigerian last-mile logistics aggregator", category: "Logistics", repoUrl: "https://github.com/Ostinato-Loop/loop-dispatch" },
  { id: "voice", name: "Loop Voice", slug: "loop-voice", domain: "voice.rald.cloud", description: "SIP & communications gateway", category: "Communications", repoUrl: "https://github.com/Ostinato-Loop/loop-voice" },
  { id: "identity", name: "RALD Identity", slug: "rald-identity", domain: "identity.rald.cloud", description: "Unified customer profiles & SSO", category: "Identity", repoUrl: "https://github.com/Ostinato-Loop/rald-identity" },
  { id: "gitrald", name: "GitRald", slug: "gitrald-core", domain: "gitrald.rald.cloud", description: "CI/CD & repo orchestration", category: "Infrastructure", repoUrl: "https://github.com/Ostinato-Loop/gitrald-core" },
  { id: "sdk", name: "RALD SDK", slug: "rald-shared-sdk", domain: "sdk.rald.cloud", description: "Developer SDKs & integrations", category: "Developer", repoUrl: "https://github.com/Ostinato-Loop/rald-shared-sdk" },
  { id: "control", name: "RALD Control Center", slug: "rald-control-center", domain: "admin.rald.cloud", description: "Unified admin command plane", category: "Platform", repoUrl: "https://github.com/Ostinato-Loop/rald-control-center" },
  { id: "observability", name: "RALD Observability", slug: "rald-observability", domain: "status.rald.cloud", description: "Metrics, tracing & status", category: "Infrastructure", repoUrl: "https://github.com/Ostinato-Loop/rald-observability" },
  { id: "ai", name: "RALD AI", slug: "rald-ai", domain: "ai.rald.cloud", description: "AI agents & memory orchestration", category: "AI", repoUrl: "https://github.com/Ostinato-Loop/rald-ai" },
  { id: "docs", name: "RALD Docs", slug: "rald-docs", domain: "docs.rald.cloud", description: "Documentation portal", category: "Developer", repoUrl: "https://github.com/Ostinato-Loop/rald-docs" },
];

router.get("/services", (_req, res) => {
  const services = RALD_SERVICES.map(s => ({
    ...s,
    status: "healthy" as const,
    cfProject: s.slug,
    lastDeploy: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
  }));
  res.json(services);
});

router.get("/summary", (_req, res) => {
  res.json({
    total: RALD_SERVICES.length,
    healthy: RALD_SERVICES.length - 1,
    degraded: 1,
    down: 0,
    totalRepos: 54,
    greenRepos: 47,
    cfPages: 9,
    cfWorkers: 6,
  });
});

export default router;
