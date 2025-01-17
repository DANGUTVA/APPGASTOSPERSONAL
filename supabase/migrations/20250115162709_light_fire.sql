/*
  # Corrección de políticas RLS para la tabla budgets

  1. Cambios
    - Simplificación de políticas RLS
    - Política única para todas las operaciones
  
  2. Seguridad
    - Verificación de auth.uid() para todas las operaciones
    - Mantenimiento de la restricción de un presupuesto por usuario
*/

-- First, clean up duplicate budgets by keeping only the most recent one for each user
DO $$ 
BEGIN
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
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can read their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can insert their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budget" ON budgets;

-- Create a single comprehensive policy
CREATE POLICY "Users can manage their own budgets"
ON budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
