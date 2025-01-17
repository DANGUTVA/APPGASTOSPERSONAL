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

-- Create separate policies for each operation type to avoid recursion
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
    SELECT 1 
    FROM budgets 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own budget"
ON budgets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget"
ON budgets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
