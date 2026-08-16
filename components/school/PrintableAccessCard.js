"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * A single Parent Access Card, rendered on the CLIENT.
 *
 * The server-rendered card (components/school/ParentAccessCard.js) is used for
 * a one-off print. A bulk run holds the batch in memory on the client instead
 * of round-tripping 300 cards through the URL, so each card generates its own
 * QR here.
 *
 * `qrcode` runs in the browser as well as on the server, so this needs no new
 * dependency and still makes no network call: the SVG is computed locally from
 * a URL we constructed ourselves.
 */
export default function PrintableAccessCard({ card, schoolName, siteUrl }) {
  const [qrSvg, setQrSvg] = useState("");

  useEffect(() => {
    let active = true;
    const loginUrl = `${siteUrl}/parent/login?id=${encodeURIComponent(
      card.parentIdentifier
    )}`;

    QRCode.toString(loginUrl, {
      type: "svg",
      // Level M survives a fold, a smudge and a mediocre photocopy — all of
      // which happen to a card that travels home in a school bag.
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch(() => {
        // A missing QR still leaves a fully usable card: the Parent ID printed
        // below is the same credential, just typed instead of scanned.
      });

    return () => {
      active = false;
    };
  }, [card.parentIdentifier, siteUrl]);

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
          <p className="pac-child-name">{card.studentName}</p>
          {card.studentGrade ? (
            <p className="pac-child-grade">{card.studentGrade}</p>
          ) : null}
        </div>
      </section>

      <section className="pac-guardian">
        <p className="pac-label">Guardian / अभिभावक</p>
        <p className="pac-guardian-name">{card.guardianName}</p>
        {card.relationshipLabel ? (
          <p className="pac-relationship">{card.relationshipLabel}</p>
        ) : null}
      </section>

      <section className="pac-qr-block">
        <p className="pac-scan">SCAN TO SIGN IN</p>
        <p className="pac-scan-ne">साइन इन गर्न स्क्यान गर्नुहोस्</p>
        <div
          className="pac-qr"
          // Generated locally by the qrcode package from our own URL — never
          // user input, never fetched.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </section>

      <p className="pac-or">OR TYPE THIS / अथवा यो टाइप गर्नुहोस्</p>

      <section className="pac-credentials">
        <div className="pac-cred">
          <p className="pac-label">Parent ID / अभिभावक आईडी</p>
          <p className="pac-value">{card.parentIdentifier}</p>
        </div>
      </section>

      <footer className="pac-footer">
        <p className="pac-help">Need help? Please contact the school office.</p>
        <p className="pac-help-ne">
          सहयोग चाहिएमा विद्यालयको कार्यालयमा सम्पर्क गर्नुहोस्।
        </p>
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
