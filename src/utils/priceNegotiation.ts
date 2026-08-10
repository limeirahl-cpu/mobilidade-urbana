export const NEGOTIATION_MIN_PCT = 0.8;
export const NEGOTIATION_MAX_PCT = 1.2;

export function getNegotiationRange(estimatedFare: number): { min: number; max: number } {
  return {
    min: Math.round(estimatedFare * NEGOTIATION_MIN_PCT * 100) / 100,
    max: Math.round(estimatedFare * NEGOTIATION_MAX_PCT * 100) / 100,
  };
}

export function isWithinNegotiationRange(value: number, estimatedFare: number): boolean {
  const { min, max } = getNegotiationRange(estimatedFare);
  return value >= min && value <= max;
}

export type NegotiationOutcome =
  | { result: "accepted" }
  | { result: "countered"; counterFare: number }
  | { result: "rejected" };

const RESPONSE_DELAY_MS = 1800;

/** MOCK — simula a resposta do motorista à proposta do passageiro, já que o
 * matching real ainda não tem um passo de negociação de preço (o motorista
 * só aceita/recusa a corrida em si, não um valor). Quando isso existir de
 * verdade, essa função vira uma espera por uma resposta real do motorista
 * (ex: via Realtime), com a mesma assinatura de retorno. */
export function simulateDriverResponse(suggestedFare: number, estimatedFare: number): Promise<NegotiationOutcome> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const distanceFromEstimate = Math.abs(suggestedFare - estimatedFare) / estimatedFare;
      const acceptChance = Math.max(0.15, 0.85 - distanceFromEstimate * 2);
      const roll = Math.random();

      if (roll < acceptChance) {
        resolve({ result: "accepted" });
        return;
      }

      if (roll < acceptChance + 0.5) {
        const counterFare = Math.round(((suggestedFare + estimatedFare) / 2) * 100) / 100;
        resolve({ result: "countered", counterFare });
        return;
      }

      resolve({ result: "rejected" });
    }, RESPONSE_DELAY_MS);
  });
}
