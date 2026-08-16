import { redirect } from "next/navigation";

/**
 * Legacy entry point, kept alive as a redirect.
 *
 * "Welcome to Pravyo" used to be a separate first-time screen: scan the card,
 * type a Parent ID and an activation PIN, confirm the child, choose a language,
 * invent a PIN. All of that collapsed into /parent/login the moment the Parent
 * ID became the credential — there is no first-time journey left to separate
 * from signing in.
 *
 * This route stays because it is printed on cards, sits in bookmarks, and was
 * handed out in WhatsApp messages. It must never 404.
 */
export default function ParentAccessRedirect() {
  redirect("/parent/login");
}
