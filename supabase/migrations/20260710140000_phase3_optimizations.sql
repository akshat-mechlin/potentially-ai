-- Phase 3: thread inbox stats, admin aggregates, contact growth

CREATE OR REPLACE FUNCTION get_thread_inbox_stats(
  p_thread_ids uuid[],
  p_exclude_sender_only boolean DEFAULT false
)
RETURNS TABLE (
  thread_id uuid,
  message_count int,
  last_body text,
  last_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    tm.thread_id,
    count(*)::int AS message_count,
    (array_agg(tm.body ORDER BY tm.created_at DESC))[1] AS last_body,
    max(tm.created_at) AS last_created_at
  FROM thread_messages tm
  WHERE tm.thread_id = ANY(p_thread_ids)
    AND (
      NOT p_exclude_sender_only
      OR NOT (
        tm.message_type = 'system'
        AND COALESCE(tm.metadata->>'event', '') <> 'calendly_booked'
        AND COALESCE(tm.metadata->>'audience', '') <> 'all'
        AND (
          COALESCE(tm.metadata->>'audience', '') = 'sender'
          OR COALESCE(tm.metadata->>'channel', '') = 'email'
          OR tm.body LIKE 'Email sent:%'
        )
      )
    )
  GROUP BY tm.thread_id;
$$;

CREATE OR REPLACE FUNCTION get_admin_workspace_stats()
RETURNS TABLE (
  workspace_id uuid,
  name text,
  plan text,
  member_count int,
  contact_count int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    w.id,
    w.name,
    w.plan,
    (SELECT count(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id),
    (SELECT count(*)::int FROM contacts c WHERE c.workspace_id = w.id)
  FROM workspaces w
  ORDER BY w.name;
$$;

CREATE OR REPLACE FUNCTION get_admin_user_workspace_counts()
RETURNS TABLE (
  user_id uuid,
  workspace_count int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT wm.user_id, count(*)::int
  FROM workspace_members wm
  GROUP BY wm.user_id;
$$;

CREATE OR REPLACE FUNCTION get_workspace_contact_growth(
  p_workspace_ids uuid[],
  p_months int DEFAULT 6
)
RETURNS TABLE (
  month_label text,
  contact_count int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now()) - ((GREATEST(p_months, 1) - 1) || ' months')::interval,
      date_trunc('month', now()),
      '1 month'::interval
    ) AS month_start
  )
  SELECT
    to_char(m.month_start, 'Mon') AS month_label,
    (
      SELECT count(*)::int
      FROM contacts c
      WHERE c.workspace_id = ANY(p_workspace_ids)
        AND c.created_at < m.month_start + interval '1 month'
    ) AS contact_count
  FROM months m
  ORDER BY m.month_start;
$$;

GRANT EXECUTE ON FUNCTION public.get_thread_inbox_stats(uuid[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_workspace_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_workspace_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_contact_growth(uuid[], int) TO authenticated;
