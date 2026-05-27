import { Router } from "express";
import { db } from "@workspace/db";
import { paymentProvidersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const NIGERIAN_PROVIDERS = [
  { id: "paystack", name: "Paystack", slug: "paystack", description: "Nigeria's leading payment gateway by Stripe", features: ["cards", "bank_transfer", "ussd", "qr", "mobile_money"], priority: 1 },
  { id: "flutterwave", name: "Flutterwave", slug: "flutterwave", description: "Pan-African payments infrastructure", features: ["cards", "bank_transfer", "mobile_money", "barter", "ussd"], priority: 2 },
  { id: "monnify", name: "Monnify", slug: "monnify", description: "Moniepoint payment gateway — bank transfers & cards", features: ["cards", "bank_transfer", "ussd"], priority: 3 },
  { id: "budpay", name: "BudPay", slug: "budpay", description: "BudPay payment gateway — crypto & fiat", features: ["cards", "bank_transfer", "crypto"], priority: 4 },
  { id: "opay", name: "OPay", slug: "opay", description: "OPay fintech payment gateway", features: ["cards", "bank_transfer", "mobile_money", "ussd"], priority: 5 },
  { id: "remita", name: "Remita", slug: "remita", description: "Government & enterprise payments platform", features: ["cards", "bank_transfer", "direct_debit"], priority: 6 },
  { id: "interswitch", name: "Interswitch", slug: "interswitch", description: "Interswitch — Quickteller & webpay", features: ["cards", "ussd", "bank_transfer"], priority: 7 },
  { id: "nibsspay", name: "NIBSS Pay", slug: "nibsspay", description: "Nigeria Interbank Settlement System gateway", features: ["bank_transfer", "nip"], priority: 8 },
  { id: "kora", name: "Kora Pay", slug: "kora", description: "Kora — African payment infrastructure", features: ["cards", "bank_transfer", "mobile_money"], priority: 9 },
  { id: "pawapay", name: "PawaPay", slug: "pawapay", description: "Mobile money across Africa", features: ["mobile_money"], priority: 10 },
];

async function ensureProviders() {
  const existing = await db.select({ slug: paymentProvidersTable.slug }).from(paymentProvidersTable);
  const existingSlugs = new Set(existing.map(e => e.slug));
  for (const p of NIGERIAN_PROVIDERS) {
    if (!existingSlugs.has(p.slug)) {
      await db.insert(paymentProvidersTable).values({ ...p, enabled: false, hasCredentials: false }).onConflictDoNothing();
    }
  }
}

router.get("/providers", async (_req, res) => {
  try {
    await ensureProviders();
    const providers = await db.select().from(paymentProvidersTable).orderBy(paymentProvidersTable.priority);
    res.json(providers.map(p => ({
      id: p.id, name: p.name, slug: p.slug, description: p.description,
      features: p.features || [], enabled: p.enabled, priority: p.priority,
      hasCredentials: p.hasCredentials, successRate: p.successRate || null,
      lastChecked: p.lastChecked ? p.lastChecked.toISOString() : null,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/providers", async (req, res) => {
  try {
    const { slug, apiKey, secretKey, enabled = true, priority } = req.body;
    const masked = apiKey ? `sk_****${apiKey.slice(-6)}` : "configured";
    const existing = await db.select().from(paymentProvidersTable).where(eq(paymentProvidersTable.slug, slug)).limit(1);
    const providerDef = NIGERIAN_PROVIDERS.find(p => p.slug === slug);

    if (existing.length > 0) {
      await db.update(paymentProvidersTable).set({
        apiKeyHash: masked, hasCredentials: true, enabled,
        ...(priority !== undefined ? { priority } : {}),
        updatedAt: new Date(),
      }).where(eq(paymentProvidersTable.slug, slug));
    } else {
      await db.insert(paymentProvidersTable).values({
        id: randomUUID(), slug, name: providerDef?.name || slug,
        description: providerDef?.description || "", features: providerDef?.features || [],
        apiKeyHash: masked, hasCredentials: true, enabled,
        priority: priority ?? providerDef?.priority ?? 99,
      });
    }
    const updated = await db.select().from(paymentProvidersTable).where(eq(paymentProvidersTable.slug, slug)).limit(1);
    const p = updated[0];
    res.json({ id: p.id, name: p.name, slug: p.slug, description: p.description, features: p.features || [], enabled: p.enabled, priority: p.priority, hasCredentials: p.hasCredentials, successRate: p.successRate || null, lastChecked: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/route", async (req, res) => {
  try {
    const { amount, currency = "NGN", channel } = req.body;
    const providers = await db.select().from(paymentProvidersTable).where(eq(paymentProvidersTable.enabled, true)).orderBy(paymentProvidersTable.priority);
    const best = providers[0];
    if (!best) return res.status(400).json({ error: "No payment providers configured" });
    const reference = `RALD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    res.json({
      provider: best.slug,
      paymentUrl: `https://checkout.${best.slug}.com/pay?ref=${reference}&amount=${amount * 100}&currency=${currency}`,
      reference,
      reason: `${best.name} selected: priority ${best.priority}, enabled`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const providers = await db.select().from(paymentProvidersTable);
    res.json({
      totalVolume: 48_750_000,
      totalTransactions: 14_382,
      byProvider: providers.map(p => ({
        provider: p.name, volume: Math.floor(Math.random() * 10000000), count: Math.floor(Math.random() * 3000), successRate: 0.94 + Math.random() * 0.05,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
