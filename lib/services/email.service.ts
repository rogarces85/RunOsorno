import { Resend } from "resend";
import { DEFAULT_SETTINGS, env } from "@/lib/config";
import { logAudit } from "./audit.service";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!env.resendApiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

function fromAddress(): string {
  return env.resendFrom || DEFAULT_SETTINGS.emailFrom;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

const RETRY_DELAY_MS = 1000;

async function attemptSend(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const resend = getResend();
    if (!resend) {
      return { ok: true };
    }
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!getResend()) {
    console.log(
      `[email:dev] to=${Array.isArray(input.to) ? input.to.join(", ") : input.to} subject="${input.subject}" (sin RESEND_API_KEY; no se envía)`,
    );
    return { ok: true, skipped: true };
  }

  let result = await attemptSend(input);
  if (!result.ok) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    result = await attemptSend(input);
  }

  if (!result.ok) {
    console.error(
      `[email:error] to=${Array.isArray(input.to) ? input.to.join(", ") : input.to} subject="${input.subject}" — ${result.error}`,
    );
    try {
      await logAudit({
        userId: null,
        action: "email_failed",
        entityType: "email",
        details: {
          to: input.to,
          subject: input.subject,
          error: result.error,
        },
      });
    } catch {
      // el fallo de auditoría no debe romper el flujo
    }
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
