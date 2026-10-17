-- Multi-tenant school support for SNHS Gradebook.
-- Apply only after the existing schema and all prior scorebook/term/feedback migrations.
-- Backs existing SNHS data into a default school without deleting student or grade records.

create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 160),
  short_name text not null check (char_length(btrim(short_name)) between 2 and 48),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  contact_email text not null check (char_length(contact_email) <= 254),
  phone text check (phone is null or char_length(phone) <= 32),
  address text check (address is null or char_length(address) <= 240),
  city text check (city is null or char_length(city) <= 100),
  province text check (province is null or char_length(province) <= 100),
  website text check (website is null or char_length(website) <= 240),
  logo_path text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schools_status_slug_idx on public.schools(status, slug);

create table if not exists public.school_memberships (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'teacher' check (role in ('owner', 'admin', 'teacher')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (school_id, user_id)
);
create index if not exists school_memberships_user_idx on public.school_memberships(user_id, status);
create index if not exists school_memberships_school_status_idx on public.school_memberships(school_id, status, role);

-- Create the default SNHS tenant so existing routes and records continue to work.
insert into public.schools(name, short_name, slug, contact_email, city, province, status)
values ('Salvacion National High School', 'SNHS', 'salvacion-national-high-school', coalesce(nullif(current_setting('app.snhs_contact_email', true), ''), 'privacy-contact@example.invalid'), 'Busuanga', 'Palawan', 'active')
on conflict (slug) do nothing;

alter table public.teacher_sections add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.students add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.student_parent_feedback add column if not exists school_id uuid references public.schools(id) on delete restrict;

update public.teacher_sections sec
set school_id = sch.id
from public.schools sch
where sch.slug = 'salvacion-national-high-school' and sec.school_id is null;

update public.students st
set school_id = sec.school_id
from public.teacher_sections sec
where st.section_id = sec.id and st.school_id is null;

update public.student_parent_feedback fb
set school_id = sec.school_id
from public.teacher_sections sec
where fb.section_id = sec.id and fb.school_id is null;

-- All existing teachers are members of the existing SNHS tenant. No new account is
-- automatically enrolled into SNHS by this migration.
insert into public.school_memberships(school_id, user_id, role, status)
select sch.id, tp.id, 'teacher', 'active'
from public.schools sch
cross join public.teacher_profiles tp
where sch.slug = 'salvacion-national-high-school'
on conflict (school_id, user_id) do nothing;

alter table public.teacher_sections alter column school_id set not null;
alter table public.students alter column school_id set not null;

-- Do not silently associate an existing feedback message or student with the wrong school.
-- If this preflight fails, inspect the flagged rows before rerunning the migration.
do $$
begin
  if exists (
    select 1
    from public.students st
    left join public.teacher_sections sec on sec.id = st.section_id
    where sec.id is null or st.school_id is distinct from sec.school_id
  ) then
    raise exception 'Multi-tenant migration stopped: at least one student does not match its section school_id. Repair these student/section assignments, then rerun.';
  end if;
  if exists (
    select 1
    from public.student_parent_feedback fb
    left join public.students st on st.id = fb.student_id
    where st.id is null
       or fb.school_id is distinct from st.school_id
       or fb.section_id is distinct from st.section_id
  ) then
    raise exception 'Multi-tenant migration stopped: at least one parent feedback record does not match its student and section. Repair the association before rerunning.';
  end if;
end;
$$;

alter table public.student_parent_feedback alter column school_id set not null;

-- Composite uniqueness enables database-enforced tenant/section consistency.
create unique index if not exists teacher_sections_school_id_id_uq
  on public.teacher_sections(school_id, id);
create unique index if not exists students_school_id_section_id_id_uq
  on public.students(school_id, section_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.students'::regclass and conname = 'students_school_section_tenant_fk') then
    alter table public.students add constraint students_school_section_tenant_fk
      foreign key (school_id, section_id) references public.teacher_sections(school_id, id) on update restrict on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.student_parent_feedback'::regclass and conname = 'student_parent_feedback_school_student_section_fk') then
    alter table public.student_parent_feedback add constraint student_parent_feedback_school_student_section_fk
      foreign key (school_id, section_id, student_id) references public.students(school_id, section_id, id) on update restrict on delete cascade;
  end if;
end;
$$;

-- A class section belongs to exactly one school; it cannot be moved by editing a row.
create or replace function public.prevent_teacher_section_school_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.school_id is distinct from old.school_id then
    raise exception 'A class section cannot be moved between schools.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_teacher_section_school_change() from public, anon, authenticated;
drop trigger if exists teacher_sections_prevent_school_change on public.teacher_sections;
create trigger teacher_sections_prevent_school_change
before update of school_id on public.teacher_sections
for each row execute function public.prevent_teacher_section_school_change();

-- LRNs are unique within a school, not globally across independent tenants.
alter table public.students drop constraint if exists students_lrn_digest_key;
alter table public.students drop constraint if exists students_access_digest_key;
create unique index if not exists students_school_lrn_digest_uq on public.students(school_id, lrn_digest);
create unique index if not exists students_school_access_digest_uq on public.students(school_id, access_digest);
create index if not exists students_school_section_name_idx on public.students(school_id, section_id, full_name);

-- Catch legacy class names that differ only by capitalization/spacing before creating
-- the normalized per-school unique index, with an actionable migration error.
do $$
begin
  if exists (
    select 1
    from public.teacher_sections
    group by school_id, grade_level, lower(btrim(section_name)), academic_year
    having count(*) > 1
  ) then
    raise exception 'Multi-tenant migration stopped: duplicate class sections differ only by capitalization or spacing. Resolve duplicates, then rerun.';
  end if;
end;
$$;

alter table public.teacher_sections drop constraint if exists teacher_sections_unique_class;
create unique index if not exists teacher_sections_school_class_uq
  on public.teacher_sections(school_id, grade_level, lower(btrim(section_name)), academic_year);
create index if not exists teacher_sections_school_teacher_idx on public.teacher_sections(school_id, teacher_id, grade_level, section_name);
create index if not exists student_parent_feedback_school_teacher_idx on public.student_parent_feedback(school_id, teacher_id, created_at desc);

-- Keep school branding logos private in Storage. The server serves only a chosen
-- tenant's logo through /api/schools/:slug/logo and handles uploads with service role.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('school-logos', 'school-logos', false, 1048576, array['image/webp']::text[])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/webp']::text[];

alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
revoke all on public.schools from public, anon, authenticated;
revoke all on public.school_memberships from public, anon, authenticated;
grant select, insert, update, delete on public.schools to service_role;
grant select, insert, update, delete on public.school_memberships to service_role;

create or replace function public.has_school_role(p_school_id uuid, p_roles text[] default array['owner','admin','teacher']::text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.school_memberships m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

create or replace function public.is_active_school_member(p_school_id uuid, p_user_id uuid, p_roles text[] default array['owner','admin','teacher']::text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.school_memberships m
    where m.school_id = p_school_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and m.role = any(p_roles)
  )
  and (
    p_user_id = (select auth.uid())
    or public.has_school_role(p_school_id, array['owner','admin']::text[])
  );
$$;

create or replace function public.can_access_section(p_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_sections s
    join public.school_memberships m on m.school_id = s.school_id
    where s.id = p_section_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (m.role in ('owner','admin') or s.teacher_id = (select auth.uid()))
  );
$$;

create or replace function public.can_manage_section(p_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_sections s
    join public.school_memberships m on m.school_id = s.school_id
    where s.id = p_section_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (m.role in ('owner','admin') or s.teacher_id = (select auth.uid()))
  );
$$;

create or replace function public.can_access_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students st
    join public.teacher_sections s on s.id = st.section_id and s.school_id = st.school_id
    join public.school_memberships m on m.school_id = st.school_id
    where st.id = p_student_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (m.role in ('owner','admin') or s.teacher_id = (select auth.uid()))
  );
$$;

revoke all on function public.has_school_role(uuid, text[]) from public, anon;
revoke all on function public.is_active_school_member(uuid, uuid, text[]) from public, anon;
revoke all on function public.can_access_section(uuid) from public, anon;
revoke all on function public.can_manage_section(uuid) from public, anon;
revoke all on function public.can_access_student(uuid) from public, anon;
grant execute on function public.has_school_role(uuid, text[]) to authenticated;
grant execute on function public.is_active_school_member(uuid, uuid, text[]) to authenticated;
grant execute on function public.can_access_section(uuid) to authenticated;
grant execute on function public.can_manage_section(uuid) to authenticated;
grant execute on function public.can_access_student(uuid) to authenticated;

-- Replace permissive legacy policies on tenant-owned records with membership-aware policies.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array['teacher_sections','students','subject_grades','student_assessments','student_teacher_comments','gradebook_assessments','gradebook_scores','gradebook_subjects'])
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$$;

