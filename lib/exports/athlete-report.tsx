import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

/**
 * Documento PDF del informe de entrenamiento de un atleta (Fase 33).
 *
 * Vive en un .tsx propio porque usa JSX. Los estilos de react-pdf son
 * objetos planos (no CSS), por eso se tipan como `never` en las props
 * flex que la librería define con tipos unions narrower.
 */

export type PdfSessionRow = {
  date: string;
  sessionType: string | null;
  status: string;
  distanceKm: string | null;
  durationMinutes: number | null;
  rpe: number | null;
  note: string;
};

export type PdfAthleteReportProps = {
  athleteName: string;
  athleteEmail: string;
  periodLabel: string;
  rangeLabel: string;
  compliance: number;
  completed: number;
  totalKm: number;
  totalMinutes: number;
  streak: number;
  avgRpe: number | null;
  vo2max: number | null;
  thresholdHr: number | null;
  rows: PdfSessionRow[];
  distribution: Record<string, number>;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#666", marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    color: "#206bc4",
  },
  row: {
    display: "flex" as never,
    flexDirection: "row" as never,
    borderBottomWidth: 1,
    borderBottomColor: "#e6e6e6",
    paddingVertical: 4,
  },
  headerRow: {
    display: "flex" as never,
    flexDirection: "row" as never,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    paddingVertical: 4,
    backgroundColor: "#f4f7fb",
  },
  cell: { fontSize: 9 },
  headerCell: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  colFecha: { width: "14%" },
  colTipo: { width: "18%" },
  colEstado: { width: "18%" },
  colKm: { width: "13%" },
  colMin: { width: "13%" },
  colRpe: { width: "10%" },
  colNotas: { width: "14%" },
  metricBox: {
    display: "flex" as never,
    flexDirection: "row" as never,
    flexWrap: "wrap" as never,
    marginBottom: 8,
  },
  metricCard: {
    width: "24%",
    padding: 8,
    marginRight: "1%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 4,
  },
  metricValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#206bc4" },
  metricLabel: { fontSize: 8, color: "#666" },
});

const STATUS_LABEL: Record<string, string> = {
  planned: "Planificada",
  in_progress: "En curso",
  completed: "Completada",
  partial: "Parcial",
  not_done: "No realizada",
};

function fmt(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${value}${suffix}`;
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function AthleteReportDocument(props: PdfAthleteReportProps) {
  return (
    <Document
      title={`Informe de ${props.athleteName}`}
      author="RunOsorno"
      subject="Informe de entrenamiento"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Informe de entrenamiento — {props.athleteName}
        </Text>
        <Text style={styles.subtitle}>
          {props.athleteEmail} {" · "} Periodo: {props.periodLabel} (
          {props.rangeLabel}) {" · "} Generado por RunOsorno
        </Text>

        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.metricBox}>
          <MetricCard
            value={`${props.compliance}%`}
            label="Cumplimiento"
          />
          <MetricCard
            value={String(props.completed)}
            label="Sesiones completadas"
          />
          <MetricCard
            value={fmt(props.totalKm, " km")}
            label="Distancia total"
          />
          <MetricCard
            value={fmt(props.totalMinutes, " min")}
            label="Tiempo total"
          />
          <MetricCard value={String(props.streak)} label="Racha actual" />
          <MetricCard
            value={fmt(props.avgRpe, " / 10")}
            label="RPE medio"
          />
          <MetricCard value={fmt(props.vo2max)} label="VO2max estimado" />
          <MetricCard
            value={fmt(props.thresholdHr, " ppm")}
            label="FC umbral"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Detalle de sesiones ({props.rows.length})
        </Text>

        <View style={styles.headerRow} fixed>
          <Text style={[styles.headerCell, styles.colFecha]}>Fecha</Text>
          <Text style={[styles.headerCell, styles.colTipo]}>Tipo</Text>
          <Text style={[styles.headerCell, styles.colEstado]}>Estado</Text>
          <Text style={[styles.headerCell, styles.colKm]}>Km</Text>
          <Text style={[styles.headerCell, styles.colMin]}>Min</Text>
          <Text style={[styles.headerCell, styles.colRpe]}>RPE</Text>
          <Text style={[styles.headerCell, styles.colNotas]}>Notas</Text>
        </View>

        {props.rows.map((row, index) => (
          <View key={`row-${index}`} style={styles.row} wrap={false}>
            <Text style={[styles.cell, styles.colFecha]}>{row.date}</Text>
            <Text style={[styles.cell, styles.colTipo]}>
              {row.sessionType ?? "—"}
            </Text>
            <Text style={[styles.cell, styles.colEstado]}>
              {STATUS_LABEL[row.status] ?? row.status}
            </Text>
            <Text style={[styles.cell, styles.colKm]}>
              {row.distanceKm ?? "—"}
            </Text>
            <Text style={[styles.cell, styles.colMin]}>
              {row.durationMinutes ?? "—"}
            </Text>
            <Text style={[styles.cell, styles.colRpe]}>{row.rpe ?? "—"}</Text>
            <Text style={[styles.cell, styles.colNotas]}>{row.note}</Text>
          </View>
        ))}

        {Object.keys(props.distribution).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Distribución por tipo de sesión
            </Text>
            {Object.entries(props.distribution).map(([type, percent]) => (
              <View key={type} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.colTipo]}>{type}</Text>
                <Text style={styles.cell}>{percent}%</Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
