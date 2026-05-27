import { Router } from "express";
import { db } from "@workspace/db";
import { referralCodesTable, referralsTable, waitlistTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function generateCode(prefix = "RALD"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix + "-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getOrCreateCode(email: string, name: string, productSlug: string): Promise<string> {
  const existing = await db.select().from(referralCodesTable)
    .where(eq(referralCodesTable.referrerEmail, email)).limit(1);
  if (existing.length > 0) return existing[0].code;
  const code = generateCode();
  await db.insert(referralCodesTable).values({
    id: randomUUID(), code, referrerName: name, referrerEmail: email,
    productSlug, uses: 0, maxUses: 100, reward: "3_months_free", active: true,
  });
  return code;
}

router.get("/", async (req, res) => {
  const codes = await db.select().from(referralCodesTable).orderBy(desc(referralCodesTable.createdAt)).limit(50);
  res.json(codes);
});

router.post("/generate", async (req, res) => {
  const { email, name, productSlug } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  const code = await getOrCreateCode(email, name ?? "", productSlug ?? "all");
  const record = await db.select().from(referralCodesTable).where(eq(referralCodesTable.code, code)).limit(1);
  res.json(record[0]);
});

router.get("/code/:code", async (req, res) => {
  const { code } = req.params;
  const record = await db.select().from(referralCodesTable).where(eq(referralCodesTable.code, code)).limit(1);
  if (!record.length) return res.status(404).json({ error: "Code not found" });
  const referrals = await db.select().from(referralsTable).where(eq(referralsTable.code, code));
  const converted = referrals.filter(r => r.status === "converted").length;
  res.json({ ...record[0], totalReferrals: referrals.length, converted, pending: referrals.length - converted });
});

router.post("/join", async (req, res) => {
  const { code, email, name, productSlug } = req.body;
  if (!code || !email) return res.status(400).json({ error: "code and email required" });

  const codeRecord = await db.select().from(referralCodesTable).where(eq(referralCodesTable.code, code)).limit(1);
  if (!codeRecord.length) return res.status(404).json({ error: "Invalid referral code" });
  if (!codeRecord[0].active) return res.status(400).json({ error: "Referral code is no longer active" });
  if (codeRecord[0].uses >= codeRecord[0].maxUses) return res.status(400).json({ error: "Referral code exhausted" });

  const existingReferral = await db.select().from(referralsTable).where(eq(referralsTable.referredEmail, email)).limit(1);
  if (existingReferral.length > 0) return res.status(409).json({ error: "Email already referred" });

  const referral = await db.insert(referralsTable).values({
    id: randomUUID(), code, referrerEmail: codeRecord[0].referrerEmail,
    referredEmail: email, referredName: name ?? "", productSlug: productSlug ?? codeRecord[0].productSlug,
    status: "pending", rewardType: codeRecord[0].reward,
  }).returning();

  await db.update(referralCodesTable).set({ uses: sql`${referralCodesTable.uses} + 1`, updatedAt: new Date() })
    .where(eq(referralCodesTable.code, code));

  res.json({ referral: referral[0], reward: codeRecord[0].reward, message: "Referral registered successfully" });
});

router.post("/waitlist", async (req, res) => {
  const { email, name, productSlug, referralCode } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const count = await db.select({ count: sql<number>`count(*)` }).from(waitlistTable);
  const position = (Number(count[0].count) ?? 0) + 1;

  const existing = await db.select().from(waitlistTable).where(eq(waitlistTable.email, email)).limit(1);
  if (existing.length > 0) return res.json({ ...existing[0], alreadyJoined: true });

  let myReferralCode: string | null = null;
  if (referralCode) {
    const codeRecord = await db.select().from(referralCodesTable).where(eq(referralCodesTable.code, referralCode)).limit(1);
    if (codeRecord.length > 0 && codeRecord[0].active) {
      await db.insert(referralsTable).values({
        id: randomUUID(), code: referralCode, referrerEmail: codeRecord[0].referrerEmail,
        referredEmail: email, referredName: name ?? "", productSlug: productSlug ?? "all",
        status: "pending", rewardType: codeRecord[0].reward,
      }).onConflictDoNothing();
      await db.update(referralCodesTable).set({ uses: sql`${referralCodesTable.uses} + 1`, updatedAt: new Date() })
        .where(eq(referralCodesTable.code, referralCode));
    }
  }

  myReferralCode = await getOrCreateCode(email, name ?? "", productSlug ?? "all");

  const entry = await db.insert(waitlistTable).values({
    id: randomUUID(), email, name: name ?? "", productSlug: productSlug ?? "all",
    referralCode: referralCode ?? null, position,
  }).returning();

  res.json({ ...entry[0], myReferralCode, message: `You're #${position} on the waitlist!` });
});

router.get("/waitlist/stats", async (req, res) => {
  const total = await db.select({ count: sql<number>`count(*)` }).from(waitlistTable);
  const byProduct = await db.select({ productSlug: waitlistTable.productSlug, count: sql<number>`count(*)` })
    .from(waitlistTable).groupBy(waitlistTable.productSlug);
  const totalReferrals = await db.select({ count: sql<number>`count(*)` }).from(referralsTable);
  res.json({ totalWaitlist: Number(total[0].count), byProduct, totalReferrals: Number(totalReferrals[0].count) });
});

router.post("/convert/:id", async (req, res) => {
  const { id } = req.params;
  const updated = await db.update(referralsTable)
    .set({ status: "converted", convertedAt: new Date() })
    .where(eq(referralsTable.id, id)).returning();
  if (!updated.length) return res.status(404).json({ error: "Referral not found" });
  res.json(updated[0]);
});

export default router;
