import InfoPageShell, {
  InfoSection,
  SUPPORT_EMAIL,
} from "@/components/public/InfoPageShell";

export const metadata = {
  title: "Terms of Use",
  description: "The terms that apply to schools, students, and visitors using Pravyo.",
};

export default function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Terms of Use"
      intro="These terms keep Pravyo fair and safe for schools, students, and visitors. By using the platform you agree to them."
      updated="July 13, 2026"
    >
      <InfoSection title="Accounts">
        <ul>
          <li>
            School accounts are created by registration and activated after
            review and approval by the Pravyo team.
          </li>
          <li>
            Student and teacher accounts are created and managed by their
            school. The school is responsible for distributing credentials
            safely.
          </li>
          <li>
            Keep your login credentials private. You are responsible for
            activity under your account.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="School responsibilities">
        <ul>
          <li>
            Register only real students and staff of your school, with accurate
            information.
          </li>
          <li>
            Obtain any consent required from parents or guardians before
            registering students or publishing student names, work, or photos.
          </li>
          <li>
            Review student content before publishing it to public pages.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Acceptable use">
        <p>Do not use Pravyo to:</p>
        <ul>
          <li>Post content that is unlawful, hateful, or harassing.</li>
          <li>Impersonate another school, student, or person.</li>
          <li>Upload false achievements or forged certificates.</li>
          <li>
            Attempt to access data belonging to another school or disrupt the
            service.
          </li>
        </ul>
        <p>
          We may suspend or remove accounts and content that break these rules.
        </p>
      </InfoSection>

      <InfoSection title="Content ownership">
        <p>
          Schools and students keep ownership of the content they create —
          writings, magazines, event materials, and profiles. By publishing
          content on Pravyo, you give us permission to display it on the
          platform. Unpublishing or deleting content removes it from public
          pages.
        </p>
      </InfoSection>

      <InfoSection title="Certificates and verification">
        <p>
          Certificates issued through Pravyo reflect results recorded by event
          organizers. Each certificate carries a verification code that anyone
          can check on our verify page. Schools are responsible for the
          accuracy of results they publish.
        </p>
      </InfoSection>

      <InfoSection title="Service availability">
        <p>
          Pravyo is under active development and is provided as-is. We work to
          keep it fast and reliable, but we cannot guarantee uninterrupted
          availability, and features may change as the platform improves. We
          recommend schools keep their own copies of critical records.
        </p>
      </InfoSection>

      <InfoSection title="Ending an account">
        <p>
          Schools can stop using Pravyo at any time and request full removal of
          their data by emailing <strong>{SUPPORT_EMAIL}</strong>. We may
          suspend accounts that violate these terms, normally with notice
          unless the violation is severe.
        </p>
      </InfoSection>

      <InfoSection title="Questions">
        <p>
          For anything unclear in these terms, contact{" "}
          <strong>{SUPPORT_EMAIL}</strong>.
        </p>
      </InfoSection>
    </InfoPageShell>
  );
}
