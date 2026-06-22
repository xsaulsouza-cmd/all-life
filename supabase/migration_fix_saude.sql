-- Fix: adiciona colunas faltantes nas tabelas de saúde
-- Rodar no Supabase SQL Editor

-- 1. treinos — adicionar intensidade e concluido
ALTER TABLE treinos
    ADD COLUMN IF NOT EXISTS intensidade TEXT DEFAULT 'moderada',
    ADD COLUMN IF NOT EXISTS concluido   BOOLEAN DEFAULT TRUE;

-- 2. habitos — adicionar descricao e lembrete
ALTER TABLE habitos
    ADD COLUMN IF NOT EXISTS descricao TEXT,
    ADD COLUMN IF NOT EXISTS lembrete  TEXT;

-- 3. habitos — expandir constraint de frequencia para incluir 'mensal'
ALTER TABLE habitos DROP CONSTRAINT IF EXISTS habitos_frequencia_check;
ALTER TABLE habitos ADD CONSTRAINT habitos_frequencia_check
    CHECK (frequencia IN ('diária', 'semanal', 'mensal'));
