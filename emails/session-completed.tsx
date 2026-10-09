import { Text } from "@react-email/components";
import { render } from "@react-email/render";
import { EmailLayout } from "./layout";

export type SessionCompletedEmailProps = {
  coachName: string;
  athleteName: string;
  sessionDate: string;
  distanceKm?: string | null;
  durationMinutes?: number | null;
};

export function SessionCompletedEmail({
  coachName,
  athleteName,
  sessionDate,
  distanceKm,
  durationMinutes,
}: SessionCompletedEmailProps) {
  const details = [
    distanceKm ? `Distancia: ${distanceKm} km` : null,
    durationMinutes ? `Duración: ${durationMinutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <EmailLayout
      preview={`${athleteName} completó una sesión`}
      title="Tu atleta completó una sesión"
    >
      <Text style={paragraph}>
        Hola {coachName}, <strong>{athleteName}</strong> registró como
        completada la sesión del <strong>{sessionDate}</strong>.
      </Text>
      {details ? <Text style={detailsStyle}>{details}</Text> : null}
      <Text style={small}>
        Ingresa a RunOsorno para dejar tu feedback y revisar el cumplimiento del
        plan.
      </Text>
    </EmailLayout>
  );
}

export async function renderSessionCompletedEmail(
  props: SessionCompletedEmailProps,
): Promise<string> {
  return render(<SessionCompletedEmail {...props} />);
}

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 24px 12px",
};

const detailsStyle = {
  ...paragraph,
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  padding: "10px 14px",
  margin: "0 24px 16px",
};

const small = {
  ...paragraph,
  color: "#64748b",
  fontSize: "12px",
};
