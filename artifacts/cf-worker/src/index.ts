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

/* ── GLOBAL MIDDLEWARE ─────────────────────────────────────────────────── */

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
      // Dev
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

/* ── ROOT ──────────────────────────────────────────────────────────────── */

app.get("/", (c) => {
  return c.json({
    service: "RALD API",
    version: c.env.APP_VERSION ?? "1.0.0",
    environment: c.env.ENVIRONMENT ?? "production",
    timestamp: new Date().toISOString(),
    docs: "https://api.rald.cloud/api/health",
  });
});

app.get("/version", (c) =>
  c.json({
    version: c.env.APP_VERSION ?? "1.0.0",
    environment: c.env.ENVIRONMENT ?? "production",
    built: "RALD.cloud · Operated by LILCKY STUDIO LIMITED",
  })
);

/* ── 404 ───────────────────────────────────────────────────────────────── */

app.notFound((c) =>
  c.json({ error: "not_found", path: c.req.path }, 404)
);

app.onError((err, c) => {
  console.error("[RALD API Error]", err);
  return c.json({ error: "internal_error", message: "Something went wrong" }, 500);
});

export default app;
