export function extractDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Aplica a máscara brasileira enquanto o usuário digita: (11) 91234-5678
 * (celular, 11 dígitos) ou (11) 1234-5678 (fixo, 10 dígitos). */
export function formatBRPhoneInput(raw: string): string {
  const digits = extractDigits(raw).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${ddd}`;

  const isMobile = rest.length > 4;
  const prefixLen = isMobile ? 5 : 4;
  const prefix = rest.slice(0, prefixLen);
  const suffix = rest.slice(prefixLen);

  if (!suffix) return `(${ddd}) ${prefix}`;
  return `(${ddd}) ${prefix}-${suffix}`;
}

const VALID_DDD_RANGE = { min: 11, max: 99 };

export function isValidBRPhone(raw: string): boolean {
  const digits = extractDigits(raw);
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < VALID_DDD_RANGE.min || ddd > VALID_DDD_RANGE.max) return false;

  if (digits.length === 11 && digits[2] !== "9") return false;

  return true;
}

export function toE164BR(raw: string): string {
  return `+55${extractDigits(raw)}`;
}

/** Inverso de toE164BR — pra exibir um telefone já em E.164 formatado. */
export function formatE164BRForDisplay(e164: string): string {
  const digits = e164.startsWith("+55") ? e164.slice(3) : extractDigits(e164);
  return formatBRPhoneInput(digits);
}
