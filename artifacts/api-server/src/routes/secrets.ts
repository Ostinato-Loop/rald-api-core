import { Router } from "express";
import { db } from "@workspace/db";
import { managedSecretsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function maskValue(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function simpleEncrypt(value: string): string {
  return Buffer.from(value).toString("base64");
}

function getStatus(expiresAt: Date | null): "active" | "expiring_soon" | "expired" {
  if (!expiresAt) return "active";
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  if (diff < 0) return "expired";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "expiring_soon";
  return "active";
}

router.get("/", async (_req, res) => {
  try {
    const secrets = await db.select().from(managedSecretsTable).orderBy(managedSecretsTable.createdAt);
    res.json(secrets.map(s => ({
      id: s.id, service: s.service, label: s.label,
      maskedValue: s.maskedValue, rotatedAt: s.rotatedAt.toISOString(),
      expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
      status: getStatus(s.expiresAt),
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { service, label, value, expiresAt } = req.body;
    const existing = await db.select().from(managedSecretsTable)
      .where(eq(managedSecretsTable.service, service)).limit(1);

    const secretData = {
      service, label,
      maskedValue: maskValue(value),
      encryptedValue: simpleEncrypt(value),
      rotatedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: "active",
    };

    let result;
    if (existing.length > 0 && existing[0].service === service) {
      await db.update(managedSecretsTable).set(secretData).where(eq(managedSecretsTable.service, service));
      result = { ...existing[0], ...secretData };
    } else {
      const id = randomUUID();
      await db.insert(managedSecretsTable).values({ id, ...secretData });
      result = { id, ...secretData, createdAt: new Date() };
    }

    res.json({
      id: result.id, service: result.service, label: result.label,
      maskedValue: result.maskedValue, rotatedAt: result.rotatedAt.toISOString(),
      expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null,
      status: getStatus(result.expiresAt),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(managedSecretsTable).where(eq(managedSecretsTable.id, req.params.id));
    res.json({ id: req.params.id, deleted: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
