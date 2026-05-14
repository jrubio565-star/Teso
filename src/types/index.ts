export type BudgetType = 'personal' | 'pareja' | 'hogar' | 'proyecto';
export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'email' | 'notification' | 'manual' | 'ocr';
export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  type: BudgetType;
  totalLimit: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  categories: Category[];
}

export interface Category {
  id: string;
  budgetId: string;
  name: string;
  icon: string;
  monthlyLimit: number;
  color: string;
  spent: number; // computed field
}

export interface Transaction {
  id: string;
  budgetId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description: string;
  source: TransactionSource;
  rawData?: Record<string, unknown>;
  date: string;
  aiConfidence?: number;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: 'create_budget' | 'add_category' | 'add_transaction' | 'show_summary';
  label: string;
  data?: Record<string, unknown>;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    spent: number;
    limit: number;
    percentage: number;
  }[];
}
