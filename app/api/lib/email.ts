import nodemailer from "nodemailer";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

type TransportConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
};

function createTransport(config?: TransportConfig) {
  const host = process.env.EMAIL_HOST;
  const portRaw = process.env.EMAIL_PORT;
  const secureRaw = process.env.EMAIL_SECURE;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const finalHost = config?.host || host;
  const finalPort = config?.port || Number(portRaw || "587");
  const finalSecure = typeof config?.secure === "boolean" ? config.secure : (secureRaw ? secureRaw === "true" : finalPort === 465);
  const finalUser = config?.user || user;
  const finalPass = config?.pass || pass;

  if (finalHost) {
    return nodemailer.createTransport({
      host: finalHost,
      port: finalPort,
      secure: finalSecure,
      auth: finalUser && finalPass ? { user: finalUser, pass: finalPass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: finalUser && finalPass ? { user: finalUser, pass: finalPass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export const transporter = createTransport();

export async function verifyEmailTransport() {
  try {
    await transporter.verify();
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transport error";
    return { ok: false as const, error: message };
  }
}

export const sendEmail = async ({ to, subject, html }: SendEmailArgs) => {
  const from = process.env.EMAIL_USER;
  try {
    await transporter.sendMail({ from, to, subject, html });
    return;
  } catch (error) {
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT || "587");
    const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === "true" : port === 465;
    const shouldTryFallback = Boolean(host && port === 465 && secure);
    if (!shouldTryFallback) throw error;

    // Fallback path: retry on submission port 587 with STARTTLS.
    const fallbackTransport = createTransport({ host, port: 587, secure: false });
    await fallbackTransport.sendMail({ from, to, subject, html });
  }
};
