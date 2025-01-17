/*
  # Fix budget table column names

  1. Changes
    - Rename columns to match TypeScript interface:
      - monthly_income -> monthlyIncome
      - monthly_savings_goal -> monthlySavingsGoal
      - yearly_savings_goal -> yearlySavingsGoal
      - spending_limit -> spendingLimit

  2. Security
    - Maintains existing RLS policies
*/

DO $$ 
BEGIN
  -- Rename columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'monthly_income') THEN
    ALTER TABLE budgets RENAME COLUMN monthly_income TO "monthlyIncome";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'monthly_savings_goal') THEN
    ALTER TABLE budgets RENAME COLUMN monthly_savings_goal TO "monthlySavingsGoal";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'yearly_savings_goal') THEN
    ALTER TABLE budgets RENAME COLUMN yearly_savings_goal TO "yearlySavingsGoal";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'spending_limit') THEN
    ALTER TABLE budgets RENAME COLUMN spending_limit TO "spendingLimit";
  END IF;
END $$;
