# Cloudflare variables and secrets

## Public variables

Already set in `wrangler.toml` under `[vars]`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ONESIGNAL_APP_ID` — paste your OneSignal App ID here before deploying

## Secrets

Run these in the project folder. Wrangler will ask you to paste the value. Do not put these in `wrangler.toml` or `js/config.js`.

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ONESIGNAL_REST_API_KEY
```

Or in Cloudflare:

1. Open Workers & Pages.
2. Open `tambayan-cawag`.
3. Go to Settings → Variables and Secrets.
4. Add the two names above as Secrets.
5. Add `ONESIGNAL_APP_ID` as a plain variable if you did not put it in `wrangler.toml`.

Then deploy:

```bash
npx wrangler deploy
```
