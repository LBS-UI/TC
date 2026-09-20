# Supabase Setup — Tambayan Cawag

This site runs entirely as static files (no server, no build step, no npm),
backed by Supabase for the menu, orders, reservations, schedules, and admin
login. Follow these steps in order the first time you set it up.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and sign in (or create an account).
2. Click **New project**, choose an organization, name it (e.g.
   `tambayan-cawag`), set a database password (save it somewhere safe — you
   likely won't need it again, but it's needed if you ever connect a SQL
   client directly), pick a region close to your customers, and create it.
3. Wait for the project to finish provisioning (a minute or two).

## 2. Run the database schema

1. In the Supabase dashboard, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open **`supabase/schema.sql`** from this project, copy the entire file,
   and paste it into the SQL Editor.
4. Click **Run**. This creates every table, the `is_admin()` helper, the
   order-numbering and order-creation functions, and all the Row Level
   Security policies in one go. It's safe to run on a brand-new project.
5. Read the comment block at the top of `schema.sql` first if you're
   curious — it explains a few real design decisions (why orders and
   reservations share one table, why order lookup is split into two
   tables, why order numbers use a database sequence instead of a
   client-side counter).

## 3. Find your Project URL and anon key

1. In the dashboard, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key (not the
   `service_role` key — that one must never go in frontend code).
3. Open **`js/supabase-config.js`** in this project and paste them into
   `SUPABASE_URL` and `SUPABASE_ANON_KEY`, replacing the `YOUR_...`
   placeholders. This is the **only** file you need to edit to connect the
   site to your Supabase project.

## 4. Create the first admin account

The admin dashboard checks two things: (a) that you're signed in with a
valid Supabase Auth account, and (b) that your account's user ID has a
matching row in the `admins` table with `role = 'admin'`. Both are required.

1. In the dashboard, go to **Authentication → Users → Add user → Create
   new user**. Enter an email and password — this is what you'll use to
   sign in at `admin.html`. You can toggle "Auto Confirm User" on so you
   don't need to click an email confirmation link.
2. Copy the new user's **User UID** from the Users table.
3. Go to **Table Editor → admins → Insert row**, and add:
   - `user_id`: paste the UID from step 2
   - `email`: the admin's email address
   - `role`: `admin`
4. Save. You can now sign in to `admin.html` with that email/password.

To add more admins later, repeat steps 1–3 for each additional staff account.

## 5. Enable Realtime

`supabase/schema.sql` already runs the commands to add `orders`, `menu`,
`categories`, `services`, and `settings` to the `supabase_realtime`
publication. Double-check it took effect:

1. Go to **Database → Replication**.
2. Under the `supabase_realtime` publication, confirm those five tables are
   listed/enabled. If any are missing (e.g. because you ran an older
   version of the schema), toggle them on here directly.

## 6. Seed the initial menu

1. Open `admin.html` in a browser and sign in with the admin account you
   created in step 4.
2. Go to the **Setup** tab.
3. Click **Seed Initial Menu Data**. This reads the starting menu, prices,
   service hours, and lead time from `js/menu-data.js` and writes them into
   Supabase (`categories`, `menu`, `services`, `settings` tables).
4. It's safe to click more than once — it checks Supabase first and skips
   seeding if menu data already exists, so it will never create duplicates.
   To reset all menu data on purpose, delete all rows from `categories` and
   `menu` in the Table Editor first, then seed again.

## 7. Running the website locally

Because the site uses ES modules (`<script type="module">`) for the
Supabase code, opening `index.html` directly via `file://` will **not**
work in most browsers — modules require a real HTTP server. From this
project's folder, run any simple static server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/index.html> and <http://localhost:8000/admin.html>.

Any static server works (VS Code's "Live Server" extension, `npx serve`,
`php -S localhost:8000`, etc.) — there's no build step and no `npm install`
required for the site itself. The Supabase client is loaded from the CDN
(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm`) the same way
the rest of the site loads its fonts — nothing to install.

## 8. Deploying the website

Since this is a static site, host it anywhere that serves plain files —
Netlify, Vercel, GitHub Pages, Cloudflare Pages, or Supabase's own project
if you set up separate static hosting. There's no server-side code to
deploy; just upload the project folder as-is. Whichever host you pick,
make sure it serves `.js`/`.json` with correct MIME types (virtually all
static hosts do this by default).

---

## Hardening beyond this project

This setup is a solid, production-oriented foundation for a small
restaurant's ordering volume, but two things are worth knowing if you plan
to scale it up:

1. **Price recalculation.** Orders are priced by re-reading the live
   Supabase menu on the customer's device right before submission (see
   `reverifyCartAgainstMenu()` in `js/reservation.js`), and the
   `create_order()` Postgres function rejects obviously malformed totals
   (empty items, negative subtotal). True tamper-proof pricing — where the
   *database* recomputes the total from the menu and corrects/rejects the
   order — would mean extending `create_order()` to loop over the items
   array and sum trusted `menu.price` values itself, rather than trusting
   the `p_subtotal` argument. That's a natural next step in
   `supabase/schema.sql` if this restaurant's volume or risk profile grows.
2. **Admin authorization.** The `admins` table + RLS policy used here is
   the standard, secure pattern for a Supabase app without a separate
   backend. If you want stronger separation later, Supabase supports custom
   claims via Auth Hooks, which can embed the admin role directly in the
   JWT instead of requiring a table lookup — a reasonable upgrade once
   you're comfortable with that part of Supabase.

Neither is required to run this project safely at a single-restaurant
scale — they're listed here so you know where the ceiling is.

---

## Troubleshooting

**Console error mentioning `Failed to resolve module specifier
"@supabase/supabase-js"` (or similar).**
Something got edited to use the **npm** import style:
```javascript
import { createClient } from "@supabase/supabase-js";   // ❌ breaks in a plain browser
```
That bare specifier only resolves inside a bundler — a browser loading this
project via `python3 -m http.server` (or any static host) can't look it up.
Every file must import Supabase from the CDN instead, the way
`js/supabase-config.js` does:
```javascript
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
```

**The site says "Supabase is configured but failed to initialize."**
The values in `SUPABASE_URL`/`SUPABASE_ANON_KEY` aren't placeholders
anymore, but `createClient()` still failed — check the browser console for
the specific message (a typo in the URL is the most common cause), and
confirm you can reach your project's URL directly in a browser tab.

**Admin login succeeds but immediately gets signed back out with an
"not authorized as an admin" message.**
This means Supabase Auth accepted the email/password, but no row exists in
`admins` for that user's UID (or `role` isn't exactly `'admin'`). Re-check
step 4 above — the UID in the `admins` row must exactly match the UID shown
in **Authentication → Users** for that account.

**The shop shows "closed" one minute before actual midnight.**
The admin schedule form has to display a `"24:00"` closing time as
`"23:59"` in the UI (HTML's time input can't hold `"24:00"`), and the save
handler converts it back on the way out — this logic lives in
`js/admin.js`'s schedule-save handler (`normalizeClose()`). If you ever see
this symptom after editing that file, check that conversion is still there.
