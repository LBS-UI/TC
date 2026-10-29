-- Tambayan Cawag V2
-- Run this in the Supabase SQL editor (or supabase db reset)
-- Public anon key only on the frontend. Never put the service role key in the website.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  menu_type text not null check (menu_type in ('restaurant', 'cafe')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_type, slug)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  menu_type text not null check (menu_type in ('restaurant', 'cafe')),
  available boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_notes text not null default '',
  fulfillment text not null default 'pickup' check (fulfillment in ('pickup', 'dine-in')),
  status text not null default 'received'
    check (status in ('received', 'preparing', 'ready', 'completed', 'cancelled')),
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  menu_type text not null check (menu_type in ('restaurant', 'cafe')),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null check (line_total >= 0)
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
for each row execute function public.touch_updated_at();

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch before update on public.menu_items
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists menu_items_menu_type_idx on public.menu_items (menu_type);
create index if not exists menu_items_category_idx on public.menu_items (category_id);
create index if not exists menu_items_available_idx on public.menu_items (available);
create index if not exists categories_menu_type_idx on public.categories (menu_type);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists admins_user_id_idx on public.admins (user_id);

-- ---------------------------------------------------------------------------
-- Helper: is the current auth user an admin?
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admins enable row level security;
alter table public.settings enable row level security;

-- Categories: public read, admin write
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (true);

drop policy if exists categories_admin_insert on public.categories;
create policy categories_admin_insert on public.categories
  for insert with check (public.is_admin());

drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update on public.categories
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_delete on public.categories
  for delete using (public.is_admin());

-- Menu items: public read, admin write
drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items
  for select using (true);

drop policy if exists menu_items_admin_insert on public.menu_items;
create policy menu_items_admin_insert on public.menu_items
  for insert with check (public.is_admin());

drop policy if exists menu_items_admin_update on public.menu_items;
create policy menu_items_admin_update on public.menu_items
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists menu_items_admin_delete on public.menu_items;
create policy menu_items_admin_delete on public.menu_items
  for delete using (public.is_admin());

-- Settings: public read, admin write
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select using (true);

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Admins: a signed-in user may read ONLY their own row (used after login)
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select using (auth.uid() = user_id);

drop policy if exists admins_admin_all on public.admins;
create policy admins_admin_all on public.admins
  for all using (public.is_admin()) with check (public.is_admin());

-- Orders: customers may create; only admins may read/update
drop policy if exists orders_public_insert on public.orders;
create policy orders_public_insert on public.orders
  for insert with check (true);

drop policy if exists orders_admin_select on public.orders;
create policy orders_admin_select on public.orders
  for select using (public.is_admin());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- Order items: customers may create lines; only admins may read
drop policy if exists order_items_public_insert on public.order_items;
create policy order_items_public_insert on public.order_items
  for insert with check (true);

drop policy if exists order_items_admin_select on public.order_items;
create policy order_items_admin_select on public.order_items
  for select using (public.is_admin());
