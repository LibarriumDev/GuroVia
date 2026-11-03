-- GuroVia official School ID lookup (additive migration for existing tenants).
-- Run once in Supabase SQL Editor after the multi-tenant schools migration.

alter table public.schools add column if not exists official_school_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'schools_official_school_id_format_check') then
    alter table public.schools add constraint schools_official_school_id_format_check
      check (official_school_id is null or official_school_id ~ '^[A-Za-z0-9][A-Za-z0-9-]{2,19}$');
  end if;
end $$;

-- Preserve any existing ID; fill 301734 only when the default tenant has no ID and it is unused.
update public.schools as target
set official_school_id = '301734', updated_at = now()
where target.slug = 'salvacion-national-high-school'
  and (target.official_school_id is null or btrim(target.official_school_id) = '')
  and not exists (
    select 1 from public.schools other
    where upper(btrim(other.official_school_id)) = '301734' and other.id <> target.id
  );

create unique index if not exists schools_official_school_id_uq
  on public.schools (upper(btrim(official_school_id)))
  where official_school_id is not null;

create index if not exists schools_status_official_id_idx
  on public.schools (status, upper(btrim(official_school_id)))
  where official_school_id is not null;
