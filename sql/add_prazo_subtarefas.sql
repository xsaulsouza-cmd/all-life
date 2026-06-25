-- Adicionar campo prazo na tabela subtarefas
ALTER TABLE subtarefas ADD COLUMN IF NOT EXISTS prazo DATE;

-- Index para queries por prazo
CREATE INDEX IF NOT EXISTS idx_subtarefas_prazo ON subtarefas(prazo) WHERE prazo IS NOT NULL;
