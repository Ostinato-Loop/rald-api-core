import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import healthRoutes from "./routes/health";
import referralRoutes from "./routes/referrals";
import ecosystemRoutes from "./routes/ecosystem";
import agentRoutes from "./routes/agents";
import authRoutes from "./routes/auth";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  ENVIRONMENT: string;
  APP_VERSION: string;
  ISSUER_URL?: string;
  CLIENT_ID?: string;
  CLIENT_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: [
      "https://rald.cloud",
      "https://admin.rald.cloud",
      "https://control.rald.cloud",
      "https://sdk.rald.cloud",
      "http://localhost:5173",
      "http://localhost:24793",
    ],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 600,
  })
);

/* ── ROUTES ────────────────────────────────────────────────────────────── */

app.route("/health", healthRoutes);
app.route("/ready", healthRoutes);
app.route("/api/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/referrals", referralRoutes);
app.route("/api/ecosystem", ecosystemRoutes);
app.route("/api/agents", agentRoutes);

/* ── TOP-LEVEL ALIASES ─────────────────────────────────────────────────── */

const versionHandler = (c: any) =>
  c.json({
    version: c.env.APP_VERSION ?? "1.0.0",
    environment: c.env.ENVIRONMENT ?? "production",
    service: "rald-api",
    built: "RALD.cloud · Operated by LILCKY STUDIO LIMITED",
    timestamp: new Date().toISOString(),
  });

const metricsHandler = (c: any) =>
  c.text(
    [
      "# RALD API Metrics",
      `rald_api_up{env="${c.env.ENVIRONMENT ?? "production"}"} 1`,
      `rald_api_version{version="${c.env.APP_VERSION ?? "1.0.0"}"} 1`,
    ].join("\n"),
    200,
    { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" }
  );

app.get("/version", versionHandler);
app.get("/api/version", versionHandler);
app.get("/metrics", metricsHandler);
app.get("/api/metrics", metricsHandler);

app.get("/", (c) => {
  return c.json({
    service: "RALD API",
    version: c.env.APP_VERSION ?? "1.0.0",
    environment: c.env.ENVIRONMENT ?? "production",
    timestamp: new Date().toISOString(),
    docs: "https://api.rald.cloud/api/health",
  });
});

/* ── FALLBACKS ─────────────────────────────────────────────────────────── */

app.notFound((c) =>
  c.json({ error: "not_found", path: c.req.path }, 404)
);

app.onError((err, c) => {
  console.error("[RALD API Error]", err);
  return c.json({ error: "internal_error", message: "Something went wrong" }, 500);
});

export default app;
