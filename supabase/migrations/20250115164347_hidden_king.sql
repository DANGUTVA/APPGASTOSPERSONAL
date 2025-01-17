/*
  # Corrección final de políticas RLS y manejo de transacciones

  1. Cambios
    - Simplificación de políticas RLS
    - Mejora en el manejo de transacciones
    - Corrección de permisos de usuario
    - Limpieza de datos inconsistentes

  2. Seguridad
    - Políticas RLS más estrictas y específicas
    - Validación de usuario autenticado
    - Restricciones de integridad referencial
*/

BEGIN;

  -- Deshabilitar temporalmente RLS
  ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

  -- Eliminar todas las políticas existentes
  DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON budgets;
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
  ALTER TABLE budgets DROP CONSTRAINT IF EXISTS fk_user;
  ALTER TABLE budgets 
    ALTER COLUMN user_id SET NOT NULL,
    ADD CONSTRAINT fk_user 
      FOREIGN KEY (user_id) 
      REFERENCES auth.users(id) 
      ON DELETE CASCADE;

  -- Asegurar que existe el índice para user_id
  CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

  -- Habilitar RLS
  ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

  -- Crear políticas específicas para cada operación
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

COMMIT;
