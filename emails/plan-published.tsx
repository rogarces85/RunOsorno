import { Button, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { EmailLayout } from "./layout";

export type PlanPublishedEmailProps = {
  athleteName: string;
  coachName: string;
  calendarUrl: string;
};

export function PlanPublishedEmail({
  athleteName,
  coachName,
  calendarUrl,
}: PlanPublishedEmailProps) {
  return (
    <EmailLayout
      preview="Tu coach publicó un nuevo plan de entrenamiento"
      title="Tienes un plan nuevo"
    >
      <Text style={paragraph}>
        Hola {athleteName}, tu coach <strong>{coachName}</strong> publicó un
        nuevo plan de entrenamiento. Revisa tu calendario para ver las sesiones
        de la semana.
      </Text>
      <Text style={center}>
        <Button href={calendarUrl} style={button}>
          Ver mi calendario
        </Button>
      </Text>
      <Text style={small}>
        Registra cada sesión después de entrenar para que tu coach pueda seguir
        tu progreso.
      </Text>
    </EmailLayout>
  );
}

export async function renderPlanPublishedEmail(
  props: PlanPublishedEmailProps,
): Promise<string> {
  return render(<PlanPublishedEmail {...props} />);
}

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 24px 16px",
};

const center = {
  textAlign: "center" as const,
  margin: "8px 24px 16px",
};

const button = {
  backgroundColor: "#0d6efd",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  padding: "10px 20px",
  display: "inline-block",
};

const small = {
  ...paragraph,
  color: "#64748b",
  fontSize: "12px",
};
