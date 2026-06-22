-- ============================================================
-- Sistema Saul — Migration: Saúde & Esportes
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 0. CATÁLOGO DE ALIMENTOS
-- Alimentos salvos com macros por porção — base para autocomplete
CREATE TABLE IF NOT EXISTS nutricao_alimentos (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome        TEXT NOT NULL,
    porcao_g    NUMERIC(7,1),          -- tamanho da porção em gramas (opcional)
    porcao_desc TEXT,                  -- ex: "1 filé", "100g", "1 xícara"
    calorias    NUMERIC(7,1),          -- kcal por porção
    proteina    NUMERIC(6,1),          -- g
    carbo       NUMERIC(6,1),          -- g
    gordura     NUMERIC(6,1),          -- g
    fibra       NUMERIC(5,1),          -- g (opcional)
    criada_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Busca por nome eficiente (ILIKE)
CREATE INDEX IF NOT EXISTS idx_alimentos_nome ON nutricao_alimentos (nome);

-- Sem RLS (uso pessoal)
ALTER TABLE nutricao_alimentos DISABLE ROW LEVEL SECURITY;


-- 1. MÉTRICAS CORPORAIS
-- Registro diário de indicadores físicos/biométricos
CREATE TABLE IF NOT EXISTS metricas_corporais (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data        DATE NOT NULL DEFAULT CURRENT_DATE,
    peso        NUMERIC(5,2),          -- kg
    gordura_pct NUMERIC(5,2),          -- % gordura corporal
    sono_horas  NUMERIC(4,2),          -- horas de sono
    hrv         INTEGER,               -- variabilidade da frequência cardíaca (ms)
    energia     SMALLINT CHECK (energia BETWEEN 1 AND 5),  -- nível subjetivo 1-5
    pressao     TEXT,                  -- ex: "120/80"
    fc_repouso  INTEGER,               -- batimentos por minuto em repouso
    notas       TEXT,
    criada_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas por data
CREATE INDEX IF NOT EXISTS idx_metricas_data ON metricas_corporais (data DESC);

-- Constraint: uma entrada por dia
CREATE UNIQUE INDEX IF NOT EXISTS idx_metricas_data_unique ON metricas_corporais (data);


-- 2. NUTRIÇÃO — REGISTROS
-- Cada refeição/alimento consumido no dia
CREATE TABLE IF NOT EXISTS nutricao_registros (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data        DATE NOT NULL DEFAULT CURRENT_DATE,
    refeicao    TEXT NOT NULL CHECK (refeicao IN ('cafe','almoco','lanche','jantar','pre_treino','pos_treino','outro')),
    descricao   TEXT NOT NULL,         -- nome do alimento/prato
    calorias    NUMERIC(7,1),          -- kcal
    proteina    NUMERIC(6,1),          -- g
    carbo       NUMERIC(6,1),          -- g carboidratos
    gordura     NUMERIC(6,1),          -- g gordura
    fibra       NUMERIC(5,1),          -- g fibra (opcional)
    criada_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar registros por data
CREATE INDEX IF NOT EXISTS idx_nutricao_data ON nutricao_registros (data DESC);


-- 3. NUTRIÇÃO — METAS
-- Metas diárias de macronutrientes (única linha por usuário)
CREATE TABLE IF NOT EXISTS nutricao_metas (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    calorias    INTEGER DEFAULT 2000,  -- kcal/dia
    proteina    INTEGER DEFAULT 150,   -- g/dia
    carbo       INTEGER DEFAULT 250,   -- g/dia
    gordura     INTEGER DEFAULT 65,    -- g/dia
    fibra       INTEGER DEFAULT 25,    -- g/dia
    atualizada_em TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir meta padrão se ainda não existir
INSERT INTO nutricao_metas (calorias, proteina, carbo, gordura)
SELECT 2000, 150, 250, 65
WHERE NOT EXISTS (SELECT 1 FROM nutricao_metas);


-- ============================================================
-- Verificar tabelas existentes (habitos, treinos, etc.)
-- As tabelas abaixo devem existir da migration anterior.
-- Se não existirem, descomentar e rodar:
-- ============================================================

/*
CREATE TABLE IF NOT EXISTS habitos (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome        TEXT NOT NULL,
    frequencia  TEXT DEFAULT 'diária' CHECK (frequencia IN ('diária','semanal')),
    dias_semana TEXT[],                -- para semanal: ['segunda','quarta','sexta']
    categoria   TEXT,
    ativo       BOOLEAN DEFAULT TRUE,
    criada_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habitos_registro (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habito_id   UUID REFERENCES habitos(id) ON DELETE CASCADE,
    data        DATE NOT NULL,
    concluido   BOOLEAN DEFAULT TRUE,
    criada_em   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (habito_id, data)
);

CREATE TABLE IF NOT EXISTS treinos (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    modalidade       TEXT NOT NULL CHECK (modalidade IN ('musculação','jiu-jitsu','pilates','corrida','outro')),
    data             DATE NOT NULL DEFAULT CURRENT_DATE,
    duracao_minutos  INTEGER,
    notas            TEXT,
    criada_em        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metas (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo       TEXT NOT NULL,
    descricao    TEXT,
    valor_atual  NUMERIC DEFAULT 0,
    valor_alvo   NUMERIC,
    unidade      TEXT,
    prazo        DATE,
    status       TEXT DEFAULT 'ativa' CHECK (status IN ('ativa','concluída','pausada')),
    area         TEXT,
    criada_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS desafios (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo       TEXT NOT NULL,
    descricao    TEXT,
    data_inicio  DATE,
    data_fim     DATE,
    progresso    INTEGER DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
    status       TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','concluído','abandonado')),
    criada_em    TIMESTAMPTZ DEFAULT NOW()
);
*/

-- ============================================================
-- RLS: desabilitar para uso pessoal (sem autenticação)
-- ============================================================
ALTER TABLE metricas_corporais    DISABLE ROW LEVEL SECURITY;
ALTER TABLE nutricao_registros    DISABLE ROW LEVEL SECURITY;
ALTER TABLE nutricao_metas        DISABLE ROW LEVEL SECURITY;
