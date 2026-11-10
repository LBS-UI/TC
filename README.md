# Tambayan Cawag

Cloudflare-only site. No OneSignal and no extra services.

```text
index.html, menu.html, cafe.html, order.html, about.html, contact.html, admin.html
css/          page styles
js/           site scripts
assets/       logo, photos, menu images, music
supabase/     database SQL, run in Supabase, not served to customers
worker.js     Cloudflare Worker
sw.js         background order alerts
wrangler.toml Cloudflare settings
```

Deploy from this folder:

```bash
npx wrangler deploy
```

Secrets to set in Cloudflare:

- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY`
