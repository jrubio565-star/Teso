import { create } from 'zustand';
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

// Demo data for development
const demoBudget: Budget = {
  id: '1',
  userId: 'demo',
  name: 'Mi Presupuesto Personal',
  type: 'personal',
  totalLimit: 3000000,
  currency: 'COP',
  isActive: true,
  createdAt: new Date().toISOString(),
  categories: [
    { id: 'c1', budgetId: '1', name: 'Alimentacion', icon: '🍔', monthlyLimit: 800000, color: '#FF6B6B', spent: 520000 },
    { id: 'c2', budgetId: '1', name: 'Transporte', icon: '🚗', monthlyLimit: 400000, color: '#4ECDC4', spent: 280000 },
    { id: 'c3', budgetId: '1', name: 'Entretenimiento', icon: '🎬', monthlyLimit: 300000, color: '#9B59B6', spent: 150000 },
    { id: 'c4', budgetId: '1', name: 'Servicios', icon: '💡', monthlyLimit: 500000, color: '#3498DB', spent: 450000 },
    { id: 'c5', budgetId: '1', name: 'Salud', icon: '🏥', monthlyLimit: 200000, color: '#2ECC71', spent: 80000 },
    { id: 'c6', budgetId: '1', name: 'Ahorro', icon: '🏦', monthlyLimit: 500000, color: '#F1C40F', spent: 500000 },
    { id: 'c7', budgetId: '1', name: 'Otros', icon: '📦', monthlyLimit: 300000, color: '#95A5A6', spent: 120000 },
  ],
};

const demoTransactions: Transaction[] = [
  { id: 't1', budgetId: '1', categoryId: 'c1', amount: 45000, type: 'expense', description: 'Almuerzo Restaurante El Corral', source: 'email', date: new Date(2026, 3, 12, 12, 30).toISOString(), aiConfidence: 0.95, categoryName: 'Alimentacion', categoryIcon: '🍔', categoryColor: '#FF6B6B' },
  { id: 't2', budgetId: '1', categoryId: 'c2', amount: 12000, type: 'expense', description: 'Uber - Casa a Oficina', source: 'notification', date: new Date(2026, 3, 12, 8, 15).toISOString(), aiConfidence: 0.98, categoryName: 'Transporte', categoryIcon: '🚗', categoryColor: '#4ECDC4' },
  { id: 't3', budgetId: '1', categoryId: 'c4', amount: 150000, type: 'expense', description: 'Pago Claro Internet', source: 'email', date: new Date(2026, 3, 11).toISOString(), aiConfidence: 0.99, categoryName: 'Servicios', categoryIcon: '💡', categoryColor: '#3498DB' },
  { id: 't4', budgetId: '1', categoryId: 'c1', amount: 85000, type: 'expense', description: 'Mercado Exito', source: 'email', date: new Date(2026, 3, 10).toISOString(), aiConfidence: 0.92, categoryName: 'Alimentacion', categoryIcon: '🍔', categoryColor: '#FF6B6B' },
  { id: 't5', budgetId: '1', categoryId: 'c3', amount: 35000, type: 'expense', description: 'Netflix Suscripcion', source: 'email', date: new Date(2026, 3, 9).toISOString(), aiConfidence: 0.97, categoryName: 'Entretenimiento', categoryIcon: '🎬', categoryColor: '#9B59B6' },
  { id: 't6', budgetId: '1', categoryId: 'c6', amount: 500000, type: 'expense', description: 'Transferencia Cuenta Ahorros', source: 'manual', date: new Date(2026, 3, 1).toISOString(), aiConfidence: 1.0, categoryName: 'Ahorro', categoryIcon: '🏦', categoryColor: '#F1C40F' },
  { id: 't7', budgetId: '1', categoryId: 'c1', amount: 3500000, type: 'income', description: 'Nomina Abril 2026', source: 'email', date: new Date(2026, 3, 1).toISOString(), aiConfidence: 0.99, categoryName: 'Ingreso', categoryIcon: '💰', categoryColor: '#10B981' },
];

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! 👋 Soy tu asistente financiero FinanzAI. Puedo ayudarte a:\n\n• Crear y gestionar presupuestos\n• Categorizar tus gastos automaticamente\n• Analizar tus habitos de gasto\n• Darte consejos para mejorar tus finanzas\n\n¿En que te puedo ayudar hoy?',
  timestamp: new Date().toISOString(),
};

export const useStore = create<AppState>((set, get) => ({
  // Auth
  user: { id: 'demo', email: 'demo@finanzai.app', displayName: 'Johann', subscriptionTier: 'free', createdAt: new Date().toISOString() },
  isAuthenticated: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // Budgets
  budgets: [demoBudget],
  activeBudget: demoBudget,
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
  transactions: demoTransactions,
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
}));
