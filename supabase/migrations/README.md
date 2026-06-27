# Potentially.ai — Database Migrations

Migrations use **Supabase timestamp naming**: `YYYYMMDDHHMMSS_description.sql`

Files run in **lexicographic order** (timestamp ascending). Never rename applied migrations.

## Current sequence

| # | File | Remote status | Purpose |
|---|------|---------------|---------|
| 1 | `20260626145530_initial_schema_tables.sql` | Applied | Extensions, enums, tables |
| 2 | `20260626145545_initial_schema_indexes_and_functions.sql` | Applied | Indexes, triggers, functions |
| 3 | `20260626145601_rls_policies.sql` | Applied | Row Level Security |
| 4 | `20260626145704_harden_function_grants.sql` | Applied | Function grants & search_path |
| 5 | `20260626150000_vector_index.sql` | Pending | HNSW index on `contacts.embedding` |

## Rules

1. **Never edit** a migration that has already been applied to production.
2. **Always add** new changes as a new timestamped file (use `date +%Y%m%d%H%M%S` or current UTC time).
3. **One concern per migration** when possible (schema / RLS / indexes / data).
4. **DDL** → use `supabase db push` or MCP `apply_migration`.
5. **Seed data** → use `supabase/seed.sql` or `scripts/seed.ts`, not migrations.
6. Run `npm run db:validate` before committing migration changes.

## Apply migrations

```bash
# Link project (first time)
npx supabase link --project-ref rfrwuuwfnlgmxkmvmqrt

# Push pending local migrations
npx supabase db push

# Or via MCP (Cursor Supabase integration)
# apply_migration with name + query
```

## Verify remote state

```bash
npx supabase migration list
```

Remote registry should match filenames in this folder (version = timestamp prefix).
