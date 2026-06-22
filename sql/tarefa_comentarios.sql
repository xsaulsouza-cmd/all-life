-- Tabela de comentários de tarefas
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tarefa_comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID REFERENCES tarefas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tarefa_comentarios DISABLE ROW LEVEL SECURITY;
