// MOCK — gera e valida o código de verificação inteiramente no app, sem
// nenhum provedor de SMS real. Quando integrar um provedor de verdade
// (Twilio, Zenvia etc.), troque o corpo de `sendVerificationCode` por uma
// chamada HTTP a esse provedor (idealmente via uma edge function, pra não
// expor credenciais do provedor no app) e `verifyCode` por uma checagem
// no backend — o resto do app não precisa mudar, já que só depende dessas
// duas funções.

const CODE_LENGTH = 4;
const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

interface PendingCode {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

const pendingCodes = new Map<string, PendingCode>();

function generateCode(): string {
  return Math.floor(Math.random() * 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, "0");
}

export interface SendCodeResult {
  code: string;
  cooldownMs: number;
}

/** Mock — "envia" o código de verificação. Retorna o código pra exibição
 * na tela (não existe SMS real chegando em lugar nenhum ainda). */
export function sendVerificationCode(phoneE164: string): SendCodeResult {
  const now = Date.now();
  const existing = pendingCodes.get(phoneE164);
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    return { code: existing.code, cooldownMs: RESEND_COOLDOWN_MS - (now - existing.lastSentAt) };
  }

  const code = generateCode();
  pendingCodes.set(phoneE164, { code, expiresAt: now + CODE_TTL_MS, lastSentAt: now, attempts: 0 });
  console.log(`[MOCK SMS] Código de verificação para ${phoneE164}: ${code}`);
  return { code, cooldownMs: RESEND_COOLDOWN_MS };
}

export type VerifyCodeFailureReason = "not_requested" | "expired" | "too_many_attempts" | "invalid";

export type VerifyCodeResult = { ok: true } | { ok: false; reason: VerifyCodeFailureReason };

export function verifyCode(phoneE164: string, code: string): VerifyCodeResult {
  const pending = pendingCodes.get(phoneE164);
  if (!pending) return { ok: false, reason: "not_requested" };

  if (Date.now() > pending.expiresAt) {
    pendingCodes.delete(phoneE164);
    return { ok: false, reason: "expired" };
  }

  if (pending.attempts >= MAX_ATTEMPTS) {
    pendingCodes.delete(phoneE164);
    return { ok: false, reason: "too_many_attempts" };
  }

  if (pending.code !== code) {
    pending.attempts += 1;
    return { ok: false, reason: "invalid" };
  }

  pendingCodes.delete(phoneE164);
  return { ok: true };
}
