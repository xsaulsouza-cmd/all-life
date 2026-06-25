-- Vínculos entre tarefas e registros de saúde/finanças
CREATE TABLE IF NOT EXISTS tarefa_vinculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tarefa_id UUID NOT NULL,
    tipo TEXT NOT NULL, -- 'treino' | 'meta' | 'transacao' | 'desafio'
    referencia_id UUID NOT NULL,
    referencia_nome TEXT, -- nome cacheado para exibição rápida
    criada_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarefa_vinculos_tarefa ON tarefa_vinculos(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_vinculos_ref ON tarefa_vinculos(tipo, referencia_id);
