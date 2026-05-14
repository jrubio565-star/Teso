/**
 * notificationParser.ts
 *
 * Extrae transacciones financieras del texto de notificaciones push.
 * Soporta: Google Wallet, Nequi, Bancolombia, Davivienda, BBVA,
 *          Scotiabank Colpatria, Nubank, Bold, RappiPay.
 */

export interface RawNotification {
  packageName: string;
  title: string;
  text: string;
  subText?: string;
  timestamp: number;
  appName: string;
}

export interface ParsedNotificationTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  merchant?: string;
  source: 'notification';
  appName: string;
  packageName: string;
  rawText: string;
  date: Date;
  confidence: number;
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Normaliza un string de monto a número.
 * Maneja formatos colombianos: "$45.000", "$1,200,000", "$45000", "45.000,50"
 */
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, '');

  // Formato COP con puntos como miles y coma decimal: "1.200.000,50"
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Solo puntos como miles: "1.200.000"
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/\./g, ''), 10);
  }
  // Comas como miles (formato inglés): "1,200,000"
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/,/g, ''), 10);
  }
  // Número simple con posibles decimales
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

function cleanMerchant(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 60);
}

// ─── Reglas por app ───────────────────────────────────────────────────────────

interface AppParser {
  packages: string[];
  parse: (notif: RawNotification) => ParsedNotificationTransaction | null;
}

