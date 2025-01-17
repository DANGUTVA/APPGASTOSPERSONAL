/*
  # Corrección de estructura de tabla budgets

  1. Cambios
    - Recrear la tabla con la estructura correcta usando camelCase
    - Mantener datos existentes
    - Asegurar políticas de seguridad

  2. Seguridad
    - Mantener RLS habilitado
    - Política única para todas las operaciones CRUD
*/

-- Crear tabla temporal para mantener los datos existentes
CREATE TABLE temp_budgets AS SELECT * FROM budgets;

-- Eliminar la tabla existente
DROP TABLE budgets;

-- Crear la tabla con la estructura correcta
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "monthlyIncome" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "monthlySavingsGoal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "yearlySavingsGoal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "spendingLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  categories JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Copiar datos de la tabla temporal
INSERT INTO budgets (
  id,
  user_id,
  "monthlyIncome",
  "monthlySavingsGoal",
  "yearlySavingsGoal",
  "spendingLimit",
  categories,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  COALESCE(monthly_income, 0) as "monthlyIncome",
  COALESCE(monthly_savings_goal, 0) as "monthlySavingsGoal",
  COALESCE(yearly_savings_goal, 0) as "yearlySavingsGoal",
  COALESCE(spending_limit, 0) as "spendingLimit",
  categories,
  created_at,
  updated_at
FROM temp_budgets;

-- Eliminar la tabla temporal
DROP TABLE temp_budgets;

-- Crear índice para user_id
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Habilitar RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Crear política única para todas las operaciones
CREATE POLICY "Users can manage their own budgets"
ON budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
