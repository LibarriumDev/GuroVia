# Class Scorebook SQL Error Fix

## Why the error happened

The older `20261015_class_scorebook.sql` referenced `grading_period` (the former four-period key). The current GuroVia schema uses `term_number` with exactly three terms. Because `CREATE TABLE IF NOT EXISTS` does not modify a table that already exists, PostgreSQL skipped the old table definition and later failed when the old index tried to reference the non-existent `grading_period` column.

## Corrected file

Use the corrected `supabase/migrations/20261015_class_scorebook.sql` included in this release. It uses `term_number`, supports Term 1–3, handles a legacy `grading_period` column if present, and recreates tenant-aware RLS policies when GuroVia's `can_access_section` and `can_access_student` authorization helpers are installed. It refuses to fall back to legacy policies if it detects a partially installed tenant authorization layer.

## What to do in Supabase SQL Editor

1. Back up the database before running schema/migration SQL.
2. Replace the old SQL text with the corrected file from this release. Do not paste the old copy from an earlier SNHS-only project.
3. Run the corrected script once. It is designed to be rerunnable for a database that has the expected GuroVia base tables and authorization helpers.
4. If you already ran `supabase/schema.sql` and all GuroVia migrations, the `gradebook_assessments` and `gradebook_scores` tables, indexes, trigger, and policies should already exist. In that case you do not need to rerun this migration merely to fix the error; verify the current schema first.

## Read-only diagnostic query

Run this query first if you want to confirm the active column names:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'gradebook_assessments'
order by ordinal_position;
```

The current GuroVia schema should include `term_number` and should not need `grading_period` for active operations.

To verify existing policies:

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('gradebook_assessments', 'gradebook_scores')
order by tablename, policyname;
```

After the fix, confirm that policies use GuroVia's tenant authorization helpers. Never disable row-level security as a workaround.
