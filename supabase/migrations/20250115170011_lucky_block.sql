-- Deshabilitar temporalmente RLS para la limpieza
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON budgets;
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

-- Asegurar que user_id es NOT NULL y tiene la restricción de llave foránea correcta
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE budgets 
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT fk_user 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Asegurar que existe el índice para user_id
DROP INDEX IF EXISTS idx_budgets_user_id;
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Habilitar RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Crear una única política permisiva para todas las operaciones
CREATE POLICY "Users can manage their own budgets"
ON budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Renombrar columnas usando PL/pgSQL para manejar casos donde las columnas ya existen
DO $$ 
BEGIN
  -- Renombrar monthlyIncome a monthly_income si existe
  BEGIN
    ALTER TABLE budgets RENAME COLUMN "monthlyIncome" TO monthly_income;
  EXCEPTION
    WHEN undefined_column THEN NULL;
    WHEN duplicate_column THEN NULL;
  END;

  -- Renombrar monthlySavingsGoal a monthly_savings_goal si existe
  BEGIN
    ALTER TABLE budgets RENAME COLUMN "monthlySavingsGoal" TO monthly_savings_goal;
  EXCEPTION
    WHEN undefined_column THEN NULL;
    WHEN duplicate_column THEN NULL;
  END;

  -- Renombrar yearlySavingsGoal a yearly_savings_goal si existe
  BEGIN
    ALTER TABLE budgets RENAME COLUMN "yearlySavingsGoal" TO yearly_savings_goal;
  EXCEPTION
    WHEN undefined_column THEN NULL;
    WHEN duplicate_column THEN NULL;
  END;

  -- Renombrar spendingLimit a spending_limit si existe
  BEGIN
    ALTER TABLE budgets RENAME COLUMN "spendingLimit" TO spending_limit;
  EXCEPTION
    WHEN undefined_column THEN NULL;
    WHEN duplicate_column THEN NULL;
  END;
END $$;
