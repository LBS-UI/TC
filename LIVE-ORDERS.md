# Live orders, staff, and push

## Apply the database migration

In Supabase → SQL Editor, run:

`supabase/migrations/20261013_live_orders_staff_push.sql`

This does not delete orders, menu items, or admin accounts. It adds staff roles, push subscription storage, and a one-time order event so a new order is notified only once.

## Cloudflare secrets

Set these in Cloudflare Pages → Settings → Environment variables. Mark the private ones as secrets.

Public:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_SUBJECT` such as `mailto:you@example.com`

Secret:

- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY`

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

Deploy with the `functions` folder included. `wrangler.toml` enables `nodejs_compat`, which the push sender needs.

## Phone setup

- Android Chrome: open Admin, sign in, open Notifications, tap Enable notifications.
- iPhone or iPad: add the site to the Home Screen, open that app, sign in, then enable notifications.
- Notifications are not guaranteed if the browser, operating system, or network blocks them.
- Customers do not need to install anything to order.
