import { extractActivationToken } from "@/components/parent/QrCardScanner";

/**
 * A scanned QR is untrusted input. It might be our card, a card from another
 * Pravyo deployment, or a completely unrelated code on a shop poster — the
 * guardian has no way to tell before pointing their camera at it.
 *
 * Returning null for anything unrecognised keeps junk out of the activation
 * API and lets the UI say "that is not a Pravyo Parent Card" instead of
 * failing obscurely.
 */

const TOKEN = "abcDEF123456789_-xyzABCdef987654321";

describe("reading a Parent Card QR", () => {
  it("pulls the token out of the card's URL", () => {
    expect(
      extractActivationToken(
        `https://pravyo.infobytesnepal.com/parent/activate?t=${TOKEN}`
      )
    ).toBe(TOKEN);
  });

  it("works for a localhost or staging card", () => {
    expect(
      extractActivationToken(`http://localhost:3000/parent/activate?t=${TOKEN}`)
    ).toBe(TOKEN);
  });

  it("survives extra query parameters", () => {
    expect(
      extractActivationToken(
        `https://example.com/parent/activate?utm=print&t=${TOKEN}&x=1`
      )
    ).toBe(TOKEN);
  });

  it("accepts a bare token, in case a QR carries only that", () => {
    expect(extractActivationToken(TOKEN)).toBe(TOKEN);
  });

  it("trims surrounding whitespace", () => {
    expect(extractActivationToken(`  ${TOKEN}  `)).toBe(TOKEN);
  });
});

describe("what it refuses", () => {
  it("rejects a URL with no token", () => {
    expect(
      extractActivationToken("https://pravyo.infobytesnepal.com/parent/activate")
    ).toBeNull();
  });

  it("rejects an unrelated QR code", () => {
    // The kind of thing a guardian might scan by accident.
    expect(extractActivationToken("https://example.com/some/page")).toBeNull();
    expect(extractActivationToken("WIFI:S=MyNetwork;T=WPA;P=secret;;")).toBeNull();
    expect(extractActivationToken("tel:+9779800000000")).toBeNull();
  });

  it("rejects a short string that cannot be one of our tokens", () => {
    // Real tokens are 32 random bytes base64url — far longer than this.
    expect(extractActivationToken("abc123")).toBeNull();
  });

  it("rejects text with characters a base64url token never contains", () => {
    expect(extractActivationToken("hello world this is not a token")).toBeNull();
    expect(extractActivationToken("a".repeat(30) + "!!")).toBeNull();
  });

  it("handles empty and missing input", () => {
    expect(extractActivationToken("")).toBeNull();
    expect(extractActivationToken(null)).toBeNull();
    expect(extractActivationToken(undefined)).toBeNull();
    expect(extractActivationToken("   ")).toBeNull();
  });
});
