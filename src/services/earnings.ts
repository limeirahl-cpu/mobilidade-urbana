import { fetchRideHistory } from "@/services/rides";

export interface EarningsPeriod {
  gross: number;
  receivable: number; // Pix/cartão: plataforma já tem o dinheiro, deve repassar isso ao motorista
  owed: number; // Dinheiro: motorista já ficou com o valor, deve essa comissão à plataforma
  rides: number;
}

export interface EarningsSummary {
  today: EarningsPeriod;
  week: EarningsPeriod;
  month: EarningsPeriod;
}

function emptyPeriod(): EarningsPeriod {
  return { gross: 0, receivable: 0, owed: 0, rides: 0 };
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function accumulate(period: EarningsPeriod, fare: number, driverEarnings: number, platformFee: number, isCash: boolean) {
  period.gross += fare;
  period.rides += 1;
  if (isCash) {
    period.owed += platformFee;
  } else {
    period.receivable += driverEarnings;
  }
}

/** Ganhos do motorista, somando as corridas concluídas. `driver_earnings`/
 * `platform_fee` só existem a partir da Fase 14.4 (complete_ride RPC) — em
 * corridas antigas, sem esses campos, entram só no bruto. */
export async function fetchDriverEarningsSummary(driverId: string): Promise<EarningsSummary> {
  const rides = await fetchRideHistory("driver", driverId);
  const completed = rides.filter((r) => r.status === "completed" && r.completed_at != null);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summary: EarningsSummary = { today: emptyPeriod(), week: emptyPeriod(), month: emptyPeriod() };

  for (const ride of completed) {
    const completedAt = new Date(ride.completed_at as string);
    const fare = ride.estimated_fare ?? 0;
    const driverEarnings = ride.driver_earnings ?? fare;
    const platformFee = ride.platform_fee ?? 0;
    const isCash = ride.payment_method === "dinheiro";

    if (completedAt >= monthAgo) accumulate(summary.month, fare, driverEarnings, platformFee, isCash);
    if (completedAt >= weekAgo) accumulate(summary.week, fare, driverEarnings, platformFee, isCash);
    if (isSameDay(completedAt, now)) accumulate(summary.today, fare, driverEarnings, platformFee, isCash);
  }

  return summary;
}
