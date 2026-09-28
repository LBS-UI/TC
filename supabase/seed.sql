-- Tambayan Cawag V2 seed
-- Safe defaults only. No invented menu items or prices.
-- Add real dishes later from the admin dashboard.

insert into public.categories (name, slug, menu_type, sort_order) values
  ('Go-To', 'go-to', 'restaurant', 10),
  ('Snacks', 'snacks', 'restaurant', 20),
  ('Silog', 'silog', 'restaurant', 30),
  ('Coffee', 'coffee', 'cafe', 10),
  ('Non-Coffee', 'non-coffee', 'cafe', 20),
  ('Refreshers', 'refreshers', 'cafe', 30),
  ('Pastries', 'pastries', 'cafe', 40),
  ('Desserts', 'desserts', 'cafe', 50),
  ('Other', 'other', 'cafe', 60)
on conflict (menu_type, slug) do nothing;

insert into public.settings (key, value) values
  ('restaurant_name', '"Tambayan Cawag"'),
  ('tagline', '"A place to hang out in Cawag."'),
  ('short_description', '"Tambayan Cawag is a neighborhood restaurant and cafe in Cawag, Subic, Zambales. Come for silog, snacks, and a seat that feels like home."'),
  ('about', '"Tambayan means hangout. Tambayan Cawag is a local spot in Cawag, Subic where you can eat, drink coffee, and stay a while. The kitchen serves go-to plates, snacks, and silog. In the afternoon the cafe opens for coffee and a quieter table."'),
  ('address', '"Cawag, Subic, Zambales"'),
  ('phone', '""'),
  ('email', '""'),
  ('facebook', '""'),
  ('restaurant_hours', '{"open":"10:00","close":"24:00","label":"10:00 AM – 12:00 AM"}'),
  ('cafe_hours', '{"open":"13:00","close":"24:00","label":"1:00 PM – 12:00 AM"}'),
  ('timezone', '"Asia/Manila"')
on conflict (key) do nothing;

-- After you create an Auth user in Supabase, attach it as an admin:
--
--   insert into public.admins (user_id, email, display_name)
--   values ('YOUR-AUTH-USER-UUID', 'you@email.com', 'Owner');
--
-- Do not skip this step. Login alone is not enough.
