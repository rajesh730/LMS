import InfoPageShell, {
  InfoSection,
  SUPPORT_EMAIL,
} from "@/components/public/InfoPageShell";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Pravyo collects, uses, and protects school and student information.",
};

export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Pravyo helps schools showcase student talent, events, and verified achievements. Because we work with schools and students, we take privacy seriously. This page explains, in plain language, what information we store and how it is used."
      updated="July 13, 2026"
    >
      <InfoSection title="What information we collect">
        <p>
          <strong>School information:</strong> school name, location, contact
          details, principal name, and the content schools choose to publish
          (events, notices, magazines, showcase profiles).
        </p>
        <p>
          <strong>Student information:</strong> registered by the school —
          student name, grade, roll number, and optionally a parent or guardian
          contact email. Students may also create writings and earn
          achievements and certificates through school and platform events.
        </p>
        <p>
          <strong>Teacher information:</strong> registered by the school —
          name, subject, and role within the school.
        </p>
        <p>
          <strong>Account information:</strong> login email or username and a
          securely hashed password. We never store passwords in readable form.
        </p>
      </InfoSection>

      <InfoSection title="What is public and what is private">
        <p>
          By default, student records are <strong>private</strong> and visible
          only to the student&apos;s own school. Information appears on public
          pages only when it is deliberately published:
        </p>
        <ul>
          <li>Schools choose what appears on their public profile.</li>
          <li>
            Student writings appear publicly only after the school publishes
            them (for example in a school magazine or wall).
          </li>
          <li>
            Achievements and certificates appear publicly only when results are
            published and marked public.
          </li>
        </ul>
        <p>
          Internal records — rosters, grades, roll numbers, parent contacts,
          and unpublished work — are never shown publicly.
        </p>
      </InfoSection>

      <InfoSection title="Children's privacy">
        <p>
          Students are registered on Pravyo by their school, and the school
          acts as the responsible authority for that data. We expect schools to
          obtain any consent required from parents or guardians before
          registering students or publishing student work. Parents or guardians
          can contact their school, or us directly, to review or remove a
          student&apos;s information.
        </p>
      </InfoSection>

      <InfoSection title="How we use information">
        <ul>
          <li>To operate the platform: dashboards, events, certificates.</li>
          <li>
            To send service emails (account approval, student credentials).
          </li>
          <li>To keep the platform secure and prevent abuse.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell personal information, and we do not
          share it with advertisers.
        </p>
      </InfoSection>

      <InfoSection title="Where data is stored and how it is protected">
        <p>
          Data is stored in a managed MongoDB Atlas database hosted on cloud
          infrastructure. Connections are encrypted, passwords are hashed, and
          access to school data is restricted by role — a school can only see
          its own records.
        </p>
      </InfoSection>

      <InfoSection title="Removing your data">
        <p>
          Schools can archive or delete student, teacher, and content records
          from their dashboard. To remove a school account entirely, or for any
          data request, email us at <strong>{SUPPORT_EMAIL}</strong> and we
          will respond within a few business days.
        </p>
      </InfoSection>

      <InfoSection title="Changes to this policy">
        <p>
          If this policy changes in a meaningful way, we will update this page
          and note the new date at the top. Questions? Email{" "}
          <strong>{SUPPORT_EMAIL}</strong>.
        </p>
      </InfoSection>
    </InfoPageShell>
  );
}
