-- ============================================================
-- Sistema alllife — Migration: Módulo de Investimentos
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. PILARES DA ESTRATÉGIA
-- Os 4 pilares padrão: FIIs, Small Caps, Renda Fixa, Ações Div+Val
CREATE TABLE IF NOT EXISTS inv_pilares (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome        TEXT NOT NULL,
    peso_alvo   NUMERIC(5,2) NOT NULL DEFAULT 25,  -- % alvo da carteira
    cor_hex     TEXT,                               -- cor visual (ex: #D97706)
    ordem       INTEGER DEFAULT 0,
    criada_em   TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir os 4 pilares padrão
INSERT INTO inv_pilares (nome, peso_alvo, cor_hex, ordem) VALUES
    ('FIIs',           30, '#D97706', 1),
    ('Small Caps',     25, '#16A34A', 2),
    ('Renda Fixa',     25, '#2563EB', 3),
    ('Ações Div+Val',  20, '#EA580C', 4)
ON CONFLICT DO NOTHING;


-- 2. ATIVOS ELEGÍVEIS
-- Cadastro mestre dos ativos que fazem parte da estratégia
CREATE TABLE IF NOT EXISTS inv_ativos (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pilar_id         UUID NOT NULL REFERENCES inv_pilares(id) ON DELETE RESTRICT,
    ticker           TEXT NOT NULL UNIQUE,
    nome             TEXT,
    segmento         TEXT,                  -- ex: "Shoppings médio porte"
    pvp_ref          NUMERIC(6,4),          -- P/VP de referência (FIIs)
    vpa_ref          NUMERIC(10,2),         -- VPA de referência em R$ (FIIs)
    dy_ref           NUMERIC(5,2),          -- DY de referência em %
    peso_alvo_pilar  NUMERIC(5,2),          -- % alvo dentro do pilar
    contexto_tese    TEXT,                  -- tese de investimento
    status           TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Observação', 'Descontinuado')),
    criada_em        TIMESTAMPTZ DEFAULT NOW(),
    atualizada_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_ativos_ticker  ON inv_ativos (ticker);
CREATE INDEX IF NOT EXISTS idx_inv_ativos_pilar   ON inv_ativos (pilar_id);


-- 3. OPERAÇÕES (Livro-Razão imutável)
-- Toda compra ou venda — append-only, nunca editado
CREATE TABLE IF NOT EXISTS inv_operacoes (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ativo_id        UUID NOT NULL REFERENCES inv_ativos(id) ON DELETE RESTRICT,
    tipo            TEXT NOT NULL CHECK (tipo IN ('compra', 'venda', 'estorno')),
    data            DATE NOT NULL,
    preco_unit      NUMERIC(12,4) NOT NULL,
    quantidade      NUMERIC(12,4) NOT NULL,
    total           NUMERIC(14,2) GENERATED ALWAYS AS (preco_unit * quantidade) STORED,
    origem_capital  TEXT,                   -- "aporte novo", "venda de ativo", "dividendos reinvestidos"
    observacao      TEXT,                   -- racional da decisão
    estorno_de_id   UUID REFERENCES inv_operacoes(id), -- para estornos
    criada_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_ops_ativo ON inv_operacoes (ativo_id);
CREATE INDEX IF NOT EXISTS idx_inv_ops_data  ON inv_operacoes (data DESC);

-- Impedir UPDATE e DELETE (imutabilidade do livro-razão)
CREATE OR REPLACE RULE inv_operacoes_no_update AS
    ON UPDATE TO inv_operacoes DO INSTEAD NOTHING;
CREATE OR REPLACE RULE inv_operacoes_no_delete AS
    ON DELETE TO inv_operacoes DO INSTEAD NOTHING;


-- 4. ALERTAS ATIVOS
-- Flags de divergência e atenção gerados automaticamente
CREATE TABLE IF NOT EXISTS inv_alertas (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ativo_id    UUID REFERENCES inv_ativos(id) ON DELETE CASCADE,
    tipo        TEXT NOT NULL CHECK (tipo IN ('desvio_pilar','concentracao','tese_risco','queda_sem_acao','fora_estrategia')),
    mensagem    TEXT NOT NULL,
    resolvido   BOOLEAN DEFAULT FALSE,
    criada_em   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ATENÇÃO: a coluna "total" é GENERATED ALWAYS AS
-- Isso significa que ao INSERT em inv_operacoes, NÃO passe o
-- campo "total" — ele é calculado automaticamente pelo banco.
-- No código JavaScript, remova "total" do objeto de insert.
-- ============================================================

-- RLS desabilitado (uso pessoal)
ALTER TABLE inv_pilares    DISABLE ROW LEVEL SECURITY;
ALTER TABLE inv_ativos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE inv_operacoes  DISABLE ROW LEVEL SECURITY;
ALTER TABLE inv_alertas    DISABLE ROW LEVEL SECURITY;
