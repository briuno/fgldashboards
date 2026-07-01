-- Dimensao de datas (independente do Tier2) para os graficos por periodo
create table if not exists core.dim_date (
  date_key   date primary key,
  year       int  not null,
  quarter    int  not null,
  month      int  not null,
  month_name text not null,
  week       int  not null,
  day        int  not null,
  dow        int  not null,        -- 1=segunda ... 7=domingo (isodow)
  is_weekend boolean not null
);

insert into core.dim_date (date_key, year, quarter, month, month_name, week, day, dow, is_weekend)
select
  d::date,
  extract(year    from d)::int,
  extract(quarter from d)::int,
  extract(month   from d)::int,
  to_char(d, 'TMMonth'),
  extract(week    from d)::int,
  extract(day     from d)::int,
  extract(isodow  from d)::int,
  extract(isodow  from d)::int in (6, 7)
from generate_series('2018-01-01'::date, '2030-12-31'::date, interval '1 day') as g(d)
on conflict (date_key) do nothing;
