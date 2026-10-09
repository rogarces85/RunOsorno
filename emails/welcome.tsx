import { Text } from "@react-email/components";
import { render } from "@react-email/render";
import { EmailLayout } from "./layout";

export type WelcomeEmailProps = {
  name: string;
  tempPassword: string;
  loginUrl: string;
};

export function WelcomeEmail({
  name,
  tempPassword,
  loginUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout
      preview="Te invitaron a RunOsorno como coach"
      title={`Hola ${name}, bienvenido a RunOsorno`}
    >
      <Text style={paragraph}>
        Se creó tu cuenta de coach en RunOsorno. Usa estas credenciales para
        ingresar:
      </Text>
      <Text style={credentials}>
        <strong>Contraseña temporal:</strong>{" "}
        <code style={code}>{tempPassword}</code>
      </Text>
      <Text style={paragraph}>
        Ingresa desde: <a href={loginUrl}>{loginUrl}</a>
      </Text>
      <Text style={small}>
        Por seguridad, se te pedirá cambiar la contraseña en tu primer inicio de
        sesión. Si no esperabas esta invitación, ignora este correo.
      </Text>
    </EmailLayout>
  );
}

export async function renderWelcomeEmail(
  props: WelcomeEmailProps,
): Promise<string> {
  return render(<WelcomeEmail {...props} />);
}

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 24px 12px",
};

const credentials = {
  ...paragraph,
  marginTop: "4px",
};

const code = {
  backgroundColor: "#f1f5f9",
  borderRadius: "4px",
  padding: "2px 8px",
  fontFamily: "monospace",
  fontSize: "14px",
};

const small = {
  ...paragraph,
  color: "#64748b",
  fontSize: "12px",
  marginTop: "16px",
};
