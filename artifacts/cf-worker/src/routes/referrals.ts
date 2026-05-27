import { Hono } from "hono";
import type { Env } from "../index";

const app = new Hono<{ Bindings: Env }>();

function getSupabase(env: Env) {
  // Dynamic import for CF Workers compatibility
  const { createClient } = require("@supabase/supabase-js");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/* ── POST /api/referrals/generate ─────────────────────────────────────── */

app.post("/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = body.userId ?? crypto.randomUUID();
  const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(36).toUpperCase().padStart(2, "0"))
    .join("")
    .slice(0, 8);

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await sb
      .from("referral_codes")
      .insert({ user_id: userId, code, max_uses: 10 })
      .select()
      .single();
    if (error) throw error;
    return c.json({ code: data.code, userId });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/* ── POST /api/referrals/join ──────────────────────────────────────────── */

app.post("/join", async (c) => {
  const { code, refereeId } = await c.req.json().catch(() => ({} as any));
  if (!code) return c.json({ error: "code required" }, 400);

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: rc } = await sb
      .from("referral_codes")
      .select("*")
      .eq("code", code)
      .single();
    if (!rc) return c.json({ error: "Invalid referral code" }, 404);

    const { data: referral } = await sb
      .from("referrals")
      .insert({ referral_code_id: rc.id, referee_id: refereeId ?? crypto.randomUUID(), status: "pending" })
      .select()
      .single();

    return c.json({ ok: true, referral });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/* ── POST /api/referrals/waitlist ──────────────────────────────────────── */

app.post("/waitlist", async (c) => {
  const { email, name, product, referralCode } = await c.req.json().catch(() => ({} as any));
  if (!email) return c.json({ error: "email required" }, 400);

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await sb
      .from("waitlist")
      .insert({ email, name, product: product ?? "rald.cloud", referral_code: referralCode })
      .select()
      .single();
    if (error && error.code === "23505")
      return c.json({ ok: true, message: "Already on waitlist" });
    if (error) throw error;
    return c.json({ ok: true, entry: data });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/* ── GET /api/referrals/code/:code ────────────────────────────────────── */

app.get("/code/:code", async (c) => {
  const code = c.req.param("code");
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await sb
      .from("referral_codes")
      .select("*, referrals(count)")
      .eq("code", code)
      .single();
    if (!data) return c.json({ error: "Not found" }, 404);
    return c.json(data);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/* ── GET /api/referrals/waitlist/stats ─────────────────────────────────── */

app.get("/waitlist/stats", async (c) => {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
    const { count } = await sb.from("waitlist").select("*", { count: "exact", head: true });
    return c.json({ total: count ?? 0 });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default app;
