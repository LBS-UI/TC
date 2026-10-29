-- Tambayan Cawag V2 — restaurant menu replacement
-- Source: prices transcribed from the restaurant menu notes.
-- Cafe size prices were not visible in an uploaded photo, so cafe rows are not inserted.
-- Images are local illustration files in assets/menu. They are not photographs of Tambayan Cawag's actual plates.
-- They are not photographs of Tambayan Cawag's actual plates.
-- Some Commons files require attribution. See the file page for the license.
-- Does not delete orders, order_items, admins, or settings.
-- order_items.menu_item_id is set null if a menu row is removed. Order names stay on the order line.

begin;

insert into public.categories (name, slug, menu_type, sort_order)
values
  ('Snacks', 'snacks', 'restaurant', 10),
  ('Pancit', 'pancit', 'restaurant', 20),
  ('Food', 'food', 'restaurant', 30),
  ('Drinks', 'drinks', 'restaurant', 40),
  ('Add-ons', 'add-ons', 'restaurant', 50),
  ('Fried Chicken', 'fried-chicken', 'restaurant', 60),
  ('Silog', 'silog', 'restaurant', 70),
  ('Lugaw', 'lugaw', 'restaurant', 80),
  ('Mami', 'mami', 'restaurant', 90),
  ('Extras', 'extras', 'restaurant', 100)
on conflict (menu_type, slug) do nothing;

delete from public.menu_items;

