import { buildSystemPrompt } from './aiPrompt';
import { agentTools, executeAgentTool } from './aiTools';
import { useStore } from '../store/useStore';
import { getApiKey } from './config';

/**
 * Interfaz del mensaje para la API de Anthropic
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
  usage: { input_tokens: number; output_tokens: number };
}

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001'; // Haiku 4.5 - mas economico

/**
 * Envia un mensaje al agente de IA y maneja tool calling de forma recursiva.
 * Retorna el texto final de respuesta del agente.
 */
export async function sendMessageToAgent(
  userMessage: string,
  conversationHistory: AnthropicMessage[] = [],
): Promise<{ response: string; tokensUsed: { input: number; output: number } }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      response: '⚠️ No se ha configurado la API key de Anthropic. Ve a Configuracion > API Key para agregarla y activar el agente de IA.',
      tokensUsed: { input: 0, output: 0 },
    };
  }

  const store = useStore.getState();
  const now = new Date();

  // Construir system prompt con contexto actual
  const systemPrompt = buildSystemPrompt({
    userName: store.user?.displayName || 'Usuario',
    currency: store.activeBudget?.currency || 'COP',
    budgets: store.budgets,
    recentTransactions: store.transactions.slice(0, 10),
    currentMonth: now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
  });

  // Construir historial de mensajes (ultimos 20 para no exceder contexto)
  const messages: AnthropicMessage[] = [
    ...conversationHistory.slice(-20),
    { role: 'user', content: userMessage },
  ];

  let totalTokens = { input: 0, output: 0 };

  try {
    // Llamada a la API
    let response = await callAnthropicAPI(apiKey, systemPrompt, messages);
    totalTokens.input += response.usage.input_tokens;
    totalTokens.output += response.usage.output_tokens;

    // Manejar tool calling en loop (el agente puede necesitar varias herramientas)
    let maxIterations = 5; // safety limit
    while (response.stop_reason === 'tool_use' && maxIterations > 0) {
      maxIterations--;

      // Extraer tool uses de la respuesta
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const toolResults: ContentBlock[] = [];

      for (const toolUse of toolUses) {
        if (toolUse.name && toolUse.input && toolUse.id) {
          // Ejecutar la herramienta
          const result = executeAgentTool(toolUse.name, toolUse.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        }
      }

      // Agregar respuesta del agente y resultados de herramientas al historial
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      // Llamar de nuevo a la API para que el agente procese los resultados
      response = await callAnthropicAPI(apiKey, systemPrompt, messages);
      totalTokens.input += response.usage.input_tokens;
      totalTokens.output += response.usage.output_tokens;
    }

    // Extraer texto final de la respuesta
    const textBlocks = response.content.filter(b => b.type === 'text');
    const finalText = textBlocks.map(b => b.text).join('\n');

    return {
      response: finalText || 'Hmm, no pude generar una respuesta. ¿Puedes intentar de nuevo?',
      tokensUsed: totalTokens,
    };
  } catch (error: any) {
    console.error('AI Agent error:', error);

    if (error.status === 401) {
      return {
        response: '🔑 La API key no es valida. Verifica tu clave en Configuracion > API Key.',
        tokensUsed: totalTokens,
      };
    }
    if (error.status === 429) {
      return {
        response: '⏳ Se ha alcanzado el limite de solicitudes. Espera un momento y vuelve a intentar.',
        tokensUsed: totalTokens,
      };
    }

    return {
      response: '❌ Hubo un error al comunicarse con el agente de IA. Verifica tu conexion a internet e intenta de nuevo.',
      tokensUsed: totalTokens,
    };
  }
}

/**
 * Llamada HTTP a la API de Anthropic
 */
async function callAnthropicAPI(
  apiKey: string,
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<AnthropicResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: agentTools,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error: any = new Error(`API error: ${response.status}`);
    error.status = response.status;
    try {
      error.body = await response.json();
    } catch {}
    throw error;
  }

  return response.json();
}

/**
 * Convierte el historial de chat de la app al formato de la API de Anthropic.
 * Solo incluye mensajes de texto simples (no tool calls) para el historial.
 */
export function chatToAnthropicHistory(
  chatMessages: { role: 'user' | 'assistant'; content: string }[]
): AnthropicMessage[] {
  return chatMessages
    .filter(m => m.content && m.content.trim().length > 0)
    .map(m => ({
      role: m.role,
      content: m.content,
    }));
}
