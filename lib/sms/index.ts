import { Platform } from 'react-native';

// Patrones para detectar transacciones en SMS
const SMS_PATTERNS = [
  // Banco → cargo/débito
  {
    regex: /(?:cargo|débito|debitado|pagado|compra)[:\s]+\$?([\d.,]+)/i,
    type: 'expense' as const,
  },
  // Banco → crédito/depósito
  {
    regex: /(?:crédito|depósito|depositado|acreditado|recibido)[:\s]+\$?([\d.,]+)/i,
    type: 'income' as const,
  },
  // Transferencia recibida
  {
    regex: /transferencia\s+recibida[:\s]+\$?([\d.,]+)/i,
    type: 'income' as const,
  },
  // Pago realizado
  {
    regex: /pago\s+realizado[:\s]+\$?([\d.,]+)/i,
    type: 'expense' as const,
  },
];

export interface ParsedSMS {
  amount: number;
  type: 'expense' | 'income';
  description: string;
  rawMessage: string;
}

export function parseSMSForTransaction(message: string): ParsedSMS | null {
  for (const pattern of SMS_PATTERNS) {
    const match = message.match(pattern.regex);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          type: pattern.type,
          description: `Detectado por SMS`,
          rawMessage: message,
        };
      }
    }
  }
  return null;
}

// Esta función se llama cuando llega un SMS nuevo (Android solamente)
export function setupSMSListener(
  onTransaction: (parsed: ParsedSMS) => void
): () => void {
  if (Platform.OS !== 'android') return () => {};

  // expo-sms no hace escucha en tiempo real directamente
  // Para eso necesitas un módulo nativo personalizado o react-native-get-sms-android
  // Por ahora retornamos una función limpiadora vacía
  console.log('SMS listener configurado (requiere módulo nativo para tiempo real)');
  return () => {};
}