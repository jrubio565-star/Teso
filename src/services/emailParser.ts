/**
 * emailParser.ts
 * Detecta y extrae transacciones financieras de emails bancarios.
 * Soporta: Davivienda, Bancolombia, Nequi, BBVA Colombia, Falabella, Scotiabank.
 */

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  merchant?: string;
  bank: string;
  date: Date;
  currency: string;
  rawText: string;
  confidence: number; // 0-1
}

interface BankRule {
  name: string;
  senderPatterns: RegExp[];
  subjectPatterns: RegExp[];
  bodyParsers: BodyParser[];
}

interface BodyParser {
  type: 'expense' | 'income' | 'auto';
  amountRegex: RegExp;
  merchantRegex?: RegExp;
  currencyRegex?: RegExp;
  confidence: number;
}

// ─── Reglas por banco ─────────────────────────────────────────────────────────
const BANK_RULES: BankRule[] = [
  {
    name: 'Davivienda',
    senderPatterns: [
      /davivienda/i,
      /notificaciones?@davivienda\.com/i,
      /alertas?@davivienda\.com/i,
    ],
    subjectPatterns: [
      /compra|pago|transacci[oó]n|retiro|transferencia|abono|dep[oó]sito/i,
    ],
    bodyParsers: [
      {
        type: 'expense',
        // "Por un valor de $45,000.00" o "valor: $1.200.000"
        amountRegex: /(?:por un valor de|valor[:\s]+)\$?\s*([\d.,]+)/i,
        merchantRegex: /(?:en|comercio[:\s]+|establecimiento[:\s]+)([A-Z][A-Z0-9 &.,'-]{2,40})/i,
        confidence: 0.95,
      },
      {
        type: 'income',
        amountRegex: /(?:abono|dep[oó]sito|consignaci[oó]n)[:\s]+\$?\s*([\d.,]+)/i,
        confidence: 0.92,
      },
    ],
  },
  {
    name: 'Bancolombia',
    senderPatterns: [
      /bancolombia/i,
      /alertas?@bancolombia\.com\.co/i,
      /notificaciones?@bancolombia/i,
    ],
    subjectPatterns: [
      /compra|pago|transacci[oó]n|transferencia|consignaci[oó]n|retiro/i,
    ],
    bodyParsers: [
      {
        type: 'expense',
        // "Realizaste una compra por $120.000"
        amountRegex: /(?:compra|pago|transacci[oó]n)[^$\d]*\$?\s*([\d.,]+)/i,
        merchantRegex: /(?:en|en el establecimiento)\s+([A-Z][A-Z0-9 &.,'-]{2,40})/i,
        confidence: 0.93,
      },
      {
        type: 'income',
        amountRegex: /(?:recibiste|consignaci[oó]n|abono)[^$\d]*\$?\s*([\d.,]+)/i,
        confidence: 0.90,
      },
    ],
  },
  {
    name: 'Nequi',
    senderPatterns: [
      /nequi/i,
      /no-reply@nequi\.com\.co/i,
      /alertas?@nequi/i,
    ],
    subjectPatterns: [
      /pagaste|te enviaron|transferencia|pago|recibiste|cobro/i,
    ],
    bodyParsers: [
      {
        type: 'expense',
        // "Pagaste $15.000 a Rappi"
        amountRegex: /(?:pagaste|enviaste|cobraron)[^$\d]*\$?\s*([\d.,]+)/i,
        merchantRegex: /(?:a|para)\s+([A-Za-z][A-Za-z0-9 ]{2,30})/i,
        confidence: 0.96,
      },
      {
        type: 'income',
        // "Te enviaron $50.000"
        amountRegex: /(?:te enviaron|recibiste|te consignaron)[^$\d]*\$?\s*([\d.,]+)/i,
        merchantRegex: /(?:de|desde)\s+([A-Za-z][A-Za-z0-9 ]{2,30})/i,
        confidence: 0.95,
      },
    ],
  },
  {
    name: 'BBVA',
    senderPatterns: [
      /bbva/i,
      /alertas?@bbva\.com\.co/i,
    ],
    subjectPatterns: [
      /cargo|abono|compra|retiro|transacci[oó]n/i,
    ],
    bodyParsers: [
      {
        type: 'expense',
        amountRegex: /(?:cargo|compra|d[eé]bito)[:\s]+\$?\s*([\d.,]+)/i,
        merchantRegex: /(?:en|comercio[:\s]+)([A-Z][A-Z0-9 &.,'-]{2,40})/i,
        confidence: 0.90,
      },
      {
        type: 'income',
        amountRegex: /(?:abono|cr[eé]dito|dep[oó]sito)[:\s]+\$?\s*([\d.,]+)/i,
        confidence: 0.88,
      },
    ],
  },
  {
    name: 'Falabella',
    senderPatterns: [/falabella/i, /cmr/i],
    subjectPatterns: [/compra|cargo|pago/i],
    bodyParsers: [
      {
        type: 'expense',
        amountRegex: /\$\s*([\d.,]+)/,
        merchantRegex: /(?:en|tienda[:\s]+)([A-Z][A-Z0-9 ]{2,30})/i,
        confidence: 0.85,
      },
    ],
  },
  // Regla genérica para cualquier banco no listado
  {
    name: 'Banco Genérico',
    senderPatterns: [
      /alertas?@/i, /notificaciones?@/i, /no-?reply@/i,
    ],
    subjectPatterns: [
      /compra|pago|transacci[oó]n|cargo|abono|retiro|\$\s*[\d,]/,
    ],
    bodyParsers: [
      {
        type: 'auto',
        amountRegex: /\$\s*([\d.,]+(?:\.\d{2})?)/,
        confidence: 0.70,
      },
    ],
  },
];

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Normaliza un string de monto colombiano a número.
 * Soporta: "1.200.000", "1,200,000", "45000", "1.200.000,50"
 */
function parseAmount(raw: string): number {
  const cleaned = raw.trim();
  // Si tiene punto como separador de miles y coma como decimales: "1.200.000,50"
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Si solo tiene puntos como separador de miles: "1.200.000"
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/\./g, ''), 10);
  }
  // Si tiene comas como separador de miles: "1,200,000"
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/,/g, ''), 10);
  }
  // Número plano
  return parseFloat(cleaned.replace(/[,]/g, '')) || 0;
}

