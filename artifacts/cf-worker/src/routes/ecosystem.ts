import { Hono } from "hono";
import type { Env } from "../index";

const app = new Hono<{ Bindings: Env }>();

const PRODUCTS = [
  { id: "loop",      name: "Loop Business",  status: "operational", accent: "#00C97C" },
  { id: "payrald",   name: "PayRald",         status: "operational", accent: "#38bdf8" },
  { id: "raldtics",  name: "Raldtics",        status: "operational", accent: "#a78bfa" },
  { id: "dispatch",  name: "Loop Dispatch",   status: "operational", accent: "#fb923c" },
  { id: "voice",     name: "Loop Voice",      status: "operational", accent: "#f472b6" },
  { id: "identity",  name: "RALD Identity",   status: "operational", accent: "#22d3ee" },
  { id: "gitrald",   name: "GitRald",         status: "operational", accent: "#818cf8" },
  { id: "sdk",       name: "RALD SDK",        status: "operational", accent: "#fbbf24" },
  { id: "console",   name: "Control Center",  status: "operational", accent: "#e2e8f0" },
  { id: "messenger", name: "Loop Messenger",  status: "operational", accent: "#34d399" },
  { id: "dunarald",  name: "DunaRald",        status: "operational", accent: "#f97316" },
];

app.get("/", (c) =>
  c.json({
    ecosystem: "RALD.cloud",
    products: PRODUCTS,
    total: PRODUCTS.length,
    operatedBy: "LILCKY STUDIO LIMITED",
    timestamp: new Date().toISOString(),
  })
);

app.get("/summary", (c) =>
  c.json({
    services: PRODUCTS.length,
    allOperational: PRODUCTS.every((p) => p.status === "operational"),
    products: PRODUCTS,
  })
);

export default app;
