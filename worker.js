function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function bytesToB64url(bytes) {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (char) => char.charCodeAt(0));
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function hkdfInfo(label, ...context) {
  return concat(new TextEncoder().encode(label), new Uint8Array([0]), ...context);
}

async function encryptPayload(payloadText, p256dh, auth) {
  const clientPublicKeyBytes = b64urlToBytes(p256dh);
  const authSecret = b64urlToBytes(auth);
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientPublicKey }, serverKeyPair.privateKey, 256)
  );
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: authSecret,
        info: hkdfInfo("WebPush: info", clientPublicKeyBytes, serverPublicKey),
      },
      await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]),
      256
    )
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits", "deriveKey"]);
  const contentKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: hkdfInfo("Content-Encoding: aes128gcm") },
    ikmKey,
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt"]
  );
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: hkdfInfo("Content-Encoding: nonce") },
      ikmKey,
      96
    )
  );
  const plaintext = concat(new TextEncoder().encode(payloadText), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, contentKey, plaintext));
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(serverPublicKey, 21);
  return concat(header, ciphertext);
}

async function vapidJwt(endpoint, env) {
  const publicKey = b64urlToBytes(env.VAPID_PUBLIC_KEY);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: env.VAPID_PRIVATE_KEY,
    x: bytesToB64url(publicKey.slice(1, 33)),
    y: bytesToB64url(publicKey.slice(33, 65)),
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(
    new TextEncoder().encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: env.VAPID_SUBJECT || "mailto:staff@tambayancawag.local",
      })
    )
  );
  const unsigned = `${header}.${claims}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned))
  );
  return `${unsigned}.${bytesToB64url(signature)}`;
}

async function sendPush(env, subscription, payload) {
  const body = await encryptPayload(payload, subscription.p256dh, subscription.auth);
  const token = await vapidJwt(subscription.endpoint, env);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body,
  });
  return response;
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
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

async function handlePush(request, env) {
  if (request.method === "GET") return json({ publicKey: env.VAPID_PUBLIC_KEY || "" });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!pushReady(env)) return json({ error: "Push is not configured on the server." }, 503);
  const auth = await staffFromRequest(request, env);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));

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

  if (body.action === "unsubscribe" && body.endpoint) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(body.endpoint)}`, {
      method: "DELETE",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  }
  return json({ ok: true });
}

async function sendToStaff(env, payload) {
  if (!pushReady(env) || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = res.ok ? await res.json() : [];
  await Promise.all(
    rows.map(async (row) => {
      try {
        const response = await sendPush(env, row, payload);
        if (response.status === 404 || response.status === 410) {
          await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${row.id}`, {
            method: "DELETE",
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          });
        }
      } catch (error) {
        console.error("push failed", error);
      }
    })
  );
  return rows.length;
}

async function handleNotify(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const body = await request.json().catch(() => ({}));
  const payload = JSON.stringify({
    title: "New Tambayan pre-order",
    body: "A customer just placed an order. Open the staff dashboard to see it.",
    url: "/admin.html#orders",
    orderId: body.orderId || "",
  });
  const sent = await sendToStaff(env, payload);
  return json({ ok: true, sent });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/push") return handlePush(request, env);
    if (url.pathname === "/api/notify-order") return handleNotify(request, env);
    return env.ASSETS.fetch(request);
  },
};
