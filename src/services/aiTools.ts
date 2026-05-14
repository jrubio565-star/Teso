import { useStore } from '../store/useStore';
import type { Budget, Category, Transaction } from '../types';

/**
 * Definicion de herramientas (tools) que el agente de IA puede invocar.
 * Usa el formato de tool_use de la API de Anthropic.
 */
export const agentTools = [
  {
    name: 'create_budget',
    description: 'Crea un nuevo presupuesto para el usuario. Llama esta herramienta cuando el usuario quiera crear un presupuesto nuevo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Nombre del presupuesto (ej: "Mi Presupuesto Personal", "Gastos del Hogar")',
        },
        type: {
          type: 'string',
          enum: ['personal', 'pareja', 'hogar', 'proyecto'],
          description: 'Tipo de presupuesto',
        },
        total_limit: {
          type: 'number',
          description: 'Limite mensual total del presupuesto en la moneda del usuario',
        },
        currency: {
          type: 'string',
          description: 'Moneda del presupuesto (ej: COP, USD). Por defecto COP.',
        },
      },
      required: ['name', 'type', 'total_limit'],
    },
  },
  {
    name: 'add_category',
    description: 'Agrega una nueva categoria de gasto o ingreso a un presupuesto existente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        budget_id: {
          type: 'string',
          description: 'ID del presupuesto al que se agregara la categoria. Usa el presupuesto activo si no se especifica.',
        },
        name: {
          type: 'string',
          description: 'Nombre de la categoria (ej: "Alimentacion", "Transporte", "Ahorro")',
        },
        icon: {
          type: 'string',
          description: 'Emoji representativo de la categoria (ej: "🍔", "🚗", "🏦")',
        },
        monthly_limit: {
          type: 'number',
          description: 'Limite mensual para esta categoria',
        },
        color: {
          type: 'string',
          description: 'Color hexadecimal para graficos (ej: "#FF6B6B")',
        },
      },
      required: ['name', 'icon', 'monthly_limit'],
    },
  },
  {
    name: 'add_transaction',
    description: 'Registra un nuevo gasto o ingreso. Llama esta herramienta cuando el usuario reporte un gasto o ingreso.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: {
          type: 'number',
          description: 'Monto de la transaccion (siempre positivo)',
        },
        type: {
          type: 'string',
          enum: ['income', 'expense'],
          description: 'Tipo: "expense" para gastos, "income" para ingresos',
        },
        description: {
          type: 'string',
          description: 'Descripcion de la transaccion (ej: "Almuerzo en restaurante", "Nomina marzo")',
        },
        category_name: {
          type: 'string',
          description: 'Nombre de la categoria a la que pertenece (debe coincidir con una categoria existente)',
        },
      },
      required: ['amount', 'type', 'description', 'category_name'],
    },
  },
  {
    name: 'get_summary',
    description: 'Obtiene el resumen financiero del mes actual incluyendo ingresos, gastos, balance y desglose por categoria.',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['current_month', 'last_month', 'last_3_months'],
          description: 'Periodo del resumen. Por defecto "current_month".',
        },
      },
      required: [],
    },
  },
];

/**
 * Ejecuta una herramienta invocada por el agente de IA.
 * Retorna un string con el resultado para que el agente lo use en su respuesta.
 */
