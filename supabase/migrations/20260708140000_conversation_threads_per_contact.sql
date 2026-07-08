-- One conversation thread per contact per workspace (merge existing duplicates).

WITH ranked AS (
  SELECT
    id,
    workspace_id,
    contact_id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, contact_id
      ORDER BY last_message_at DESC NULLS LAST, created_at ASC
    ) AS rn
  FROM conversation_threads
  WHERE contact_id IS NOT NULL
),
keepers AS (
  SELECT id AS keep_id, workspace_id, contact_id
  FROM ranked
  WHERE rn = 1
),
dupes AS (
  SELECT r.id AS dupe_id, k.keep_id
  FROM ranked r
  INNER JOIN keepers k
    ON k.workspace_id = r.workspace_id
   AND k.contact_id = r.contact_id
  WHERE r.rn > 1
)
UPDATE thread_messages tm
SET thread_id = d.keep_id
FROM dupes d
WHERE tm.thread_id = d.dupe_id;

WITH ranked AS (
  SELECT
    id,
    workspace_id,
    contact_id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, contact_id
      ORDER BY last_message_at DESC NULLS LAST, created_at ASC
    ) AS rn
  FROM conversation_threads
  WHERE contact_id IS NOT NULL
)
DELETE FROM conversation_threads ct
USING ranked r
WHERE ct.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_threads_workspace_contact
  ON conversation_threads (workspace_id, contact_id)
  WHERE contact_id IS NOT NULL;
