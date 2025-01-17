-- Disable RLS temporarily
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;

-- Clean up any existing duplicate records, keeping only the most recent one per user
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

-- Drop existing unique constraint if it exists
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS unique_user_budget;

-- Add unique constraint for user_id
ALTER TABLE budgets ADD CONSTRAINT unique_user_budget UNIQUE (user_id);

-- Re-enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create a new policy that handles all operations
CREATE POLICY "Users can manage their own budgets"
ON budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- For INSERT: Only allow if no budget exists for this user
    NOT EXISTS (
      SELECT 1 FROM budgets WHERE user_id = auth.uid()
    )
    -- For UPDATE: Allow if the budget belongs to the user
    OR EXISTS (
      SELECT 1 FROM budgets 
      WHERE user_id = auth.uid() 
      AND id = budgets.id
    )
  )
);
