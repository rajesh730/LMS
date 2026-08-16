import QRCode from "qrcode";

/**
 * The printable Parent Access Card (§5).
 *
 * A server component. The QR is rendered as **inline SVG** via the `qrcode`
 * package already in the project (same approach as CertificateSheet) — no
 * external QR service, no network call, and it stays crisp at any print size.
 *
 * The card carries exactly one credential: the Parent ID. Scanning the QR and
 * typing that ID are the same act — the QR just saves the typing — so the card
 * is a key, and the footer says so in words a guardian will act on.
 *
 * Print constraints this design is built around, because the card's real job
 * happens on a school office printer:
 *
 *  - **Black and white must work.** Nothing depends on colour; the QR is pure
 *    black, borders are solid rules, and there are no tints behind text.
 *  - **Readable at arm's length.** The Parent ID is set large and monospaced
 *    with wide tracking, because it gets read aloud and typed by someone who
 *    may not be confident with Latin characters.
 *  - **Bilingual by default.** Nepali sits alongside English on the card
 *    itself — a card a guardian cannot read is a card that does not work (§10).
 *  - **No technical language.** No "token", "credential" or "activation" (§68).
 */
export default async function ParentAccessCard({
  schoolName,
  studentName,
  studentGrade,
  guardianName,
  relationshipLabel,
  parentIdentifier,
  loginUrl,
}) {
  // Error-correction level M survives a fold, a smudge, or a mediocre
  // photocopy — all of which happen to a card that lives in a school bag.
  const qrSvg = await QRCode.toString(loginUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <article className="parent-access-card">
      <header className="pac-header">
        <p className="pac-school">{schoolName}</p>
        <p className="pac-brand">PRAVYO PARENT ACCESS</p>
      </header>

      <section className="pac-child">
        <span className="pac-child-icon" aria-hidden="true">
          👦
        </span>
        <div>
          <p className="pac-child-name">{studentName}</p>
          {studentGrade ? <p className="pac-child-grade">{studentGrade}</p> : null}
        </div>
      </section>

      <section className="pac-guardian">
        <p className="pac-label">Guardian / अभिभावक</p>
        <p className="pac-guardian-name">{guardianName}</p>
        {relationshipLabel ? (
          <p className="pac-relationship">{relationshipLabel}</p>
        ) : null}
      </section>

      <section className="pac-qr-block">
        <p className="pac-scan">SCAN TO SIGN IN</p>
        <p className="pac-scan-ne">साइन इन गर्न स्क्यान गर्नुहोस्</p>
        <div
          className="pac-qr"
          // Inline SVG from the qrcode package — generated on the server from
          // our own URL, never from user input.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </section>

      <p className="pac-or">OR TYPE THIS / अथवा यो टाइप गर्नुहोस्</p>

      <section className="pac-credentials">
        <div className="pac-cred">
          <p className="pac-label">Parent ID / अभिभावक आईडी</p>
          <p className="pac-value">{parentIdentifier}</p>
        </div>
      </section>

      <footer className="pac-footer">
        <p className="pac-help">Need help? Please contact the school office.</p>
        <p className="pac-help-ne">
          सहयोग चाहिएमा विद्यालयको कार्यालयमा सम्पर्क गर्नुहोस्।
        </p>
        {/* The one thing a guardian must understand about this card: it opens
            their child's record on its own. Worded as "like a key" rather than
            as a security instruction, because that is what lands (§68). */}
        <p className="pac-warning">
          Keep this card safe — it opens your child&apos;s record, like a key.
          If you lose it, tell the school and they will give you a new one.
        </p>
        <p className="pac-help-ne">
          यो कार्ड सुरक्षित राख्नुहोस् — यसले तपाईंको बच्चाको विवरण खोल्छ।
          हराएमा विद्यालयलाई भन्नुहोस्।
        </p>
      </footer>
    </article>
  );
}