insert into public.menu_items (category_id, name, description, price, image_url, menu_type, available, featured, sort_order)
select c.id, v.name, v.description, v.price, v.image_url, 'restaurant', true, v.featured, v.sort_order
from (
  values
    ('snacks', 'Fries — Classic', 'Classic fries.', 80.00, 'assets/menu/fries.jpg', true, 10),
    ('snacks', 'Fries — Cheese', 'Cheese fries.', 80.00, 'assets/menu/fries.jpg', false, 20),
    ('snacks', 'Fries — Barbecue', 'Barbecue fries.', 80.00, 'assets/menu/fries.jpg', false, 30),
    ('snacks', 'Fries — Sour & Cream', 'Sour cream fries.', 80.00, 'assets/menu/fries.jpg', false, 40),
    ('snacks', 'Plain Nachos', 'Plain nachos.', 110.00, 'assets/menu/nachos.jpg', false, 50),
    ('snacks', 'Beef Nachos', 'Beef nachos.', 145.00, 'assets/menu/nachos.jpg', true, 60),
    ('snacks', 'Plain Burger', 'Plain burger.', 75.00, 'assets/menu/burger.jpg', false, 70),
    ('snacks', 'Cheese Burger', 'Cheese burger.', 85.00, 'assets/menu/burger.jpg', false, 80),
    ('snacks', 'Egg Sandwich', 'Egg sandwich.', 70.00, 'assets/menu/sandwich.jpg', false, 90),
    ('snacks', 'Hotdog Sandwich', 'Hotdog sandwich.', 80.00, 'assets/menu/sandwich.jpg', false, 100),
    ('snacks', 'Ham Sandwich', 'Ham sandwich.', 70.00, 'assets/menu/sandwich.jpg', false, 110),
    ('snacks', 'Ham & Egg Sandwich', 'Ham and egg sandwich.', 80.00, 'assets/menu/sandwich.jpg', false, 120),
    ('snacks', 'Ham & Egg with Cheese Sandwich', 'Ham, egg, and cheese sandwich.', 90.00, 'assets/menu/sandwich.jpg', false, 130),
    ('add-ons', 'Snack Add-on Cheese', 'Snack add-on: cheese.', 15.00, 'assets/menu/cheese.jpg', false, 10),
    ('add-ons', 'Snack Add-on Egg', 'Snack add-on: egg.', 20.00, 'assets/menu/egg.jpg', false, 20),
    ('pancit', 'Pancit Bihon', 'Pancit bihon. Good for 2–3 persons.', 179.00, 'assets/menu/pancit.jpg', true, 10),
    ('pancit', 'Pancit Canton', 'Pancit canton. Good for 2–3 persons.', 189.00, 'assets/menu/pancit.jpg', false, 20),
    ('pancit', 'Mix Canton Bihon', 'Mixed canton and bihon. Good for 2–3 persons.', 199.00, 'assets/menu/pancit.jpg', false, 30),
    ('food', 'Shanghai Rolls (25 pieces)', 'Shanghai rolls, 25 pieces.', 100.00, 'assets/menu/shanghai.jpg', true, 10),
    ('food', 'Tokwa''t Baboy', 'Tokwa''t baboy.', 130.00, 'assets/menu/tokwa.jpg', false, 20),
    ('food', 'Chicharon Bulaklak', 'Chicharon bulaklak.', 150.00, 'assets/menu/chicharon.jpg', false, 30),
    ('food', 'Sisig', 'Sisig.', 150.00, 'assets/menu/sisig.jpg', true, 40),
    ('food', 'Beef Papaitan', 'Beef papaitan.', 130.00, 'assets/menu/papaitan.jpg', false, 50),
    ('drinks', 'Bottled Water 350 ml', 'Bottled water, 350 ml.', 20.00, 'assets/menu/water.jpg', false, 10),
    ('drinks', 'Bottled Water 500 ml', 'Bottled water, 500 ml.', 25.00, 'assets/menu/water.jpg', false, 20),
    ('drinks', 'C2 Solo', 'C2 solo.', 25.00, 'assets/menu/c2.jpg', false, 30),
    ('drinks', 'Pineapple Juice', 'Pineapple juice.', 50.00, 'assets/menu/pineapple.jpg', false, 40),
    ('drinks', 'Iced Tea Glass', 'Iced tea, one glass.', 40.00, 'assets/menu/iced-tea.jpg', false, 50),
    ('drinks', 'Iced Tea Pitcher', 'Iced tea, one pitcher.', 120.00, 'assets/menu/iced-tea.jpg', false, 60),
    ('drinks', 'Coke Mismo', 'Mismo soft drink: Coke.', 30.00, 'assets/menu/coke.jpg', false, 70),
    ('drinks', 'Sprite Mismo', 'Mismo soft drink: Sprite.', 30.00, 'assets/menu/sprite.jpg', false, 80),
    ('drinks', 'Royal Mismo', 'Mismo soft drink: Royal.', 30.00, 'assets/menu/royal.jpg', false, 90),
    ('drinks', 'Mountain Dew Mismo', 'Mismo soft drink: Mountain Dew.', 30.00, 'assets/menu/dew.jpg', false, 100),
    ('drinks', 'Coke 1.5L', '1.5 L soft drink: Coke.', 100.00, 'assets/menu/coke.jpg', false, 110),
    ('drinks', 'Coke Zero 1.5L', '1.5 L soft drink: Coke Zero.', 100.00, 'assets/menu/coke.jpg', false, 120),
    ('drinks', 'Royal 1.5L', '1.5 L soft drink: Royal.', 100.00, 'assets/menu/royal.jpg', false, 130),
    ('drinks', 'Sprite 1.5L', '1.5 L soft drink: Sprite.', 100.00, 'assets/menu/sprite.jpg', false, 140),
    ('fried-chicken', 'Solo Fried Chicken', 'Solo fried chicken.', 70.00, 'assets/menu/fried-chicken.jpg', true, 10),
    ('fried-chicken', 'Solo Fried Chicken with Plain Rice', 'Solo fried chicken with plain rice.', 90.00, 'assets/menu/fried-chicken.jpg', false, 20),
    ('fried-chicken', 'Barkada Treats', '5 pieces fried chicken.', 299.00, 'assets/menu/fried-chicken.jpg', false, 30),
    ('fried-chicken', 'Family Bundle', 'Good for 4–6 persons. 6 pcs fried chicken, 6 plain rice, 15 pcs Shanghai rolls, 1 soft drink 1.5 L, and soup.', 599.00, 'assets/menu/fried-chicken.jpg', false, 40),
    ('silog', 'Bangus Silog', 'Bangus silog.', 125.00, 'assets/menu/silog.jpg', false, 10),
    ('silog', 'Chicksilog', 'Chicksilog.', 125.00, 'assets/menu/silog.jpg', false, 20),
    ('silog', 'Tapsilog', 'Tapsilog.', 110.00, 'assets/menu/silog.jpg', true, 30),
    ('silog', 'Tosilog', 'Tosilog.', 100.00, 'assets/menu/silog.jpg', false, 40),
    ('silog', 'Hotsilog', 'Hotsilog.', 90.00, 'assets/menu/silog.jpg', false, 50),
    ('silog', 'Cornsilog', 'Cornsilog.', 90.00, 'assets/menu/silog.jpg', false, 60),
    ('silog', 'Longsilog', 'Longsilog.', 90.00, 'assets/menu/silog.jpg', false, 70),
    ('silog', 'Hamsilog', 'Hamsilog.', 90.00, 'assets/menu/silog.jpg', false, 80),
    ('lugaw', 'Plain Lugaw', 'Plain lugaw.', 35.00, 'assets/menu/lugaw.jpg', false, 10),
    ('lugaw', 'Eggcaldo', 'Eggcaldo.', 50.00, 'assets/menu/lugaw.jpg', false, 20),
    ('lugaw', 'Arrozcaldo', 'Arrozcaldo.', 60.00, 'assets/menu/lugaw.jpg', false, 30),
    ('lugaw', 'Goto', 'Goto.', 65.00, 'assets/menu/lugaw.jpg', false, 40),
    ('lugaw', 'Overload', 'Lugaw with chicken, beef, and egg toppings.', 95.00, 'assets/menu/lugaw.jpg', true, 50),
    ('add-ons', 'Lugaw Add-on Boiled Egg', 'Lugaw add-on: boiled egg.', 20.00, 'assets/menu/egg.jpg', false, 30),
    ('add-ons', 'Lugaw Add-on Chicharon Bulaklak', 'Lugaw add-on: chicharon bulaklak.', 20.00, 'assets/menu/chicharon.jpg', false, 40),
    ('mami', 'Beef Mami Without Egg', 'Beef mami without egg.', 60.00, 'assets/menu/mami.jpg', false, 10),
    ('mami', 'Beef Mami With Egg', 'Beef mami with egg.', 75.00, 'assets/menu/mami.jpg', true, 20),
    ('add-ons', 'Mami Add-on Chicharon Bulaklak', 'Mami add-on: chicharon bulaklak.', 30.00, 'assets/menu/chicharon.jpg', false, 50),
    ('extras', 'Plain Rice', 'Plain rice.', 20.00, 'assets/menu/rice.jpg', false, 10),
    ('extras', 'Garlic Rice', 'Garlic rice.', 25.00, 'assets/menu/rice.jpg', false, 20)
) as v(slug, name, description, price, image_url, featured, sort_order)
join public.categories c on c.slug = v.slug and c.menu_type = 'restaurant';

commit;
