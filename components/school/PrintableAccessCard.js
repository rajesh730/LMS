"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * A single Parent Access Card, rendered on the CLIENT.
 *
 * The server-rendered card (components/school/ParentAccessCard.js) is used for
 * a one-off print, where the activation details arrive as query parameters.
 * A bulk run cannot work that way — putting 300 PINs in a URL is neither
 * practical nor safe — so the batch is held in memory on the client and each
 * card generates its own QR here.
 *
 * `qrcode` runs in the browser as well as on the server, so this needs no new
 * dependency and still makes no network call: the SVG is computed locally from
 * a URL we constructed ourselves.
 */
export default function PrintableAccessCard({ card, schoolName, siteUrl }) {
  const [qrSvg, setQrSvg] = useState("");

  useEffect(() => {
    let active = true;
    const activateUrl = `${siteUrl}/parent/activate?t=${encodeURIComponent(
      card.activationToken
    )}`;

    QRCode.toString(activateUrl, {
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
        // A missing QR still leaves a fully usable card: the Parent ID and PIN
        // below are an independent way in.
      });

    return () => {
      active = false;
    };
  }, [card.activationToken, siteUrl]);

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
        <p className="pac-scan">SCAN TO CONNECT</p>
        <p className="pac-scan-ne">जोड्न स्क्यान गर्नुहोस्</p>
        <div
          className="pac-qr"
          // Generated locally by the qrcode package from our own URL — never
          // user input, never fetched.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </section>

      <p className="pac-or">OR / अथवा</p>

      <section className="pac-credentials">
        <div className="pac-cred">
          <p className="pac-label">Parent ID</p>
          <p className="pac-value">{card.parentIdentifier}</p>
        </div>
        <div className="pac-cred">
          <p className="pac-label">PIN</p>
          <p className="pac-value">{card.activationPin}</p>
        </div>
      </section>

      <footer className="pac-footer">
        <p className="pac-help">Need help? Please contact the school office.</p>
        <p className="pac-help-ne">
          सहयोग चाहिएमा विद्यालयको कार्यालयमा सम्पर्क गर्नुहोस्।
        </p>
        {card.expiresAt ? (
          <p className="pac-expiry">
            Please connect before{" "}
            {new Date(card.expiresAt).toLocaleDateString("en-GB", {
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
