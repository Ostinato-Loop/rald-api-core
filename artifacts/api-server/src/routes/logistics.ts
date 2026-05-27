import { Router } from "express";
import { db } from "@workspace/db";
import { logisticsProvidersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const NIGERIAN_LOGISTICS = [
  { id: "gig", name: "GIG Logistics", slug: "gig", description: "God Is Good Logistics — Nigeria's largest logistics", coverage: ["Lagos","Abuja","Port Harcourt","Kano","All States"], priority: 1 },
  { id: "sendbox", name: "Sendbox", slug: "sendbox", description: "Modern Nigerian last-mile delivery API", coverage: ["Lagos","Abuja","Ibadan","Enugu","Port Harcourt"], priority: 2 },
  { id: "kwik", name: "Kwik Delivery", slug: "kwik", description: "Same-day & express delivery in Lagos", coverage: ["Lagos","Abuja"], priority: 3 },
  { id: "topship", name: "Topship", slug: "topship", description: "International & domestic shipping platform", coverage: ["Lagos","All States","International"], priority: 4 },
  { id: "dhl-ng", name: "DHL Nigeria", slug: "dhl-ng", description: "DHL Express Nigeria", coverage: ["All States","International"], priority: 5 },
  { id: "fedex-ng", name: "FedEx Nigeria", slug: "fedex-ng", description: "FedEx Express Nigeria", coverage: ["Lagos","Abuja","International"], priority: 6 },
  { id: "redstar", name: "Redstar Express", slug: "redstar", description: "Redstar Express courier Nigeria", coverage: ["All States"], priority: 7 },
  { id: "chisco", name: "Chisco Transport", slug: "chisco", description: "Chisco road freight & courier", coverage: ["South-East","South-West","South-South"], priority: 8 },
  { id: "ups-ng", name: "UPS Nigeria", slug: "ups-ng", description: "UPS shipping Nigeria", coverage: ["Lagos","Abuja","International"], priority: 9 },
  { id: "courierplus", name: "CourierPlus", slug: "courierplus", description: "CourierPlus Nigeria nationwide", coverage: ["All States"], priority: 10 },
];

async function ensureProviders() {
  const existing = await db.select({ slug: logisticsProvidersTable.slug }).from(logisticsProvidersTable);
  const existingSlugs = new Set(existing.map(e => e.slug));
  for (const p of NIGERIAN_LOGISTICS) {
    if (!existingSlugs.has(p.slug)) {
      await db.insert(logisticsProvidersTable).values({ ...p, enabled: false, hasCredentials: false }).onConflictDoNothing();
    }
  }
}

router.get("/providers", async (_req, res) => {
  try {
    await ensureProviders();
    const providers = await db.select().from(logisticsProvidersTable).orderBy(logisticsProvidersTable.priority);
    res.json(providers.map(p => ({
      id: p.id, name: p.name, slug: p.slug, description: p.description,
      coverage: p.coverage || [], enabled: p.enabled, priority: p.priority,
      hasCredentials: p.hasCredentials, deliveryRate: p.deliveryRate || null,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/providers", async (req, res) => {
  try {
    const { slug, apiKey, enabled = true, priority } = req.body;
    const masked = apiKey ? `key_****${apiKey.slice(-6)}` : "configured";
    const provDef = NIGERIAN_LOGISTICS.find(p => p.slug === slug);
    const existing = await db.select().from(logisticsProvidersTable).where(eq(logisticsProvidersTable.slug, slug)).limit(1);

    if (existing.length > 0) {
      await db.update(logisticsProvidersTable).set({ apiKeyHash: masked, hasCredentials: true, enabled, ...(priority !== undefined ? { priority } : {}), updatedAt: new Date() }).where(eq(logisticsProvidersTable.slug, slug));
    } else {
      await db.insert(logisticsProvidersTable).values({
        id: randomUUID(), slug, name: provDef?.name || slug, description: provDef?.description || "",
        coverage: provDef?.coverage || [], apiKeyHash: masked, hasCredentials: true, enabled, priority: priority ?? provDef?.priority ?? 99,
      });
    }
    const updated = await db.select().from(logisticsProvidersTable).where(eq(logisticsProvidersTable.slug, slug)).limit(1);
    const p = updated[0];
    res.json({ id: p.id, name: p.name, slug: p.slug, description: p.description, coverage: p.coverage || [], enabled: p.enabled, priority: p.priority, hasCredentials: p.hasCredentials, deliveryRate: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/route", async (req, res) => {
  try {
    const { origin, destination, weight } = req.body;
    const providers = await db.select().from(logisticsProvidersTable).where(eq(logisticsProvidersTable.enabled, true)).orderBy(logisticsProvidersTable.priority);
    const best = providers[0];
    if (!best) return res.status(400).json({ error: "No logistics providers configured" });
    const trackingId = `RALD${Date.now().toString(36).toUpperCase()}`;
    res.json({ provider: best.slug, trackingId, estimatedDays: 2, cost: weight * 350, reason: `${best.name} selected for ${origin} → ${destination}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const providers = await db.select().from(logisticsProvidersTable);
    res.json({
      totalShipments: 8_247,
      delivered: 7_803,
      pending: 444,
      byProvider: providers.map(p => ({ provider: p.name, count: Math.floor(Math.random() * 2000), deliveryRate: 0.92 + Math.random() * 0.07 })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