-- Section access: teachers can operate on their sections; school owners/admins can manage school sections.
create policy "school members read accessible sections" on public.teacher_sections
  for select to authenticated using (public.can_access_section(id));
create policy "school members create own sections" on public.teacher_sections
  for insert to authenticated with check (
    public.is_active_school_member(school_id, teacher_id, array['owner','admin','teacher']::text[])
    and (
      public.has_school_role(school_id, array['owner','admin']::text[])
      or (teacher_id = (select auth.uid()) and public.has_school_role(school_id, array['teacher']::text[]))
    )
  );
create policy "school members update accessible sections" on public.teacher_sections
  for update to authenticated using (public.can_access_section(id))
  with check (
    public.is_active_school_member(school_id, teacher_id, array['owner','admin','teacher']::text[])
    and (
      public.has_school_role(school_id, array['owner','admin']::text[])
      or (teacher_id = (select auth.uid()) and public.has_school_role(school_id, array['teacher']::text[]))
    )
  );
create policy "school admins or owning teacher delete sections" on public.teacher_sections
  for delete to authenticated using (public.can_access_section(id));

create policy "school members read accessible students" on public.students
  for select to authenticated using (public.can_access_student(id));

create policy "school members read accessible grades" on public.subject_grades
  for select to authenticated using (public.can_access_student(student_id));
