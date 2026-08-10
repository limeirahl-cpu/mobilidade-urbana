export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "outro";

export function formatCardNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiryInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Algoritmo de Luhn — valida o formato do número, não se o cartão existe de verdade. */
export function luhnCheck(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/** Detecção de bandeira por prefixo (BIN) — aproximada, best-effort.
 * Faixas do Elo não são todas públicas; fora dos prefixos comuns, cai em "outro". */
export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(4011|4312|4389|4514|4573|6277|6362|6363|650|6516|6550)/.test(digits)) return "elo";
  return "outro";
}

export function validateExpiry(mm: string, yy: string): boolean {
  const month = Number(mm);
  const year = Number(yy);
  if (!month || month < 1 || month > 12) return false;
  if (!yy || yy.length !== 2) return false;

  const fullYear = 2000 + year;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (fullYear < currentYear) return false;
  if (fullYear === currentYear && month < currentMonth) return false;
  return true;
}

export function validateCVV(cvv: string, brand: CardBrand): boolean {
  const expectedLength = brand === "amex" ? 4 : 3;
  return new RegExp(`^\\d{${expectedLength}}$`).test(cvv);
}

export function cardBrandLabel(brand: CardBrand): string {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "elo":
      return "Elo";
    case "amex":
      return "American Express";
    default:
      return "Cartão";
  }
}