/**
 * Capitaliza la primera letra de cada palabra del nombre del comercio.
 */
function cleanMerchant(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 50);
}

/**
 * Intenta detectar si el email es un gasto o ingreso basándose en palabras clave.
 */
function inferTransactionType(text: string): 'income' | 'expense' {
  const incomeWords = /(?:abono|cr[eé]dito|dep[oó]sito|consignaci[oó]n|recibiste|te enviaron|ingreso|nomina|n[oó]mina)/i;
  const expenseWords = /(?:compra|cargo|d[eé]bito|pago|retiro|transacci[oó]n|pagaste|debitado|cobrado)/i;
  const incomeScore = (text.match(incomeWords) || []).length;
  const expenseScore = (text.match(expenseWords) || []).length;
  return incomeScore > expenseScore ? 'income' : 'expense';
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export interface EmailInput {
  from: string;
  subject: string;
  body: string;
  date?: string;
}

/**
 * Parsea un email y extrae la transacción financiera si la hay.
 * Retorna null si el email no parece ser una notificación bancaria.
 */
export function parseEmailTransaction(email: EmailInput): ParsedTransaction | null {
  const { from, subject, body, date } = email;
  const fullText = `${subject}\n${body}`;

  // 1. Encontrar el banco que hace match
  let matchedBank: BankRule | null = null;
  for (const rule of BANK_RULES) {
    const senderMatch = rule.senderPatterns.some(p => p.test(from));
    const subjectMatch = rule.subjectPatterns.some(p => p.test(subject));
    if (senderMatch && subjectMatch) {
      matchedBank = rule;
      break;
    }
    // Si solo hace match el sender pero no el subject, baja prioridad
    if (senderMatch && !matchedBank) {
      matchedBank = rule;
    }
  }

  if (!matchedBank) return null;

  // 2. Intentar parsear el monto con cada bodyParser
  let bestResult: ParsedTransaction | null = null;
  let bestConfidence = 0;

  for (const parser of matchedBank.bodyParsers) {
    const amountMatch = fullText.match(parser.amountRegex);
    if (!amountMatch) continue;

    const amount = parseAmount(amountMatch[1]);
    if (amount <= 0 || amount > 100_000_000) continue; // sanity check

    const merchantMatch = parser.merchantRegex ? fullText.match(parser.merchantRegex) : null;
    const merchant = merchantMatch ? cleanMerchant(merchantMatch[1]) : undefined;

    const type: 'income' | 'expense' =
      parser.type === 'auto' ? inferTransactionType(fullText) : parser.type;

    const description = merchant
      ? `${type === 'income' ? 'Ingreso de' : 'Pago en'} ${merchant}`
      : `${type === 'income' ? 'Ingreso' : 'Gasto'} — ${matchedBank.name}`;

    const result: ParsedTransaction = {
      amount,
      type,
      description,
      merchant,
      bank: matchedBank.name,
      date: date ? new Date(date) : new Date(),
      currency: 'COP',
      rawText: fullText.slice(0, 500),
      confidence: parser.confidence,
    };

    if (parser.confidence > bestConfidence) {
      bestResult = result;
      bestConfidence = parser.confidence;
    }
  }

  return bestResult;
}

/**
 * Filtra una lista de emails y retorna solo los que tienen transacciones bancarias.
 */
export function parseEmailList(emails: EmailInput[]): ParsedTransaction[] {
  return emails
    .map(parseEmailTransaction)
    .filter((t): t is ParsedTransaction => t !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Sugiere una categoría basándose en la descripción y el comercio.
 * Retorna el nombre de la categoría sugerida.
 */
export function suggestCategory(transaction: ParsedTransaction): string {
  const text = `${transaction.description} ${transaction.merchant ?? ''}`.toLowerCase();

  if (/rappi|domicilio|uber eats|ifood|didi food|almuerzo|restaurante|comida|supermercado|exito|carulla|jumbo|mercado|foodie/i.test(text)) return 'Alimentación';
  if (/uber|didi|cabify|bus|metro|sitp|gasolina|parqueadero|transporte|taxi/i.test(text)) return 'Transporte';
  if (/netflix|spotify|disney|prime|hbo|cine|juego|steam|playstation|xbox/i.test(text)) return 'Entretenimiento';
  if (/claro|tigo|movistar|etb|internet|luz|agua|gas|energia|epm|codensa|acueducto/i.test(text)) return 'Servicios';
  if (/farmacia|drogueria|cl[ií]nica|m[eé]dico|hospital|salud|gym|fitness/i.test(text)) return 'Salud';
  if (/universidad|colegio|curso|libro|educaci[oó]n|udemy|platzi|coursera/i.test(text)) return 'Educación';
  if (/amazon|falabella|alkosto|ropa|zapatos|tienda|shopping|zara|h&m/i.test(text)) return 'Compras';
  if (/banco|ahorro|ahorros|inversi[oó]n|cdts?/i.test(text)) return 'Ahorro';
  if (transaction.type === 'income') return 'Ingresos';
  return 'Otros';
}