create policy "school members insert accessible grades" on public.subject_grades
  for insert to authenticated with check (updated_by = (select auth.uid()) and public.can_access_student(student_id));
create policy "school members update accessible grades" on public.subject_grades
  for update to authenticated using (public.can_access_student(student_id))
  with check (updated_by = (select auth.uid()) and public.can_access_student(student_id));
create policy "school members delete accessible grades" on public.subject_grades
  for delete to authenticated using (public.can_access_student(student_id));

create policy "school members read accessible student assessments" on public.student_assessments
  for select to authenticated using (public.can_access_student(student_id));
create policy "school members insert accessible student assessments" on public.student_assessments
  for insert to authenticated with check (updated_by = (select auth.uid()) and public.can_access_student(student_id));
create policy "school members update accessible student assessments" on public.student_assessments
  for update to authenticated using (public.can_access_student(student_id))
  with check (updated_by = (select auth.uid()) and public.can_access_student(student_id));
create policy "school members delete accessible student assessments" on public.student_assessments
  for delete to authenticated using (public.can_access_student(student_id));

create policy "school members read accessible teacher comments" on public.student_teacher_comments
  for select to authenticated using (public.can_access_student(student_id));
create policy "school members insert accessible teacher comments" on public.student_teacher_comments
  for insert to authenticated with check (updated_by = (select auth.uid()) and public.can_access_student(student_id));
create policy "school members update accessible teacher comments" on public.student_teacher_comments
  for update to authenticated using (public.can_access_student(student_id))
  with check (updated_by = (select auth.uid()) and public.can_access_student(student_id));
create policy "school members delete accessible teacher comments" on public.student_teacher_comments
  for delete to authenticated using (public.can_access_student(student_id));

create policy "school members read accessible scorebook assessments" on public.gradebook_assessments
  for select to authenticated using (public.can_access_section(section_id));
create policy "school members create accessible scorebook assessments" on public.gradebook_assessments
  for insert to authenticated with check (created_by = (select auth.uid()) and public.can_access_section(section_id));
create policy "school members delete accessible scorebook assessments" on public.gradebook_assessments
  for delete to authenticated using (public.can_access_section(section_id));

