/*
  # Fix budget table structure and policies

  1. Changes
    - Create new table with correct structure
    - Preserve existing data
    - Clean up duplicate records
    - Add proper constraints and indexes

  2. Security
    - Enable RLS
    - Add comprehensive policy for all operations
*/

-- Create new table with correct structure
CREATE TABLE new_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "monthlyIncome" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "monthlySavingsGoal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "yearlySavingsGoal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "spendingLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  categories JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_budget UNIQUE (user_id)
);

-- Copy data from existing table, keeping only the most recent record per user
INSERT INTO new_budgets (
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
SELECT DISTINCT ON (user_id)
  id,
  user_id,
  COALESCE("monthlyIncome", 0) as "monthlyIncome",
  COALESCE("monthlySavingsGoal", 0) as "monthlySavingsGoal",
  COALESCE("yearlySavingsGoal", 0) as "yearlySavingsGoal",
  COALESCE("spendingLimit", 0) as "spendingLimit",
  categories,
  created_at,
  updated_at
FROM budgets
ORDER BY user_id, updated_at DESC;

-- Drop old table and rename new one
DROP TABLE budgets;
ALTER TABLE new_budgets RENAME TO budgets;

-- Create index for user_id
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy for all operations
CREATE POLICY "Users can manage their own budgets"
ON budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
