/*
  # Initial Schema for Personal Finance Manager

  1. New Tables
    - transactions
      - Stores all financial transactions
      - Includes type, amount, category, and payment method
    - budgets
      - Stores user budget settings and goals
      - Includes monthly/yearly targets and category limits
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit', 'debit', 'transfer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monthly_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  monthly_savings_goal DECIMAL(12,2) NOT NULL DEFAULT 0,
  yearly_savings_goal DECIMAL(12,2) NOT NULL DEFAULT 0,
  spending_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  categories JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own budgets"
  ON budgets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
