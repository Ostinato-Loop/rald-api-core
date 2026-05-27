import { Hono } from "hono";
import type { Env } from "../index";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "rald-api",
    version: c.env.APP_VERSION ?? "1.0.0",
    environment: c.env.ENVIRONMENT ?? "production",
    timestamp: new Date().toISOString(),
  })
);

app.get("/healthz", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.get("/ready", (c) =>
  c.json({
    ready: true,
    checks: { supabase: !!c.env.SUPABASE_URL, worker: true },
  })
);

app.get("/metrics", (c) =>
  c.text(
    [
      "# RALD API Metrics",
      `rald_api_up{env="${c.env.ENVIRONMENT ?? "production"}"} 1`,
      `rald_api_version{version="${c.env.APP_VERSION ?? "1.0.0"}"} 1`,
    ].join("\n")
  )
);

export default app;
