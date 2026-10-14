import webpush from "web-push";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function staffFromRequest(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { error: json({ error: "Sign in required." }, 401) };
  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return { error: json({ error: "Invalid session." }, 401) };
  const user = await userRes.json();
  const adminRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/admins?user_id=eq.${user.id}&select=id,user_id,email,display_name,role`,
    { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }
  );
  const admin = adminRes.ok ? (await adminRes.json())[0] : null;
  if (!admin) return { error: json({ error: "Not an authorized staff account." }, 403) };
  return { user, admin };
}

function pushReady(env) {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

async function handlePush(request, env) {
  if (request.method === "GET") return json({ publicKey: env.VAPID_PUBLIC_KEY || "" });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!pushReady(env)) return json({ error: "Push is not configured on the server." }, 503);
  const auth = await staffFromRequest(request, env);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  if (body.action === "subscribe") {
    const sub = body.subscription;
    if (!sub?.endpoint) return json({ error: "Invalid subscription." }, 400);
    const saved = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: auth.user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: request.headers.get("user-agent") || "",
      }),
    });
    return saved.ok ? json({ ok: true }) : json({ error: "Could not save this device." }, 500);
  }

  if (body.action === "test") {
    return json({ ok: true, sent: 0, note: "Test is ready after a device is subscribed." });
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/push") return handlePush(request, env);
    if (url.pathname === "/manifest.json" || url.pathname === "/sw.js") {
      return env.ASSETS.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
