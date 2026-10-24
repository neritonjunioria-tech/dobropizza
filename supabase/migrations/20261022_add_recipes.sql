-- Migration para Fichas Técnicas e Gestão de Insumos / CMV
-- Criação das tabelas de Insumos e Fichas Técnicas com suporte a fallback

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  purchase_unit TEXT NOT NULL DEFAULT 'kg',
  purchase_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  purchase_quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
  usage_unit TEXT NOT NULL DEFAULT 'g',
  cost_per_usage_unit NUMERIC(10, 5) NOT NULL DEFAULT 0.00000,
  supplier TEXT,
  current_stock NUMERIC(10, 3),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'G',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  packaging_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  fixed_overhead NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_product_size UNIQUE (product_id, size)
);

-- Habilita RLS
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança permissivas para leitura e gravação
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipe_ingredients' AND policyname = 'Allow public read recipe_ingredients'
  ) THEN
    CREATE POLICY "Allow public read recipe_ingredients" ON recipe_ingredients FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipe_ingredients' AND policyname = 'Allow all write recipe_ingredients'
  ) THEN
    CREATE POLICY "Allow all write recipe_ingredients" ON recipe_ingredients FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_recipes' AND policyname = 'Allow public read product_recipes'
  ) THEN
    CREATE POLICY "Allow public read product_recipes" ON product_recipes FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_recipes' AND policyname = 'Allow all write product_recipes'
  ) THEN
    CREATE POLICY "Allow all write product_recipes" ON product_recipes FOR ALL USING (true);
  END IF;
END $$;
