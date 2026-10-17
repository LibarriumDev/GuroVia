-- GuroVia class-wide E-Class Record scorebook.
-- Canonical grading key: term_number (Term 1-3).
-- Safe for the legacy single-school migration order and completed multi-tenant schema.

create table if not exists public.gradebook_assessments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.teacher_sections (id) on delete cascade,
  subject_name text not null check (char_length(btrim(subject_name)) between 2 and 80),
  term_number smallint not null check (term_number between 1 and 3),
  category text not null check (category in ('Written Works', 'Performance Tasks', 'Summative Test/Exam')),
  assessment_name text not null check (char_length(btrim(assessment_name)) between 2 and 100),
  max_score numeric(8,2) not null check (max_score > 0 and max_score <= 100000),
  assessed_on date not null default current_date,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint gradebook_assessments_unique_name unique (section_id, subject_name, term_number, category, assessment_name)
);

create table if not exists public.gradebook_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.gradebook_assessments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  -- NULL means no score has been entered; zero is a valid score.
  score numeric(8,2) check (score is null or score >= 0),
  updated_by uuid not null references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint gradebook_scores_unique_student_assessment unique (assessment_id, student_id)
);

-- Repair existing pre-trimester installations where this table still has grading_period.
-- Preserve legacy Term 4 values temporarily; 20261015_terms_mobile_ux.sql consolidates
-- old periods into the supported three-term model and handles collisions safely.
do $$
declare
  v_old_exists boolean;
  v_new_exists boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gradebook_assessments' and column_name = 'grading_period'
  ) into v_old_exists;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gradebook_assessments' and column_name = 'term_number'
  ) into v_new_exists;

  if v_old_exists and not v_new_exists then
    alter table public.gradebook_assessments drop constraint if exists gradebook_assessments_unique_name;
    alter table public.gradebook_assessments drop constraint if exists gradebook_assessments_grading_period_check;
    alter table public.gradebook_assessments drop constraint if exists gradebook_assessments_term_number_check;
    alter table public.gradebook_assessments rename column grading_period to term_number;
    alter table public.gradebook_assessments
      add constraint gradebook_assessments_term_number_check check (term_number between 1 and 4),
      add constraint gradebook_assessments_unique_name unique (section_id, subject_name, term_number, category, assessment_name);
  end if;
end;
$$;

create index if not exists gradebook_assessments_section_subject_idx
  on public.gradebook_assessments (section_id, subject_name, term_number, category, created_at);
create index if not exists gradebook_scores_assessment_idx
  on public.gradebook_scores (assessment_id, student_id);

alter table public.gradebook_assessments enable row level security;
alter table public.gradebook_scores enable row level security;

-- A score must belong to the same section as the assessment and cannot exceed its maximum.
create or replace function public.validate_gradebook_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment_section uuid;
  v_student_section uuid;
  v_max_score numeric;
begin
  select a.section_id, a.max_score
    into v_assessment_section, v_max_score
    from public.gradebook_assessments as a
   where a.id = new.assessment_id;

  select s.section_id
    into v_student_section
    from public.students as s
   where s.id = new.student_id;

  if v_assessment_section is null or v_student_section is null then
    raise exception 'Assessment and student must exist';
  end if;

  if v_assessment_section <> v_student_section then
    raise exception 'Student must belong to the assessment class section';
  end if;

  if new.score is not null and (new.score < 0 or new.score > v_max_score) then
    raise exception 'Score must be between zero and the assessment maximum';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.validate_gradebook_score() from public, anon, authenticated;
drop trigger if exists gradebook_scores_validate_before_write on public.gradebook_scores;
create trigger gradebook_scores_validate_before_write
before insert or update on public.gradebook_scores
for each row execute function public.validate_gradebook_score();

-- Policies are tenant-aware when the GuroVia authorization helpers exist.
-- Otherwise use the pre-multi-tenant teacher-to-section rules; the multi-tenant migration
-- later replaces them in sequence. This prevents re-running this file on GuroVia from
-- restoring policies that ignore active school membership.
drop policy if exists "Teachers read own class scorebook assessments" on public.gradebook_assessments;
drop policy if exists "Teachers create own class scorebook assessments" on public.gradebook_assessments;
drop policy if exists "Teachers delete own class scorebook assessments" on public.gradebook_assessments;
drop policy if exists "Teachers read own class scorebook scores" on public.gradebook_scores;
drop policy if exists "Teachers insert own class scorebook scores" on public.gradebook_scores;
drop policy if exists "Teachers update own class scorebook scores" on public.gradebook_scores;
drop policy if exists "Teachers delete own class scorebook scores" on public.gradebook_scores;
drop policy if exists "school members read accessible scorebook assessments" on public.gradebook_assessments;
drop policy if exists "school members create accessible scorebook assessments" on public.gradebook_assessments;
drop policy if exists "school members delete accessible scorebook assessments" on public.gradebook_assessments;
drop policy if exists "school members read accessible scorebook scores" on public.gradebook_scores;
drop policy if exists "school members insert accessible scorebook scores" on public.gradebook_scores;
drop policy if exists "school members update accessible scorebook scores" on public.gradebook_scores;
drop policy if exists "school members delete accessible scorebook scores" on public.gradebook_scores;

