import Link from "next/link";
import InfoPageShell, {
  InfoSection,
  SUPPORT_EMAIL,
} from "@/components/public/InfoPageShell";

export const metadata = {
  title: "Contact",
  description: "How to reach the Pravyo team.",
};

export default function ContactPage() {
  return (
    <InfoPageShell
      eyebrow="Support"
      title="Contact Us"
      intro="Whether you are a school interested in joining, a parent with a question, or a user who found a problem — we want to hear from you."
    >
      <InfoSection title="Email us">
        <p>
          The fastest way to reach us is email:{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-black text-[#1f4e79] hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>We usually reply within 1-2 business days.</p>
      </InfoSection>

      <InfoSection title="Schools: join Pravyo">
        <p>
          Want your school on Pravyo? Register your school and our team will
          review and approve your account — you&apos;ll get an email as soon as
          it is ready.
        </p>
        <p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f4e79] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#173f63]"
          >
            Register your school
          </Link>
        </p>
      </InfoSection>

      <InfoSection title="Already using Pravyo?">
        <ul>
          <li>
            <strong>Schools and students:</strong> use the Feedback section in
            your dashboard — it goes straight to our team.
          </li>
          <li>
            <strong>Forgot your password?</strong> Students should contact
            their school. School admins can email us for a reset.
          </li>
          <li>
            <strong>Parents or guardians:</strong> for questions about your
            child&apos;s information, contact the school first, or email us
            directly.
          </li>
        </ul>
      </InfoSection>
    </InfoPageShell>
  );
}
