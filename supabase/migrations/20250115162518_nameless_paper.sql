/*
  # Actualización de políticas RLS para la tabla budgets

  1. Cambios
    - Limpieza de presupuestos duplicados
    - Actualización de políticas RLS para operaciones específicas
  
  2. Seguridad
    - Políticas separadas para SELECT, INSERT, UPDATE y DELETE
    - Verificación de auth.uid() para todas las operaciones
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

-- Create more specific policies for each operation
CREATE POLICY "Users can read their own budget"
ON budgets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget"
ON budgets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

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
