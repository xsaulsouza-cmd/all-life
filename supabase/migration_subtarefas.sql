-- Subtarefas inline por tarefa
CREATE TABLE IF NOT EXISTS subtarefas (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id  UUID        NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    nome       TEXT        NOT NULL,
    concluido  BOOLEAN     NOT NULL DEFAULT FALSE,
    criada_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por tarefa (mais comum)
CREATE INDEX IF NOT EXISTS idx_subtarefas_tarefa_id ON subtarefas(tarefa_id);

-- Sem RLS por enquanto (padrão do sistema)
ALTER TABLE subtarefas DISABLE ROW LEVEL SECURITY;
