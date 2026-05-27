import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "../index";

const app = new Hono<{ Bindings: Env }>();

const SESSION_COOKIE = "sid";
const ISSUER_URL = "https://replit.com/oidc";

/* ── /api/auth/me ──────────────────────────────────────────────────────── */

app.get("/me", async (c) => {
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) return c.json({ user: null }, 200);

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id, expires_at, user_data")
      .eq("id", sid)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      deleteCookie(c, SESSION_COOKIE);
      return c.json({ user: null }, 200);
    }

    return c.json({ user: session.user_data });
  } catch {
    return c.json({ user: null }, 200);
  }
});

/* ── /api/auth/login ───────────────────────────────────────────────────── */

app.get("/login", (c) => {
  const origin = new URL(c.req.url).origin;
  const params = new URLSearchParams({
    client_id: c.env.CLIENT_ID ?? "",
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: "code",
    scope: "openid profile email",
    state: crypto.randomUUID(),
  });
  return c.redirect(`${ISSUER_URL}/auth?${params.toString()}`);
});

/* ── /api/auth/logout ──────────────────────────────────────────────────── */

app.post("/logout", async (c) => {
  const sid = getCookie(c, SESSION_COOKIE);
  if (sid) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("sessions").delete().eq("id", sid);
    } catch { /* ignore */ }
    deleteCookie(c, SESSION_COOKIE);
  }
  return c.json({ ok: true });
});

export default app;
