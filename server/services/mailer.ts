/**
 * Email, when there is a way to send it.
 *
 * Production mail goes through Resend: set RESEND_API_KEY and optionally
 * MAIL_FROM (defaults to Resend's onboarding address, which only delivers
 * to the account owner's inbox). Without a key — local dev, tests — the
 * mail is printed to the console instead of sent, and the caller gets the
 * link back so a test can follow it. Nothing is ever silently dropped: the
 * return value always says which of the two happened.
 */
export interface MailResult {
  sent: boolean
}

export async function sendMagicLink(email: string, link: string): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(`[language-app] magic link for ${email}: ${link}`)
    return { sent: false }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "onboarding@resend.dev",
      to: [email],
      subject: "Sign in to Language App",
      text: [
        "Here is your sign-in link. It works once and expires in fifteen minutes:",
        "",
        link,
        "",
        "If you did not ask for it, ignore this email.",
      ].join("\n"),
    }),
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: "The email could not be sent. Try again in a minute.",
    })
  }

  return { sent: true }
}
