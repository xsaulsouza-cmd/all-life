-- Adicionar campo calorias_gastas na tabela treinos
ALTER TABLE treinos ADD COLUMN IF NOT EXISTS calorias_gastas INTEGER;
