-- Deshabilitar temporalmente RLS
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can read their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can create their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budget" ON budgets;

-- Limpiar datos huérfanos
DELETE FROM budgets WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Asegurar que solo hay un presupuesto por usuario
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

-- Asegurar que user_id es NOT NULL y tiene la restricción de llave foránea correcta
ALTER TABLE budgets 
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Habilitar RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Crear una única política simple para todas las operaciones
CREATE POLICY "Enable all operations for users based on user_id"
ON budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
