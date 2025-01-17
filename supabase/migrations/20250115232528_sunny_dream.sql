/*
  # Add payment_method column to transactions table

  1. Changes
    - Add payment_method column to transactions table
    - Update existing records to have a default value
    - Add check constraint for valid payment methods

  2. Security
    - No changes to RLS policies needed
*/

-- Add payment_method column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'credit', 'debit', 'transfer', 'sinpe'));
  END IF;
END $$;
