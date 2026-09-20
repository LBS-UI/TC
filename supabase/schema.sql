-- ===================================================================
-- TAMBAYAN CAWAG — SUPABASE SCHEMA
-- -------------------------------------------------------------------
-- Run this once in your Supabase project's SQL Editor (Dashboard ->
-- SQL Editor -> New query -> paste this whole file -> Run). Safe to
-- run on a brand-new project. See SUPABASE_SETUP.md for the full
-- setup walkthrough.
--
-- DESIGN NOTES (read before you run it):
--
-- * ORDERS = RESERVATIONS. The existing site has a single "Dine-In
--   Pre-Order" flow (menu -> cart -> date/time/guests/seating ->
--   customer info -> submit -> reservation number), not two separate
--   ordering systems. Rather than fork one real user flow across two
--   parallel tables, this schema stores it once in `orders` (which
--   already carries date/time/guests/seating/items/status — every
--   field a "reservation" needs). If you later want a genuinely
--   separate walk-in/quick-order flow that ISN'T a dine-in
--   reservation, that's a good reason to add a second table then.
--
-- * PUBLIC ORDER LOOKUP, SAFELY. Row Level Security can restrict which
--   ROWS a policy allows, but it can't easily restrict which COLUMNS
--   come back, and letting anonymous customers SELECT directly from
--   `orders` would expose every customer's name/phone/email to anyone
--   who can guess a sequential order number. Instead:
--     - `orders`        -> full record, NEVER readable by anon at all
--     - `order_status`  -> public-safe summary only (no name/phone/
--                          email), looked up via the get_order_status()
--                          function below by exact order_number
--   Both tables are written together by create_order() (a SECURITY
--   DEFINER function), so customers never need direct INSERT rights
--   on either table.
--
-- * ATOMIC ORDER NUMBERS. TC-2026-00001 style numbers come from a
--   Postgres sequence via generate_order_number(), so two simultaneous
--   orders can never collide — no client-side counter document needed.
--
-- * PRICE TRUST. create_order() validates shape (required fields,
--   non-negative subtotal, non-empty items) but — like the previous
--   Firebase version of this project — does not re-derive prices from
--   the menu table itself. True server-side price recalculation would
--   mean looping over `items` inside this function and summing trusted
--   menu prices; it's a reasonable next hardening step, deliberately
--   left out here to keep this schema readable, and is called out
--   again in SUPABASE_SETUP.md. The app's client-side re-verification
--   (js/reservation.js's reverifyCartAgainstMenu, unchanged by this
--   migration) remains the first line of defense.
-- ===================================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ===================================================================
-- TABLES
-- ===================================================================

-- Category metadata: icon, which service (goto/cafe) it belongs to,
-- serving note (e.g. "Good for 2-3 people"), and shared add-ons.
create table if not exists categories (
  id text primary key,
  name text not null,
  icon text,
  description text default '',
  service text not null check (service in ('goto', 'cafe')),
  serving_note text,
  add_ons jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0
);

-- Individual menu items.
create table if not exists menu (
  id text primary key,
  name text not null,
  category text not null references categories(id) on delete cascade,
  description text default '',
  price numeric(10, 2) not null check (price >= 0),
  image text default '',
  available boolean not null default true,
  bundle_contents jsonb,
  variants jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_category_idx on menu(category);

-- Operating hours per service. "24:00" close means midnight; the app
-- displays this as 23:59 in the admin time-picker and converts it back
-- to "24:00" on save (HTML <input type="time"> can't hold "24:00").
create table if not exists services (
  id text primary key, -- 'goto' | 'cafe'
  label text not null,
  open_time text not null,
  close_time text not null
);

-- Small key/value settings store: settings('preorder') holds
-- {"lead_minutes": 30}; settings('restaurant') holds the contact info
-- shown in the footer/contact section.
create table if not exists settings (
  key text primary key,
  value jsonb not null
);

-- Full order/reservation record — every field, including PII.
-- Never directly readable by anon; see RLS policies below.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text default '',
  service_type text default 'dine-in',
  order_date date not null,
  order_time time not null,
  guests integer not null check (guests > 0),
  seating text,
  items jsonb not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'completed', 'cancelled')),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_order_date_idx on orders(order_date);

