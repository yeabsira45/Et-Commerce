import { sendEmail } from "../lib/email";

export async function GET() {
  try {
    await sendEmail({
      to: "yourgmail@gmail.com",
      subject: "Test Email",
      html: "<h1>It works!</h1>",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown email error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
    });
  }
}
