-- Adicionar campos de meta de treino nos desafios
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'geral'; -- 'geral' | 'treino'
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS meta_treinos INTEGER; -- quantidade alvo de treinos
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS meta_tipo TEXT; -- 'por_semana' | 'por_mes' | 'total'
ALTER TABLE desafios ADD COLUMN IF NOT EXISTS modalidades TEXT[]; -- ex: ['musculação', 'jiu-jitsu']
