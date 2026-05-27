import { Router } from "express";
import { db } from "@workspace/db";
import { regionsTable } from "@workspace/db";

const router = Router();

const SEED_REGIONS = [
  { id: "lagos", name: "Lagos", country: "Nigeria", state: "Lagos", revenue: 18_400_000, transactions: 5_820, growth: 0.23, activeMerchants: 847, profitScore: 94, expandable: false },
  { id: "abuja", name: "Abuja", country: "Nigeria", state: "FCT", revenue: 9_200_000, transactions: 2_940, growth: 0.31, activeMerchants: 412, profitScore: 87, expandable: false },
  { id: "port-harcourt", name: "Port Harcourt", country: "Nigeria", state: "Rivers", revenue: 5_100_000, transactions: 1_630, growth: 0.18, activeMerchants: 234, profitScore: 72, expandable: true },
  { id: "kano", name: "Kano", country: "Nigeria", state: "Kano", revenue: 3_800_000, transactions: 1_210, growth: 0.29, activeMerchants: 178, profitScore: 68, expandable: true },
  { id: "ibadan", name: "Ibadan", country: "Nigeria", state: "Oyo", revenue: 2_900_000, transactions: 924, growth: 0.22, activeMerchants: 145, profitScore: 61, expandable: true },
  { id: "enugu", name: "Enugu", country: "Nigeria", state: "Enugu", revenue: 1_800_000, transactions: 573, growth: 0.34, activeMerchants: 89, profitScore: 55, expandable: true },
  { id: "kaduna", name: "Kaduna", country: "Nigeria", state: "Kaduna", revenue: 1_600_000, transactions: 510, growth: 0.27, activeMerchants: 76, profitScore: 52, expandable: true },
  { id: "benin", name: "Benin City", country: "Nigeria", state: "Edo", revenue: 1_400_000, transactions: 447, growth: 0.19, activeMerchants: 68, profitScore: 48, expandable: true },
  { id: "warri", name: "Warri", country: "Nigeria", state: "Delta", revenue: 1_100_000, transactions: 351, growth: 0.21, activeMerchants: 54, profitScore: 44, expandable: true },
  { id: "onitsha", name: "Onitsha", country: "Nigeria", state: "Anambra", revenue: 980_000, transactions: 312, growth: 0.38, activeMerchants: 47, profitScore: 42, expandable: true },
  { id: "accra", name: "Accra", country: "Ghana", state: "Greater Accra", revenue: 420_000, transactions: 134, growth: 0.15, activeMerchants: 12, profitScore: 28, expandable: true },
  { id: "nairobi", name: "Nairobi", country: "Kenya", state: "Nairobi County", revenue: 280_000, transactions: 89, growth: 0.12, activeMerchants: 8, profitScore: 22, expandable: true },
];

async function ensureRegions() {
  const existing = await db.select({ id: regionsTable.id }).from(regionsTable);
  if (existing.length > 0) return;
  for (const r of SEED_REGIONS) {
    await db.insert(regionsTable).values(r).onConflictDoNothing();
  }
}

router.get("/regions", async (_req, res) => {
  try {
    await ensureRegions();
    const regions = await db.select().from(regionsTable).orderBy(regionsTable.profitScore);
    res.json(regions.map(r => ({
      id: r.id, name: r.name, country: r.country, state: r.state,
      revenue: r.revenue, transactions: r.transactions, growth: r.growth,
      activemerchants: r.activeMerchants, profitScore: r.profitScore, expandable: r.expandable,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/recommend", async (_req, res) => {
  try {
    await ensureRegions();
    const regions = await db.select().from(regionsTable).orderBy(regionsTable.growth);
    const expandable = regions.filter(r => r.expandable).slice(0, 5);
    res.json(expandable.map(r => ({
      region: r.name,
      score: r.profitScore,
      reason: `${(r.growth * 100).toFixed(0)}% MoM growth, ${r.activeMerchants} active merchants, strong ${r.state} market signals`,
      estimatedRevenue: Math.floor(r.revenue * (1 + r.growth) * 3),
      priority: r.profitScore > 60 ? "high" : r.profitScore > 45 ? "medium" : "low",
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/metrics", async (_req, res) => {
  try {
    await ensureRegions();
    const regions = await db.select().from(regionsTable);
    const totalRevenue = regions.reduce((s, r) => s + r.revenue, 0);
    const topRegion = regions.sort((a, b) => b.revenue - a.revenue)[0];
    const avgGrowth = regions.reduce((s, r) => s + r.growth, 0) / regions.length;
    res.json({
      totalRevenue,
      topRegion: topRegion?.name || "Lagos",
      avgGrowth,
      regionsExpanded: regions.filter(r => !r.expandable).length,
      monthlyGrowth: 0.24,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