create policy "school members read accessible scorebook scores" on public.gradebook_scores
  for select to authenticated using (
    exists (
      select 1 from public.gradebook_assessments a
      where a.id = gradebook_scores.assessment_id and public.can_access_section(a.section_id)
        and public.can_access_student(gradebook_scores.student_id)
    )
  );
create policy "school members insert accessible scorebook scores" on public.gradebook_scores
  for insert to authenticated with check (
    updated_by = (select auth.uid()) and exists (
      select 1 from public.gradebook_assessments a
      join public.students st on st.section_id = a.section_id
      where a.id = gradebook_scores.assessment_id and st.id = gradebook_scores.student_id
        and public.can_access_section(a.section_id) and public.can_access_student(st.id)
    )
  );
create policy "school members update accessible scorebook scores" on public.gradebook_scores
  for update to authenticated using (
    exists (
      select 1 from public.gradebook_assessments a
      where a.id = gradebook_scores.assessment_id and public.can_access_section(a.section_id)
    )
  ) with check (
    updated_by = (select auth.uid()) and exists (
      select 1 from public.gradebook_assessments a
      join public.students st on st.section_id = a.section_id
      where a.id = gradebook_scores.assessment_id and st.id = gradebook_scores.student_id
        and public.can_access_section(a.section_id) and public.can_access_student(st.id)
    )
  );
create policy "school members delete accessible scorebook scores" on public.gradebook_scores
  for delete to authenticated using (
    exists (
      select 1 from public.gradebook_assessments a
      where a.id = gradebook_scores.assessment_id and public.can_access_section(a.section_id)
    )
  );

create policy "school members read accessible subjects" on public.gradebook_subjects
  for select to authenticated using (public.can_access_section(section_id));

-- Replace scorebook RPC access checks, preserving their existing behavior while applying tenant membership.
create or replace function public.create_gradebook_subject(p_section_id uuid, p_subject_name text)
returns table(id uuid, subject_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare v_name text; v_id uuid; v_canonical text;
begin
  if auth.uid() is null or not public.can_access_section(p_section_id) then
    raise exception 'Not authorized for this class section' using errcode = '42501';
  end if;
  v_name := regexp_replace(btrim(coalesce(p_subject_name, '')), '\s+', ' ', 'g');
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Subject name must be 2 to 80 characters' using errcode = '22023';
  end if;
  insert into public.gradebook_subjects(section_id, subject_name, created_by)
  values (p_section_id, v_name, (select auth.uid()))
  on conflict (section_id, subject_key) do nothing;
  select s.id, s.subject_name into v_id, v_canonical from public.gradebook_subjects s
  where s.section_id = p_section_id and s.subject_key = lower(v_name) limit 1;
  return query select v_id, v_canonical;
end;
$$;

create or replace function public.add_subject_to_section_roster(p_section_id uuid, p_subject_name text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_subject text; v_inserted integer := 0;
begin
  if auth.uid() is null or not public.can_access_section(p_section_id) then
    raise exception 'Not authorized for this class section' using errcode = '42501';
  end if;
  select subj.subject_name into v_subject from public.gradebook_subjects subj
  where subj.section_id = p_section_id
    and subj.subject_key = lower(regexp_replace(btrim(coalesce(p_subject_name, '')), '\s+', ' ', 'g')) limit 1;
  if v_subject is null then raise exception 'Create the subject before adding it to the roster' using errcode = '22023'; end if;
  insert into public.subject_grades(student_id, subject_name, term_1, term_2, term_3, updated_by, updated_at)
  select st.id, v_subject, null, null, null, (select auth.uid()), now()
  from public.students st where st.section_id = p_section_id
    and not exists (select 1 from public.subject_grades existing where existing.student_id = st.id and lower(btrim(existing.subject_name)) = lower(v_subject))
  on conflict (student_id, subject_name) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;
revoke all on function public.create_gradebook_subject(uuid, text) from public, anon;
revoke all on function public.add_subject_to_section_roster(uuid, text) from public, anon;
grant execute on function public.create_gradebook_subject(uuid, text) to authenticated;
grant execute on function public.add_subject_to_section_roster(uuid, text) to authenticated;

-- The app's server APIs use the service role, so keep sensitive membership and school
-- tables inaccessible directly from anon/authenticated clients.
revoke all on public.school_memberships, public.schools from anon, authenticated;
