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
