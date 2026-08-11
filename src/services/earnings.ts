import { fetchRideHistory } from "@/services/rides";

export interface EarningsSummary {
  todayGross: number;
  weekGross: number;
  monthGross: number;
  todayRides: number;
  weekRides: number;
  monthRides: number;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Ganhos brutos do motorista, somando `estimated_fare` das corridas
 * concluídas — reaproveita fetchRideHistory, sem precisar de tabela nova. */
export async function fetchDriverEarningsSummary(driverId: string): Promise<EarningsSummary> {
  const rides = await fetchRideHistory("driver", driverId);
  const completed = rides.filter((r) => r.status === "completed" && r.completed_at != null);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summary: EarningsSummary = {
    todayGross: 0,
    weekGross: 0,
    monthGross: 0,
    todayRides: 0,
    weekRides: 0,
    monthRides: 0,
  };

  for (const ride of completed) {
    const completedAt = new Date(ride.completed_at as string);
    const fare = ride.estimated_fare ?? 0;

    if (completedAt >= monthAgo) {
      summary.monthGross += fare;
      summary.monthRides += 1;
    }
    if (completedAt >= weekAgo) {
      summary.weekGross += fare;
      summary.weekRides += 1;
    }
    if (isSameDay(completedAt, now)) {
      summary.todayGross += fare;
      summary.todayRides += 1;
    }
  }

  return summary;
}
