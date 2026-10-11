export type HRProfile = {
  maxHr?: number | null;
  restingHr?: number | null;
};

export type HRZone = {
  zone: 1 | 2 | 3 | 4 | 5;
  from: number;
  to: number;
};

const KARVONEN_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

export function calcHRZones(maxHr: number, restingHr: number): HRZone[] {
  if (
    !Number.isFinite(maxHr) ||
    !Number.isFinite(restingHr) ||
    maxHr <= restingHr ||
    restingHr <= 0
  ) {
    throw new Error("Datos de FC inválidos: se requiere FC máx > FC reposo > 0");
  }
  const reserve = maxHr - restingHr;
  const zones: HRZone[] = [];
  for (let index = 0; index < 5; index += 1) {
    const from = Math.round(restingHr + reserve * KARVONEN_BOUNDS[index]);
    const to = Math.round(restingHr + reserve * KARVONEN_BOUNDS[index + 1]);
    zones.push({ zone: (index + 1) as HRZone["zone"], from, to });
  }
  return zones;
}

export type TRIMPRecord = {
  durationMinutes?: number | null;
  rpe?: number | null;
};

// TRIMP de Banister con k=0.64; el RPE (1-10) se usa como proxy del
// porcentaje de reserva de FC cuando no hay FC media por sesión.
export function calcTRIMP(
  records: TRIMPRecord[],
  profile: HRProfile,
): number | null {
  const maxHr = profile.maxHr;
  const restingHr = profile.restingHr;
  if (!maxHr || !restingHr || maxHr <= restingHr) {
    return null;
  }

  let total = 0;
  let counted = 0;
  for (const record of records) {
    const minutes = record.durationMinutes ?? 0;
    const rpe = record.rpe;
    if (minutes <= 0 || !rpe) {
      continue;
    }
    const hrRatio = Math.min(Math.max(rpe / 10, 0), 1);
    total += minutes * 0.64 * hrRatio * Math.exp(1.92 * hrRatio);
    counted += 1;
  }
  return counted > 0 ? Math.round(total) : null;
}
