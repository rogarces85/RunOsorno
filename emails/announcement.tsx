import { Text } from "@react-email/components";
import { render } from "@react-email/render";
import { EmailLayout } from "./layout";

export type AnnouncementEmailProps = {
  recipientName: string;
  title: string;
  message: string;
  sentBy: string;
};

export function AnnouncementEmail({
  recipientName,
  title,
  message,
  sentBy,
}: AnnouncementEmailProps) {
  return (
    <EmailLayout preview={title} title={title}>
      <Text style={paragraph}>Hola {recipientName},</Text>
      <Text style={paragraph}>{message}</Text>
      <Text style={sentByStyle}>— {sentBy}</Text>
    </EmailLayout>
  );
}

export async function renderAnnouncementEmail(
  props: AnnouncementEmailProps,
): Promise<string> {
  return render(<AnnouncementEmail {...props} />);
}

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 24px 12px",
};

const sentByStyle = {
  ...paragraph,
  color: "#64748b",
  fontStyle: "italic" as const,
};
