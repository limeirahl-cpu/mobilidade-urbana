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

export interface DriverOffer {
  id: string;
  name: string;
  rating: number;
  vehicle: string;
  etaMinutes: number;
  price: number;
}

const MOCK_FIRST_NAMES = ["Carlos", "Fernanda", "Roberto", "Juliana", "Marcos", "Patrícia", "André", "Camila"];
const MOCK_CAR_MODELS = ["Onix", "HB20", "Ka", "Mobi", "Argo", "Kwid"];
const MOCK_COLORS = ["prata", "preto", "branco", "cinza"];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** MOCK — gera propostas de motoristas pro valor pedido pelo passageiro, no
 * estilo InDrive (o motorista mais perto aparece primeiro). Sem matching
 * real ainda — quando existir, essa função vira uma escuta de propostas de
 * motoristas de verdade (ex: via Realtime), mantendo o mesmo formato de
 * retorno. */
export function simulateDriverOffers(requestedFare: number, categoryLabel: string): DriverOffer[] {
  const count = 2 + Math.floor(Math.random() * 2);

  const offers = Array.from({ length: count }).map((_, index) => {
    const asksMore = index > 0 && Math.random() < 0.4;
    const price = asksMore
      ? Math.round(requestedFare * (1 + Math.random() * 0.12) * 100) / 100
      : requestedFare;

    return {
      id: `offer-${index}-${Date.now()}`,
      name: pickRandom(MOCK_FIRST_NAMES),
      rating: Math.round((4.6 + Math.random() * 0.4) * 10) / 10,
      vehicle: `${categoryLabel} · ${pickRandom(MOCK_CAR_MODELS)} ${pickRandom(MOCK_COLORS)}`,
      etaMinutes: 2 + Math.floor(Math.random() * 7),
      price,
    };
  });

  return offers.sort((a, b) => a.etaMinutes - b.etaMinutes);
}
