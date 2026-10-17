-- GuroVia platform legal notice acknowledgement tracking.
-- Apply after 20261017_multi_tenant_schools.sql and 20261018_multitenant_integrity_hardening.sql.
-- This records school-registration acknowledgements; it is NOT a substitute for a separate school/vendor data-processing agreement.

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

comment on column public.schools.platform_terms_version is 'Version of GuroVia Terms of Service acknowledged at school registration.';
comment on column public.schools.platform_terms_accepted_at is 'Server-recorded time of Terms of Service acknowledgement.';
comment on column public.schools.user_agreement_version is 'Version of Agreement of Use acknowledged at school registration.';
comment on column public.schools.user_agreement_accepted_at is 'Server-recorded time of Agreement of Use acknowledgement.';
comment on column public.schools.privacy_notice_version is 'Version of platform Privacy Policy acknowledged at school registration; does not replace school-specific privacy notice.';
comment on column public.schools.privacy_notice_acknowledged_at is 'Server-recorded time of Privacy Policy acknowledgement.';
comment on column public.schools.cookie_notice_version is 'Version of Cookie Policy acknowledged at school registration. Optional analytics opt-in is recorded separately in the visitor browser.';
comment on column public.schools.cookie_notice_acknowledged_at is 'Server-recorded time of Cookie Policy acknowledgement.';
comment on column public.schools.legal_accepted_by is 'Verified authenticated account that submitted the school-registration legal acknowledgements.';
