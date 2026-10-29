-- Tambayan Cawag V2
-- Live orders, staff roles, and push notification storage.
-- Safe to run once in the Supabase SQL editor. Does not delete orders or menu data.

alter table public.admins
  add column if not exists role text not null default 'staff'
  check (role in ('owner', 'staff'));

update public.admins
set role = 'owner'
where id = (
  select id from public.admins
  order by created_at
  limit 1
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid() and a.role = 'owner'
  );
$$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  event_type text not null default 'order.created',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists order_events_unprocessed_idx on public.order_events (processed_at) where processed_at is null;

-- Create one notify event after the first line item is saved.
-- Orders and items are inserted separately, so this waits for items.
create or replace function public.queue_order_created_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_events (order_id, event_type)
  values (new.order_id, 'order.created')
  on conflict (order_id) do nothing;
  return new;
end;
$$;

drop trigger if exists order_items_queue_event on public.order_items;
create trigger order_items_queue_event
after insert on public.order_items
for each row execute function public.queue_order_created_event();

alter table public.push_subscriptions enable row level security;
alter table public.order_events enable row level security;

drop policy if exists push_self_select on public.push_subscriptions;
create policy push_self_select on public.push_subscriptions
  for select using (auth.uid() = user_id and public.is_admin());

drop policy if exists push_self_insert on public.push_subscriptions;
create policy push_self_insert on public.push_subscriptions
  for insert with check (auth.uid() = user_id and public.is_admin());

drop policy if exists push_self_delete on public.push_subscriptions;
create policy push_self_delete on public.push_subscriptions
  for delete using (auth.uid() = user_id and public.is_admin());

-- Customers may create an order, but cannot choose a privileged status.
drop policy if exists orders_public_insert on public.orders;
create policy orders_public_insert on public.orders
  for insert with check (status = 'received');

-- Staff can still read/update orders. No public select policy exists.
-- Owner-only management of staff rows. Everyone can still read their own row.
drop policy if exists admins_admin_all on public.admins;
drop policy if exists admins_owner_write on public.admins;
create policy admins_owner_write on public.admins
  for all using (public.is_owner()) with check (public.is_owner());

-- Live item updates so the dashboard can refresh after line items arrive.
do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception
  when duplicate_object then null;
end $$;
