/*
  # Corrección final de RLS para budgets

  1. Cambios
    - Reiniciar completamente la configuración de RLS
    - Asegurar que la tabla tiene la configuración correcta
    - Implementar política simplificada
  
  2. Seguridad
    - Habilitar RLS explícitamente
    - Política única permisiva
*/

-- Deshabilitar temporalmente RLS para limpiar la tabla
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Limpiar todas las políticas existentes
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can read their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can insert their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budget" ON budgets;

-- Limpiar duplicados y datos huérfanos
DELETE FROM budgets WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Habilitar RLS nuevamente
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Crear una única política permisiva
CREATE POLICY "Users can manage their own budgets"
ON budgets
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
);
