import { redirect } from "next/navigation";

/**
 * Legacy activation link, kept alive as a redirect.
 *
 * Every Parent Access Card printed under the old flow carries a QR encoding
 * `/parent/activate?t=<token>`, and those cards are in school bags today. The
 * token still resolves to its guardian, so the card still works — it just signs
 * them straight in now instead of opening a five-step activation wizard.
 *
 * The token is carried through to the sign-in screen, which submits it as
 * `cardToken`. See lib/parentCredentials.js `verifyParentCardToken`.
 */
export default async function ParentActivateRedirect({ searchParams }) {
  const params = await searchParams;
  const token = String(params?.t || "").trim();

  redirect(token ? `/parent/login?t=${encodeURIComponent(token)}` : "/parent/login");
}