do $$
begin
  if to_regprocedure('public.can_access_section(uuid)') is not null then
    if to_regprocedure('public.can_access_student(uuid)') is null then
      raise exception 'GuroVia tenant authorization is partially installed: can_access_student(uuid) is missing. Apply the tenant migrations before retrying.';
    end if;
    execute $policy$
      create policy "school members read accessible scorebook assessments"
      on public.gradebook_assessments for select to authenticated
      using (public.can_access_section(section_id))
    $policy$;
    execute $policy$
      create policy "school members create accessible scorebook assessments"
      on public.gradebook_assessments for insert to authenticated
      with check (created_by = (select auth.uid()) and public.can_access_section(section_id))
    $policy$;
    execute $policy$
      create policy "school members delete accessible scorebook assessments"
      on public.gradebook_assessments for delete to authenticated
      using (public.can_access_section(section_id))
    $policy$;
    execute $policy$
      create policy "school members read accessible scorebook scores"
      on public.gradebook_scores for select to authenticated
      using (exists (
        select 1
        from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        where a.id = gradebook_scores.assessment_id
          and public.can_access_section(a.section_id)
          and public.can_access_student(st.id)
      ))
    $policy$;
    execute $policy$
      create policy "school members insert accessible scorebook scores"
      on public.gradebook_scores for insert to authenticated
      with check (updated_by = (select auth.uid()) and exists (
        select 1
        from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        where a.id = gradebook_scores.assessment_id
          and public.can_access_section(a.section_id)
          and public.can_access_student(st.id)
      ))
    $policy$;
    execute $policy$
      create policy "school members update accessible scorebook scores"
      on public.gradebook_scores for update to authenticated
      using (exists (
        select 1
        from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        where a.id = gradebook_scores.assessment_id
          and public.can_access_section(a.section_id)
          and public.can_access_student(st.id)
      ))
      with check (updated_by = (select auth.uid()) and exists (
        select 1
        from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        where a.id = gradebook_scores.assessment_id
          and public.can_access_section(a.section_id)
          and public.can_access_student(st.id)
      ))
    $policy$;
    execute $policy$
      create policy "school members delete accessible scorebook scores"
      on public.gradebook_scores for delete to authenticated
      using (exists (
        select 1
        from public.gradebook_assessments a
        where a.id = gradebook_scores.assessment_id
          and public.can_access_section(a.section_id)
      ))
    $policy$;
  else
    execute $policy$
      create policy "Teachers read own class scorebook assessments"
      on public.gradebook_assessments for select to authenticated
      using (exists (
        select 1 from public.teacher_sections sec
        where sec.id = gradebook_assessments.section_id and sec.teacher_id = (select auth.uid())
      ))
    $policy$;
    execute $policy$
      create policy "Teachers create own class scorebook assessments"
      on public.gradebook_assessments for insert to authenticated
      with check (created_by = (select auth.uid()) and exists (
        select 1 from public.teacher_sections sec
        where sec.id = gradebook_assessments.section_id and sec.teacher_id = (select auth.uid())
      ))
    $policy$;
    execute $policy$
      create policy "Teachers delete own class scorebook assessments"
      on public.gradebook_assessments for delete to authenticated
      using (exists (
        select 1 from public.teacher_sections sec
        where sec.id = gradebook_assessments.section_id and sec.teacher_id = (select auth.uid())
      ))
    $policy$;
    execute $policy$
      create policy "Teachers read own class scorebook scores"
      on public.gradebook_scores for select to authenticated
      using (exists (
        select 1 from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        join public.teacher_sections sec on sec.id = a.section_id
        where a.id = gradebook_scores.assessment_id and sec.teacher_id = (select auth.uid())
      ))
    $policy$;
    execute $policy$
      create policy "Teachers insert own class scorebook scores"
      on public.gradebook_scores for insert to authenticated
      with check (updated_by = (select auth.uid()) and exists (
        select 1 from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        join public.teacher_sections sec on sec.id = a.section_id
        where a.id = gradebook_scores.assessment_id and sec.teacher_id = (select auth.uid())
      ))
    $policy$;
    execute $policy$
      create policy "Teachers update own class scorebook scores"
      on public.gradebook_scores for update to authenticated
      using (exists (
        select 1 from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        join public.teacher_sections sec on sec.id = a.section_id
        where a.id = gradebook_scores.assessment_id and sec.teacher_id = (select auth.uid())
      ))
      with check (updated_by = (select auth.uid()) and exists (
        select 1 from public.gradebook_assessments a
        join public.students st on st.id = gradebook_scores.student_id and st.section_id = a.section_id
        join public.teacher_sections sec on sec.id = a.section_id
        where a.id = gradebook_scores.assessment_id and sec.teacher_id = (select auth.uid())
      ))
    $policy$;
    execute $policy$
      create policy "Teachers delete own class scorebook scores"
      on public.gradebook_scores for delete to authenticated
      using (exists (
        select 1 from public.gradebook_assessments a
        join public.teacher_sections sec on sec.id = a.section_id
        where a.id = gradebook_scores.assessment_id and sec.teacher_id = (select auth.uid())
      ))
    $policy$;
  end if;
end;
$$;

grant select, insert, delete on public.gradebook_assessments to authenticated;
grant select, insert, update, delete on public.gradebook_scores to authenticated;
grant select, insert, delete on public.gradebook_assessments to service_role;
grant select, insert, update, delete on public.gradebook_scores to service_role;
