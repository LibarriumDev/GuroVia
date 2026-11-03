-- GuroVia local registration prerequisites.
-- Apply to an existing Supabase project when using the individual migration files
-- rather than the consolidated supabase/schema.sql. This migration is idempotent.
-- It restores the request limiter referenced by lib/server/security.ts and ensures
-- the legal acknowledgement columns and private school-logo bucket exist.

begin;

-- Required by allowRequest() for school registration, student requests, and feedback.
create table if not exists public.request_limits (
  id uuid primary key default gen_random_uuid(),
  ip_digest char(64) not null,
  action text not null check (char_length(action) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists request_limits_lookup_idx
  on public.request_limits (ip_digest, action, created_at desc);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from public, anon, authenticated;
grant select, insert, delete on public.request_limits to service_role;

create or replace function public.consume_request_limit(
  p_ip_digest text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_count integer;
begin
  if p_ip_digest is null or char_length(p_ip_digest) <> 64
     or p_action is null or char_length(p_action) < 1 or char_length(p_action) > 60
     or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_ip_digest), pg_catalog.hashtext(p_action)
  );

  delete from public.request_limits
  where created_at < pg_catalog.now() - interval '1 day';

  select count(*) into request_count
  from public.request_limits
  where ip_digest = p_ip_digest
    and action = p_action
    and created_at > pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds);

  if request_count >= p_limit then
    return false;
  end if;

  insert into public.request_limits (ip_digest, action)
  values (p_ip_digest, p_action);
  return true;
end;
$$;
revoke all on function public.consume_request_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_request_limit(text, text, integer, integer)
  to service_role;

-- Make the RPC visible to PostgREST immediately after the transaction commits.
notify pgrst, 'reload schema';

-- The registration endpoint writes these versioned acknowledgements. IF NOT EXISTS
-- makes this safe if the separate legal-acceptance migration was already applied.
alter table public.schools add column if not exists platform_terms_version text;
alter table public.schools add column if not exists platform_terms_accepted_at timestamptz;
alter table public.schools add column if not exists user_agreement_version text;
alter table public.schools add column if not exists user_agreement_accepted_at timestamptz;
alter table public.schools add column if not exists privacy_notice_version text;
alter table public.schools add column if not exists privacy_notice_acknowledged_at timestamptz;
alter table public.schools add column if not exists cookie_notice_version text;
alter table public.schools add column if not exists cookie_notice_acknowledged_at timestamptz;
alter table public.schools add column if not exists legal_accepted_by uuid references auth.users(id) on delete set null;

alter table public.schools drop constraint if exists schools_legal_notice_versions_length_check;
alter table public.schools add constraint schools_legal_notice_versions_length_check check (
  (platform_terms_version is null or char_length(platform_terms_version) <= 100) and
  (user_agreement_version is null or char_length(user_agreement_version) <= 120) and
  (privacy_notice_version is null or char_length(privacy_notice_version) <= 100) and
  (cookie_notice_version is null or char_length(cookie_notice_version) <= 100)
);

-- The API stores school logos privately and serves them through a same-origin endpoint.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-logos', 'school-logos', false, 1048576, array['image/webp']::text[])
on conflict (id) do update
set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/webp']::text[];

commit;