export function executeAgentTool(
  toolName: string,
  toolInput: Record<string, any>,
): string {
  const store = useStore.getState();

  switch (toolName) {
    case 'create_budget': {
      const newBudget: Budget = {
        id: 'b_' + Date.now(),
        userId: store.user?.id || 'demo',
        name: toolInput.name,
        type: toolInput.type,
        totalLimit: toolInput.total_limit,
        currency: toolInput.currency || 'COP',
        isActive: true,
        createdAt: new Date().toISOString(),
        categories: [],
      };
      store.addBudget(newBudget);
      store.setActiveBudget(newBudget);
      return JSON.stringify({
        success: true,
        message: `Presupuesto "${newBudget.name}" creado exitosamente.`,
        budget_id: newBudget.id,
        details: {
          name: newBudget.name,
          type: newBudget.type,
          limit: newBudget.totalLimit,
          currency: newBudget.currency,
        },
      });
    }

    case 'add_category': {
      const budgetId = toolInput.budget_id || store.activeBudget?.id;
      if (!budgetId) {
        return JSON.stringify({ success: false, message: 'No hay presupuesto activo. Crea uno primero.' });
      }

      const defaultColors = ['#FF6B6B', '#4ECDC4', '#9B59B6', '#2ECC71', '#E74C3C', '#3498DB', '#F1C40F', '#E67E22', '#1ABC9C', '#95A5A6'];
      const existingCount = store.activeBudget?.categories.length || 0;

      const newCategory: Category = {
        id: 'cat_' + Date.now(),
        budgetId,
        name: toolInput.name,
        icon: toolInput.icon,
        monthlyLimit: toolInput.monthly_limit,
        color: toolInput.color || defaultColors[existingCount % defaultColors.length],
        spent: 0,
      };
      store.addCategory(budgetId, newCategory);
      return JSON.stringify({
        success: true,
        message: `Categoria "${newCategory.icon} ${newCategory.name}" agregada con limite de $${newCategory.monthlyLimit.toLocaleString('es-CO')}.`,
        category_id: newCategory.id,
      });
    }

    case 'add_transaction': {
      const activeBudget = store.activeBudget;
      if (!activeBudget) {
        return JSON.stringify({ success: false, message: 'No hay presupuesto activo.' });
      }

      // Find matching category
      const category = activeBudget.categories.find(
        c => c.name.toLowerCase() === toolInput.category_name.toLowerCase()
      );

      const newTransaction: Transaction = {
        id: 't_' + Date.now(),
        budgetId: activeBudget.id,
        categoryId: category?.id || 'unknown',
        amount: toolInput.amount,
        type: toolInput.type,
        description: toolInput.description,
        source: 'manual',
        date: new Date().toISOString(),
        aiConfidence: 1.0,
        categoryName: category?.name || toolInput.category_name,
        categoryIcon: category?.icon || '📦',
        categoryColor: category?.color || '#95A5A6',
      };
      store.addTransaction(newTransaction);

      return JSON.stringify({
        success: true,
        message: `${toolInput.type === 'income' ? 'Ingreso' : 'Gasto'} de $${toolInput.amount.toLocaleString('es-CO')} registrado en "${category?.name || toolInput.category_name}".`,
        transaction_id: newTransaction.id,
        category_matched: !!category,
      });
    }

    case 'get_summary': {
      const stats = store.getMonthlyStats();
      const activeBudget = store.activeBudget;

      return JSON.stringify({
        success: true,
        period: toolInput.period || 'current_month',
        total_income: stats.totalIncome,
        total_expenses: stats.totalExpenses,
        balance: stats.balance,
        budget_name: activeBudget?.name,
        budget_limit: activeBudget?.totalLimit,
        budget_usage_percent: activeBudget?.totalLimit
          ? Math.round((stats.totalExpenses / activeBudget.totalLimit) * 100)
          : 0,
        categories: stats.categoryBreakdown.map(c => ({
          name: c.categoryName,
          icon: c.categoryIcon,
          spent: c.spent,
          limit: c.limit,
          percent: Math.round(c.percentage),
          status: c.percentage > 100 ? 'over_budget' : c.percentage > 80 ? 'warning' : 'ok',
        })),
        alerts: stats.categoryBreakdown
          .filter(c => c.percentage > 80)
          .map(c => `${c.categoryIcon} ${c.categoryName} al ${Math.round(c.percentage)}%`),
      });
    }

    default:
      return JSON.stringify({ success: false, message: `Herramienta "${toolName}" no reconocida.` });
  }
}
