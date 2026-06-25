-- Tabela de portfólios (agrupamento de tarefas)
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    area TEXT,
    descricao TEXT,
    cor TEXT DEFAULT '#6366F1',
    criada_em TIMESTAMPTZ DEFAULT NOW(),
    atualizada_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de áreas customizadas (complementa as hardcoded)
CREATE TABLE IF NOT EXISTS areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    grupo TEXT NOT NULL, -- 'Trabalho', 'Pessoal', 'Faculdade'
    icone TEXT DEFAULT '📁',
    ativo BOOLEAN DEFAULT TRUE,
    criada_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_portfolios_area ON portfolios(area);
CREATE INDEX IF NOT EXISTS idx_areas_grupo ON areas(grupo);
