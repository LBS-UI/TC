# Tambayan Cawag V2

A complete rebuild of the Tambayan Cawag restaurant website.

Stack: HTML5, CSS3, vanilla JavaScript (ES modules), Supabase.

No React, Vue, Next.js, Angular, or Firebase.

## Run locally

Do not open the files with `file://`. ES modules and fetch need a local server.

```bash
cd tambayan-cawag-v2
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Connect Supabase

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Put the project URL and **anon public** key in `js/config.js`.
   Never put the service-role key in this website.
4. Authentication → add an email/password user.
5. Attach that user as an admin:

```sql
insert into public.admins (user_id, email, display_name)
values ('YOUR-AUTH-USER-UUID', 'you@email.com', 'Owner');
```

6. Open `admin.html`, sign in, and add restaurant and cafe menu items.

Until keys are added, the public pages still work. Hours, navigation, and the cart UI work offline. Menu items and order submission need Supabase.

## What this version includes

- Separate restaurant and cafe pages
- Database field `menu_type`: `restaurant` | `cafe`
- Hours with Open now / Closed / Opening soon, using Asia/Manila time
- Midnight handled as `24:00` (12:00 AM is closed)
- Cart for kitchen and cafe items
- Admin dashboard with UID checks (unauthorized users see an error, not a silent redirect)
- Row Level Security policies in `schema.sql`

## Pages

- `index.html` Home
- `menu.html` Restaurant menu
- `cafe.html` Cafe
- `order.html` Cart and checkout
- `about.html` About
- `contact.html` Contact
- `admin.html` Staff dashboard

## Notes about menu data

No old project files were available in this rebuild, so this version does **not** invent dishes or prices. Categories are seeded. Add real items from the admin dashboard.
