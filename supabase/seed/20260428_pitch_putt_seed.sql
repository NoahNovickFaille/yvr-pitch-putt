insert into public.courses (slug, name, city, province, hole_count)
values
  ('queen-elizabeth', 'Queen Elizabeth Pitch & Putt', 'Vancouver', 'BC', 18),
  ('rupert-park', 'Rupert Park Pitch & Putt', 'Vancouver', 'BC', 18),
  ('stanley-park', 'Stanley Park Pitch & Putt', 'Vancouver', 'BC', 18)
on conflict (slug) do update set
  name = excluded.name,
  city = excluded.city,
  province = excluded.province,
  hole_count = excluded.hole_count;

with c as (
  select id, slug from public.courses
),
hole_numbers as (
  select generate_series(1, 18) as hole_number
),
seed_rows as (
  select
    c.id as course_id,
    c.slug,
    h.hole_number,
    3 as par,
    format('%s/hole-%s', c.slug, h.hole_number) as asset_key
  from c
  cross join hole_numbers h
)
insert into public.holes (course_id, hole_number, par, asset_key)
select course_id, hole_number, par, asset_key
from seed_rows
on conflict (course_id, hole_number) do update set
  par = excluded.par,
  asset_key = excluded.asset_key;
