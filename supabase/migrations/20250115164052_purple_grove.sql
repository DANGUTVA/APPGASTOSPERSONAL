-- Deshabilitar temporalmente RLS para la limpieza
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Limpiar todas las políticas existentes
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can read their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can insert their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budget" ON budgets;

-- Limpiar datos huérfanos y duplicados
DELETE FROM budgets WHERE user_id NOT IN (SELECT id FROM auth.users);

WITH ranked_budgets AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM budgets
)
DELETE FROM budgets 
WHERE id IN (
  SELECT id 
  FROM ranked_budgets 
  WHERE rn > 1
);

-- Habilitar RLS nuevamente
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Crear políticas específicas para cada operación
CREATE POLICY "Users can read their own budget"
ON budgets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget"
ON budgets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM budgets 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own budget"
ON budgets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget"
ON budgets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Asegurar que la columna user_id es NOT NULL
ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;