-- Public-safe summary of an order, keyed by order_number, with no
-- customer_name/phone/email/notes — see design notes above.
create table if not exists order_status (
  order_number text primary key references orders(order_number) on delete cascade,
  order_date date not null,
  order_time time not null,
  guests integer not null,
  items jsonb not null,
  subtotal numeric(10, 2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin allowlist. One row per authorized admin, keyed by their
-- Supabase Auth user id. This is the ENTIRE authorization model —
-- being signed in only proves who someone is; being in this table
-- (with role = 'admin') is what proves they're allowed to manage the
-- restaurant. See SUPABASE_SETUP.md for how to add the first admin.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

-- ===================================================================
-- HELPER FUNCTION
-- ===================================================================

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ===================================================================
-- ORDER NUMBERING + ORDER CREATION (SECURITY DEFINER)
-- -------------------------------------------------------------------
-- These functions run with elevated privilege so anonymous customers
-- can safely create an order without needing direct table INSERT
-- rights on `orders`/`order_status` at all — the function itself does
-- the shape validation that would otherwise need to live in RLS.
-- ===================================================================

create sequence if not exists order_number_seq start 1;

create or replace function generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq_val bigint;
  yr text;
begin
  seq_val := nextval('order_number_seq');
  yr := to_char(now(), 'YYYY');
  return 'TC-' || yr || '-' || lpad(seq_val::text, 5, '0');
end;
$$;

create or replace function create_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_order_date date,
  p_order_time time,
  p_guests integer,
  p_seating text,
  p_items jsonb,
  p_subtotal numeric,
  p_notes text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_number text;
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'Full name is required.';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then
    raise exception 'Contact number is required.';
  end if;
  if p_order_date is null or p_order_time is null then
    raise exception 'Date and time are required.';
  end if;
  if p_guests is null or p_guests <= 0 then
    raise exception 'Guest count must be greater than zero.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one menu item is required.';
  end if;
  if p_subtotal is null or p_subtotal < 0 then
    raise exception 'Invalid order total.';
  end if;

  v_order_number := generate_order_number();

  insert into orders (
    order_number, customer_name, customer_phone, customer_email, service_type,
    order_date, order_time, guests, seating, items, subtotal, status, notes
  ) values (
    v_order_number, p_customer_name, p_customer_phone, coalesce(p_customer_email, ''), 'dine-in',
    p_order_date, p_order_time, p_guests, p_seating, p_items, p_subtotal, 'pending', coalesce(p_notes, '')
  );

  insert into order_status (
    order_number, order_date, order_time, guests, items, subtotal, status
  ) values (
    v_order_number, p_order_date, p_order_time, p_guests, p_items, p_subtotal, 'pending'
  );

  return v_order_number;
end;
$$;

-- Customer-facing "Check My Order" — exact-key lookup only, and only
-- ever touches the public-safe order_status table.
create or replace function get_order_status(p_order_number text)
returns table (
  order_number text, order_date date, order_time time,
  guests integer, items jsonb, subtotal numeric, status text
)
language sql
security definer
set search_path = public
stable
as $$
  select order_number, order_date, order_time, guests, items, subtotal, status
  from order_status
  where order_number = p_order_number;
$$;

-- Admin-only status update, touching both tables atomically.
create or replace function update_order_status(p_order_number text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Not authorized.';
  end if;
  if p_status not in ('pending', 'confirmed', 'preparing', 'completed', 'cancelled') then
    raise exception 'Invalid status.';
  end if;

  update orders set status = p_status, updated_at = now() where order_number = p_order_number;
  update order_status set status = p_status, updated_at = now() where order_number = p_order_number;
end;
$$;

grant execute on function generate_order_number() to anon, authenticated;
grant execute on function create_order(text, text, text, date, time, integer, text, jsonb, numeric, text) to anon, authenticated;
grant execute on function get_order_status(text) to anon, authenticated;
grant execute on function update_order_status(text, text) to authenticated;
grant execute on function is_admin() to anon, authenticated;

-- ===================================================================
-- ROW LEVEL SECURITY
-- ===================================================================

alter table categories enable row level security;
alter table menu enable row level security;
alter table services enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;
alter table order_status enable row level security;
alter table admins enable row level security;

-- categories: public read, admin write
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for insert with check (is_admin());
create policy "categories_admin_update" on categories for update using (is_admin());
create policy "categories_admin_delete" on categories for delete using (is_admin());

-- menu: public read (including unavailable items, so the UI can show
-- them as "Currently Unavailable" rather than hiding them), admin write
create policy "menu_public_read" on menu for select using (true);
create policy "menu_admin_write" on menu for insert with check (is_admin());
create policy "menu_admin_update" on menu for update using (is_admin());
create policy "menu_admin_delete" on menu for delete using (is_admin());

-- services: public read, admin write
create policy "services_public_read" on services for select using (true);
create policy "services_admin_write" on services for insert with check (is_admin());
create policy "services_admin_update" on services for update using (is_admin());
create policy "services_admin_delete" on services for delete using (is_admin());

-- settings: public read, admin write
create policy "settings_public_read" on settings for select using (true);
create policy "settings_admin_write" on settings for insert with check (is_admin());
create policy "settings_admin_update" on settings for update using (is_admin());
create policy "settings_admin_delete" on settings for delete using (is_admin());

-- orders: admin-only, full stop. Customers never read/write this table
-- directly — they go through create_order()/get_order_status(), which
-- run with elevated privilege. Admin dashboard reads/updates directly.
create policy "orders_admin_select" on orders for select using (is_admin());
create policy "orders_admin_update" on orders for update using (is_admin());
create policy "orders_admin_delete" on orders for delete using (is_admin());
-- (no insert policy for orders — only create_order() can insert, via
-- security definer; direct client inserts are always rejected)

-- order_status: same story — admin can read directly if useful, but
-- the public path is exclusively through get_order_status().
create policy "order_status_admin_select" on order_status for select using (is_admin());
create policy "order_status_admin_update" on order_status for update using (is_admin());
create policy "order_status_admin_delete" on order_status for delete using (is_admin());

-- admins: a user may check their own row (needed for the client-side
-- "am I an admin?" check after sign-in); nothing else is ever allowed
-- from the client — manage this table from the SQL editor / dashboard.
create policy "admins_self_read" on admins for select using (auth.uid() = user_id);

-- ===================================================================
-- REALTIME
-- -------------------------------------------------------------------
-- Enable Realtime (Database -> Replication in the dashboard, or the
-- lines below) for the tables the app subscribes to. RLS still applies
-- to realtime — an anon session subscribed to `orders` will receive
-- nothing, since no policy grants it select access.
-- ===================================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table menu;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table services;
alter publication supabase_realtime add table settings;
