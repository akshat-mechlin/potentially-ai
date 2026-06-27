-- Migration 5/5: Vector similarity index for contact embeddings
-- Applied to remote: pending (run via supabase db push or MCP apply_migration)
-- Uses HNSW so the index can be created before contacts are seeded.

CREATE INDEX IF NOT EXISTS idx_contacts_embedding
  ON contacts USING hnsw (embedding vector_cosine_ops);
