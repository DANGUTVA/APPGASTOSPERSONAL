/*
  # Corrección completa de la tabla budgets y RLS

  1. Cambios
    - Asegurar que RLS está habilitado
    - Limpiar todas las políticas existentes
    - Crear nueva política simplificada
    - Verificar restricciones de usuario
  
  2. Seguridad
    - Habilitar RLS explícitamente
    - Política única para todas las operaciones
*/

-- Asegurar que RLS está habilitado
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Limpiar todas las políticas existentes
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can read their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can insert their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budget" ON budgets;

-- Limpiar duplicados
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

-- Crear una única política simplificada que cubra todas las operaciones
CREATE POLICY "Users can manage their own budgets"
ON budgets
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
