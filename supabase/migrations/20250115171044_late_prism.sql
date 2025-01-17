/*
  # Fix RLS policies for budgets table

  1. Changes
    - Drop existing policies
    - Create new comprehensive RLS policies
    - Add proper constraints and indexes

  2. Security
    - Enable RLS
    - Add policies for all CRUD operations
    - Ensure proper user access control
*/

-- Disable RLS temporarily for cleanup
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can read their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can insert their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budget" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budget" ON budgets;

-- Clean up orphaned and duplicate records
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

-- Re-enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create specific policies for each operation
CREATE POLICY "Users can read their own budget"
ON budgets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget"
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

-- Ensure proper indexes exist
DROP INDEX IF EXISTS idx_budgets_user_id;
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
