/*
  # Add unique constraint to budgets table
  
  1. Changes
    - Add unique constraint on user_id to ensure one budget per user
    - Clean up duplicate budgets by keeping the most recently updated one
    - Update RLS policies to reflect the one-budget-per-user model

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with constraints
*/

-- First, clean up duplicate budgets by keeping only the most recent one for each user
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

-- Add unique constraint to ensure one budget per user
ALTER TABLE budgets
ADD CONSTRAINT unique_user_budget UNIQUE (user_id);

-- Update RLS policies to be more specific
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;

CREATE POLICY "Users can manage their own budgets"
ON budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
