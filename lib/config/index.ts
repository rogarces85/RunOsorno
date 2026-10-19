import { BASE_SESSION_TYPES, DEFAULT_NOT_DONE_REASONS } from "./constants";

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "",
  // Dirección a la que van las respuestas de los correos. Resend no permite
  // usar un Gmail como `from` (el dominio no es verificable), así que el
  // remitente es un dominio verificado y las respuestas se redirigen aquí.
  resendReplyTo: process.env.RESEND_REPLY_TO ?? "",
  // Sin el prefijo NEXT_PUBLIC_ a proposito: esas variables se incrustan en el
  // bundle durante el build, y como aqui solo se usa para armar enlaces de
  // correo, quedaria clavada al valor que tuviera al compilar. Como variable
  // normal se puede cambiar en el Worker sin volver a construir.
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "",
};

export const DEFAULT_SETTINGS = {
  maxTeamsPerCoach: 10,
  maxAthletesPerTeam: 50,
  editWindowHours: 48,
  notDoneReasons: [...DEFAULT_NOT_DONE_REASONS],
  baseSessionTypes: [...BASE_SESSION_TYPES],
  emailFrom: "RunOsorno <no-reply@runosorno.pages.dev>",
} as const;
