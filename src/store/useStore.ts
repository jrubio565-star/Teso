import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Budget, Transaction, ChatMessage, MonthlyStats, Category } from '../types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // Budgets
  budgets: Budget[];
  activeBudget: Budget | null;
  setBudgets: (budgets: Budget[]) => void;
  setActiveBudget: (budget: Budget | null) => void;
  addBudget: (budget: Budget) => void;
  addCategory: (budgetId: string, category: Category) => void;

  // Transactions
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;

  // Stats
  getMonthlyStats: () => MonthlyStats;
}

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! 👋 Soy tu asistente financiero FinanzAI. Puedo ayudarte a:\n\n• Crear y gestionar presupuestos\n• Categorizar tus gastos automaticamente\n• Analizar tus habitos de gasto\n• Darte consejos para mejorar tus finanzas\n\n¿En que te puedo ayudar hoy?',
  timestamp: new Date().toISOString(),
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: { id: 'demo', email: 'demo@finanzai.app', displayName: 'Johann', subscriptionTier: 'free', createdAt: new Date().toISOString() },
      isAuthenticated: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      // Budgets
      budgets: [],
      activeBudget: null,
      setBudgets: (budgets) => set({ budgets }),
      setActiveBudget: (budget) => set({ activeBudget: budget }),
      addBudget: (budget) => set((state) => ({ budgets: [...state.budgets, budget] })),
      addCategory: (budgetId, category) => set((state) => ({
        budgets: state.budgets.map(b =>
          b.id === budgetId ? { ...b, categories: [...b.categories, category] } : b
        ),
        activeBudget: state.activeBudget?.id === budgetId
          ? { ...state.activeBudget, categories: [...state.activeBudget.categories, category] }
          : state.activeBudget,
      })),

      // Transactions
      transactions: [],
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions],
      })),

      // Chat
      chatMessages: [welcomeMessage],
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message],
      })),
      clearChat: () => set({ chatMessages: [welcomeMessage] }),

      // Stats
      getMonthlyStats: () => {
        const { transactions, activeBudget } = get();
        const now = new Date();
        const monthTransactions = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const categoryBreakdown = (activeBudget?.categories || []).map(cat => ({
          categoryId: cat.id,
          categoryName: cat.name,
          categoryColor: cat.color,
          categoryIcon: cat.icon,
          spent: cat.spent,
          limit: cat.monthlyLimit,
          percentage: cat.monthlyLimit > 0 ? (cat.spent / cat.monthlyLimit) * 100 : 0,
        }));

        return {
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
          categoryBreakdown,
        };
      },
    }),
    {
      name: 'finanzai-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        budgets: state.budgets,
        activeBudget: state.activeBudget,
        transactions: state.transactions,
        user: state.user,
      }),
    }
  )
);