-- Follow-up hardening for the multi-tenant school migration.
-- Safe to apply after 20261017_multi_tenant_schools.sql, including deployments
-- where the first version of that migration has already been applied.

-- Fail closed if legacy records would cross a school boundary. Do not repair these
-- relationships automatically because that could change which school owns a record.
do $$
begin
  if exists (
    select 1 from public.students st
    left join public.teacher_sections sec on sec.id = st.section_id
    where sec.id is null or st.school_id is distinct from sec.school_id
  ) then
    raise exception 'Tenant hardening stopped: at least one student does not match its section school_id. Repair the student/section association, then rerun.';
  end if;
  if exists (
    select 1 from public.student_parent_feedback fb
    left join public.students st on st.id = fb.student_id
    where st.id is null
       or fb.school_id is distinct from st.school_id
       or fb.section_id is distinct from st.section_id
  ) then
    raise exception 'Tenant hardening stopped: at least one parent feedback record does not match its student and section. Repair the association, then rerun.';
  end if;
end;
$$;

alter table public.teacher_sections alter column school_id set not null;
alter table public.students alter column school_id set not null;
alter table public.student_parent_feedback alter column school_id set not null;

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

-- A section belongs to one school for its lifetime; use an explicit process to migrate
-- a class rather than changing a tenant foreign key with live student records.
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

-- This helper is used by RLS policies to validate the section's assigned teacher.
-- Ordinary teachers can test only their own membership; school owners/admins can
-- validate assignments within the school they administer.
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
revoke all on function public.is_active_school_member(uuid, uuid, text[]) from public, anon;
grant execute on function public.is_active_school_member(uuid, uuid, text[]) to authenticated;

-- Replace the initial section policies so a section cannot be assigned to a user who
-- is not an active member of the same school. Owners/admins can assign sections to
-- other active school members; teachers can create/update only their own sections.
drop policy if exists "school members create own sections" on public.teacher_sections;
create policy "school members create own sections" on public.teacher_sections
  for insert to authenticated with check (
    public.is_active_school_member(school_id, teacher_id, array['owner','admin','teacher']::text[])
    and (
      public.has_school_role(school_id, array['owner','admin']::text[])
      or (teacher_id = (select auth.uid()) and public.has_school_role(school_id, array['teacher']::text[]))
    )
  );

drop policy if exists "school members update accessible sections" on public.teacher_sections;
create policy "school members update accessible sections" on public.teacher_sections
  for update to authenticated using (public.can_access_section(id))
  with check (
    public.is_active_school_member(school_id, teacher_id, array['owner','admin','teacher']::text[])
    and (
      public.has_school_role(school_id, array['owner','admin']::text[])
      or (teacher_id = (select auth.uid()) and public.has_school_role(school_id, array['teacher']::text[]))
    )
  );