const APP_PARSERS: AppParser[] = [

  // ── Google Wallet / Google Pay ────────────────────────────────────────────
  {
    packages: ['com.google.android.apps.walletnfcrel', 'com.google.android.gms'],
    parse: (n) => {
      const text = `${n.title} ${n.text}`;

      // "You paid $45.00 to Starbucks" (en inglés)
      // "Pagaste $45,000 en Rappi" (en español)
      const amountMatch = text.match(/\$\s*([\d.,]+)/);
      if (!amountMatch) return null;
      const amount = parseAmount(amountMatch[1]);
      if (amount <= 0) return null;

      // Merchant en inglés: "to Starbucks" / "at McDonald's"
      const merchantEnMatch = text.match(/(?:paid|to|at)\s+([A-Za-z][A-Za-z0-9 &'.-]{1,40})/i);
      // Merchant en español: "en Rappi" / "a Juan"
      const merchantEsMatch = text.match(/(?:pagaste|en|a)\s+([A-Za-zÀ-ú][A-Za-zÀ-ú0-9 &'.-]{1,40})/i);
      const merchant = merchantEnMatch?.[1] || merchantEsMatch?.[1];

      return {
        amount,
        type: 'expense',
        description: merchant ? `Pago en ${cleanMerchant(merchant)}` : 'Pago con Google Wallet',
        merchant: merchant ? cleanMerchant(merchant) : undefined,
        source: 'notification',
        appName: 'Google Wallet',
        packageName: n.packageName,
        rawText: text,
        date: new Date(n.timestamp),
        confidence: 0.92,
      };
    },
  },

  // ── Nequi ─────────────────────────────────────────────────────────────────
  {
    packages: ['com.nequi.mobilebanking'],
    parse: (n) => {
      const text = `${n.title} ${n.text}`;

      // Gasto: "Pagaste $15,000 a Rappi" / "Le enviaste $30,000 a @usuario"
      const expenseMatch = text.match(
        /(?:pagaste|enviaste|cobr(?:aron|aste))[^$\d]*\$?\s*([\d.,]+)(?:[^a-z]*(?:a|en|para)\s+([A-Za-zÀ-ú@][A-Za-zÀ-ú0-9 @_.-]{1,40}))?/i,
      );
      if (expenseMatch) {
        const amount = parseAmount(expenseMatch[1]);
        if (amount <= 0) return null;
        const merchant = expenseMatch[2];
        return {
          amount,
          type: 'expense',
          description: merchant ? `Pago Nequi a ${cleanMerchant(merchant)}` : 'Pago con Nequi',
          merchant: merchant ? cleanMerchant(merchant) : undefined,
          source: 'notification',
          appName: 'Nequi',
          packageName: n.packageName,
          rawText: text,
          date: new Date(n.timestamp),
          confidence: 0.95,
        };
      }

      // Ingreso: "Te enviaron $50,000" / "Recibiste $200,000 de Juan"
      const incomeMatch = text.match(
        /(?:te enviaron|recibiste|te consignaron)[^$\d]*\$?\s*([\d.,]+)(?:[^a-z]*(?:de|desde)\s+([A-Za-zÀ-ú][A-Za-zÀ-ú0-9 ]{1,40}))?/i,
      );
      if (incomeMatch) {
        const amount = parseAmount(incomeMatch[1]);
        if (amount <= 0) return null;
        const sender = incomeMatch[2];
        return {
          amount,
          type: 'income',
          description: sender ? `Transferencia Nequi de ${cleanMerchant(sender)}` : 'Ingreso Nequi',
          merchant: sender ? cleanMerchant(sender) : undefined,
          source: 'notification',
          appName: 'Nequi',
          packageName: n.packageName,
          rawText: text,
          date: new Date(n.timestamp),
          confidence: 0.95,
        };
      }

      return null;
    },
  },

  // ── Bancolombia ───────────────────────────────────────────────────────────
  {
    packages: ['com.bancolombia.sucursalvirtual', 'com.bancolombia.mobileapp'],
    parse: (n) => {
      const text = `${n.title} ${n.text}`;

      // "Realizaste una compra por $120,000 en ALMACENES EXITO"
      // "Compra por $45,000 aprobada"
      const expenseMatch = text.match(
        /(?:compra|pago|transacci[oó]n|d[eé]bito)[^$\d]*\$?\s*([\d.,]+)(?:[^a-z]*(?:en|en el)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑA-Za-z0-9 &.,'-]{1,40}))?/i,
      );
      if (expenseMatch) {
        const amount = parseAmount(expenseMatch[1]);
        if (amount <= 0) return null;
        const merchant = expenseMatch[2];
        return {
          amount,
          type: 'expense',
          description: merchant ? `Compra en ${cleanMerchant(merchant)}` : 'Compra Bancolombia',
          merchant: merchant ? cleanMerchant(merchant) : undefined,
          source: 'notification',
          appName: 'Bancolombia',
          packageName: n.packageName,
          rawText: text,
          date: new Date(n.timestamp),
          confidence: 0.93,
        };
      }

      // "Consignación de $500,000" / "Recibiste $3,500,000"
      const incomeMatch = text.match(
        /(?:consignaci[oó]n|abono|recibiste|ingreso)[^$\d]*\$?\s*([\d.,]+)/i,
      );
      if (incomeMatch) {
        const amount = parseAmount(incomeMatch[1]);
        if (amount <= 0) return null;
        return {
          amount,
          type: 'income',
          description: 'Ingreso Bancolombia',
          source: 'notification',
          appName: 'Bancolombia',
          packageName: n.packageName,
          rawText: text,
          date: new Date(n.timestamp),
          confidence: 0.90,
        };
      }

      return null;
    },
  },

  // ── Davivienda ────────────────────────────────────────────────────────────
  {
    packages: ['com.davivienda.mobileapp', 'co.com.davivienda.mobileapp'],
    parse: (n) => {
      const text = `${n.title} ${n.text}`;

      const expenseMatch = text.match(
        /(?:compra|pago|cargo|transacci[oó]n)[^$\d]*\$?\s*([\d.,]+)(?:[^a-zA-Z]*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9 &.,'-]{2,40}))?/i,
      );
      if (expenseMatch) {
        const amount = parseAmount(expenseMatch[1]);
        if (amount <= 0) return null;
        const merchant = expenseMatch[2];
        return {
          amount,
          type: 'expense',
          description: merchant ? `Pago en ${cleanMerchant(merchant)}` : 'Pago Davivienda',
          merchant: merchant ? cleanMerchant(merchant) : undefined,
          source: 'notification',
          appName: 'Davivienda',
          packageName: n.packageName,
          rawText: text,
          date: new Date(n.timestamp),
          confidence: 0.91,
        };
      }

      const incomeMatch = text.match(
        /(?:abono|consignaci[oó]n|dep[oó]sito)[^$\d]*\$?\s*([\d.,]+)/i,
      );
      if (incomeMatch) {
        const amount = parseAmount(incomeMatch[1]);
        if (amount <= 0) return null;
        return {
          amount,
          type: 'income',
          description: 'Ingreso Davivienda',
          source: 'notification',
          appName: 'Davivienda',
          packageName: n.packageName,
          rawText: text,
          date: new Date(n.timestamp),
          confidence: 0.89,
        };
      }

      return null;
    },
  },

  // ── BBVA ──────────────────────────────────────────────────────────────────
  {
    packages: ['com.bbva.colombia', 'bbva.colombia'],
    parse: (n) => {
      const text = `${n.title} ${n.text}`;
      const amountMatch = text.match(/\$\s*([\d.,]+)/);
      if (!amountMatch) return null;
      const amount = parseAmount(amountMatch[1]);
      if (amount <= 0) return null;

      const isIncome = /abono|cr[eé]dito|dep[oó]sito|recibiste/i.test(text);
      const merchantMatch = text.match(/(?:en|comercio)\s+([A-Za-z][A-Za-z0-9 ]{2,35})/i);

      return {
        amount,
        type: isIncome ? 'income' : 'expense',
        description: merchantMatch ? `${isIncome ? 'Ingreso' : 'Pago'} en ${cleanMerchant(merchantMatch[1])}` : `${isIncome ? 'Ingreso' : 'Pago'} BBVA`,
        merchant: merchantMatch ? cleanMerchant(merchantMatch[1]) : undefined,
        source: 'notification',
        appName: 'BBVA',
        packageName: n.packageName,
        rawText: text,
        date: new Date(n.timestamp),
        confidence: 0.88,
      };
    },
  },

  // ── Nubank ────────────────────────────────────────────────────────────────
  {
    packages: ['com.nu.production'],
    parse: (n) => {
      const text = `${n.title} ${n.text}`;
      // "Compraste $85.000 en Rappi"
      const match = text.match(/(?:compraste|pagaste)[^$\d]*\$?\s*([\d.,]+)(?:[^a-z]*en\s+([A-Za-z][A-Za-z0-9 ]{1,35}))?/i);
      if (!match) return null;
      const amount = parseAmount(match[1]);
      if (amount <= 0) return null;
      return {
        amount,
        type: 'expense',
        description: match[2] ? `Compra en ${cleanMerchant(match[2])}` : 'Compra Nubank',
        merchant: match[2] ? cleanMerchant(match[2]) : undefined,
        source: 'notification',
        appName: 'Nubank',
        packageName: n.packageName,
        rawText: text,
        date: new Date(n.timestamp),
        confidence: 0.93,
      };
    },
  },
];

// ─── Parser genérico de fallback ──────────────────────────────────────────────
function genericParse(n: RawNotification): ParsedNotificationTransaction | null {
  const text = `${n.title} ${n.text}`;
  const amountMatch = text.match(/\$\s*([\d.,]+)/);
  if (!amountMatch) return null;
  const amount = parseAmount(amountMatch[1]);
  if (amount <= 0 || amount > 100_000_000) return null;

  const isIncome = /abono|cr[eé]dito|dep[oó]sito|recibiste|ingreso|consignaci[oó]n/i.test(text);
  const merchantMatch = text.match(/(?:en|a|para)\s+([A-Za-zÀ-ú][A-Za-zÀ-ú0-9 ]{2,35})/i);

  return {
    amount,
    type: isIncome ? 'income' : 'expense',
    description: merchantMatch
      ? `${isIncome ? 'Ingreso de' : 'Pago en'} ${cleanMerchant(merchantMatch[1])}`
      : `${isIncome ? 'Ingreso' : 'Gasto'} — ${n.appName}`,
    merchant: merchantMatch ? cleanMerchant(merchantMatch[1]) : undefined,
    source: 'notification',
    appName: n.appName,
    packageName: n.packageName,
    rawText: text,
    date: new Date(n.timestamp),
    confidence: 0.65,
  };
}

// ─── Función principal de exportación ────────────────────────────────────────

/**
 * Parsea una notificación push y retorna la transacción financiera si la hay.
 * Retorna null si no es una notificación bancaria o no se pudo extraer el monto.
 */
export function parseNotification(
  notification: RawNotification,
): ParsedNotificationTransaction | null {
  // Buscar parser específico para la app
  const specificParser = APP_PARSERS.find((p) =>
    p.packages.some((pkg) =>
      notification.packageName.toLowerCase().includes(pkg.toLowerCase()),
    ),
  );

  if (specificParser) {
    const result = specificParser.parse(notification);
    if (result) return result;
  }

  // Fallback genérico
  return genericParse(notification);
}

/**
 * Sugiere categoría basada en el merchant y el tipo de transacción.
 * (Reutiliza la misma lógica que el emailParser)
 */
export function suggestCategoryFromNotification(
  tx: ParsedNotificationTransaction,
): string {
  const text = `${tx.description} ${tx.merchant ?? ''}`.toLowerCase();
  if (/rappi|domicilio|uber eats|ifood|restaurante|comida|supermercado|éxito|exito|carulla|jumbo|mercado/i.test(text)) return 'Alimentación';
  if (/uber|didi|cabify|bus|sitp|gasolina|parqueadero|transporte|taxi|metro/i.test(text)) return 'Transporte';
  if (/netflix|spotify|disney|prime|hbo|cine|juego|steam|playstation|xbox|play/i.test(text)) return 'Entretenimiento';
  if (/claro|tigo|movistar|etb|internet|luz|agua|gas|energía|energia|epm|codensa/i.test(text)) return 'Servicios';
  if (/farmacia|droguería|drogueria|clínica|clinica|médico|medico|hospital|gym/i.test(text)) return 'Salud';
  if (/amazon|falabella|alkosto|ropa|zapatos|tienda|zara|h&m|nike|adidas/i.test(text)) return 'Compras';
  if (/banco|ahorro|inversión|inversion|cdt/i.test(text)) return 'Ahorro';
  if (tx.type === 'income') return 'Ingresos';
  return 'Otros';
}
