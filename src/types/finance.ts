export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'transfer';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  userId: string;
}

export interface Budget {
  id: string;
  userId: string;
  monthlyIncome: number;
  monthlySavingsGoal: number;
  yearlySavingsGoal: number;
  spendingLimit: number;
  categories: {
    [key: string]: number;
  };
}

export interface MonthlyAnalytics {
  totalIncome: number;
  totalExpenses: number;
  savingsProgress: number;
  categoryDistribution: {
    [key: string]: number;
  };
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
  };
}
