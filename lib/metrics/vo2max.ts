export type VO2Profile = {
  maxHr?: number | null;
  restingHr?: number | null;
};

export type VO2Record = {
  durationMinutes?: number | null;
};

// Estimación de Uth–Sørensen–Overgaard–Pedersen: VO2max ≈ 15.3 × FCmáx/FCreposo.
// Requiere FC máx y reposo en el perfil y al menos un registro de entrenamiento.
export function estimateVO2max(
  records: VO2Record[],
  profile: VO2Profile,
): number | null {
  const maxHr = profile.maxHr;
  const restingHr = profile.restingHr;
  if (!maxHr || !restingHr || maxHr <= restingHr) {
    return null;
  }
  const hasRecord = records.some(
    (record) => (record.durationMinutes ?? 0) > 0,
  );
  if (!hasRecord) {
    return null;
  }
  return Math.round(15.3 * (maxHr / restingHr) * 10) / 10;
}
