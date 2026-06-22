-- ─────────────────────────────────────────────
-- Google Calendar Integration
-- ─────────────────────────────────────────────

-- Tabela de tokens OAuth (single-user: sempre 1 linha)
CREATE TABLE IF NOT EXISTS google_tokens (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT,
    refresh_token TEXT,
    expiry_date  BIGINT,
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE google_tokens DISABLE ROW LEVEL SECURITY;

-- Coluna para guardar o ID do evento no Google Calendar
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
