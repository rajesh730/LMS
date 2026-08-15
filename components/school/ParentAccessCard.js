import QRCode from "qrcode";

/**
 * The printable Parent Access Card (§5).
 *
 * A server component. The QR is rendered as **inline SVG** via the `qrcode`
 * package already in the project (same approach as CertificateSheet) — no
 * external QR service, no network call, and it stays crisp at any print size.
 *
 * Print constraints this design is built around, because the card's real job
 * happens on a school office printer:
 *
 *  - **Black and white must work.** Nothing depends on colour; the QR is pure
 *    black, borders are solid rules, and there are no tints behind text.
 *  - **Readable at arm's length.** The Parent ID and PIN are set large and
 *    monospaced with wide tracking, because they get read aloud and typed by
 *    someone who may not be confident with Latin characters.
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
  activationPin,
  activateUrl,
  expiresAt,
}) {
  // Error-correction level M survives a fold, a smudge, or a mediocre
  // photocopy — all of which happen to a card that lives in a school bag.
  const qrSvg = await QRCode.toString(activateUrl, {
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
        <p className="pac-scan">SCAN TO CONNECT</p>
        <p className="pac-scan-ne">जोड्न स्क्यान गर्नुहोस्</p>
        <div
          className="pac-qr"
          // Inline SVG from the qrcode package — generated on the server from
          // our own URL, never from user input.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </section>

      <p className="pac-or">OR / अथवा</p>

      <section className="pac-credentials">
        <div className="pac-cred">
          <p className="pac-label">Parent ID</p>
          <p className="pac-value">{parentIdentifier}</p>
        </div>
        <div className="pac-cred">
          <p className="pac-label">PIN</p>
          <p className="pac-value">{activationPin}</p>
        </div>
      </section>

      <footer className="pac-footer">
        <p className="pac-help">
          Need help? Please contact the school office.
        </p>
        <p className="pac-help-ne">
          सहयोग चाहिएमा विद्यालयको कार्यालयमा सम्पर्क गर्नुहोस्।
        </p>
        {expiresAt ? (
          <p className="pac-expiry">
            Please connect before{" "}
            {new Date(expiresAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
        <p className="pac-warning">
          Keep this card safe. Do not share your PIN with anyone.
        </p>
      </footer>
    </article>
  );
}
