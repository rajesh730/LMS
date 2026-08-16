import {
  extractActivationToken,
  readParentCard,
} from "@/components/parent/QrCardScanner";

/**
 * A scanned QR is untrusted input. It might be our card, a card from another
 * Pravyo deployment, or a completely unrelated code on a shop poster — the
 * guardian has no way to tell before pointing their camera at it.
 *
 * Returning null for anything unrecognised keeps junk out of the sign-in call
 * and lets the UI say "that is not a Pravyo Parent Card" instead of failing
 * obscurely.
 *
 * TWO card generations have to be read, because both are in school bags:
 * current cards carry the Parent ID, legacy cards carry a one-time token.
 */

const TOKEN = "abcDEF123456789_-xyzABCdef987654321";
const PARENT_ID = "PRV-P-X7K4Q9";

describe("reading a current Parent Card QR", () => {
  it("pulls the Parent ID out of the card's URL", () => {
    expect(
      readParentCard(
        `https://pravyo.infobytesnepal.com/parent/login?id=${PARENT_ID}`
      )
    ).toEqual({ parentId: PARENT_ID });
  });

  it("works for a localhost or staging card", () => {
    expect(
      readParentCard(`http://localhost:3000/parent/login?id=${PARENT_ID}`)
    ).toEqual({ parentId: PARENT_ID });
  });

  it("accepts a bare Parent ID, however it was written", () => {
    // Someone may type or photograph the ID rather than the QR.
    expect(readParentCard(PARENT_ID)).toEqual({ parentId: PARENT_ID });
    expect(readParentCard("prv-p-x7k4q9")).toEqual({ parentId: PARENT_ID });
    expect(readParentCard("PRVPX7K4Q9")).toEqual({ parentId: PARENT_ID });
    expect(readParentCard("  X7K4Q9  ")).toEqual({ parentId: PARENT_ID });
  });

  it("rejects an ID containing an ambiguous character", () => {
    // O/0 and I/1 are excluded from the alphabet precisely so a misread does
    // not silently resolve to a DIFFERENT real guardian.
    expect(readParentCard("PRV-P-X7K4Q0")).toBeNull();
    expect(readParentCard("PRV-P-X7K4QI")).toBeNull();
  });
});

describe("reading a legacy Parent Card QR", () => {
  it("still resolves a card printed under the old activation flow", () => {
    expect(
      readParentCard(
        `https://pravyo.infobytesnepal.com/parent/activate?t=${TOKEN}`
      )
    ).toEqual({ token: TOKEN });
  });

  it("survives extra query parameters", () => {
    expect(
      readParentCard(`https://example.com/parent/activate?utm=print&t=${TOKEN}`)
    ).toEqual({ token: TOKEN });
  });

  it("accepts a bare token, in case a QR carries only that", () => {
    expect(readParentCard(TOKEN)).toEqual({ token: TOKEN });
  });
});

describe("what it refuses", () => {
  it("rejects a URL with neither credential", () => {
    expect(
      readParentCard("https://pravyo.infobytesnepal.com/parent/login")
    ).toBeNull();
  });

  it("rejects an unrelated QR code", () => {
    // The kind of thing a guardian might scan by accident.
    expect(readParentCard("https://example.com/some/page")).toBeNull();
    expect(readParentCard("WIFI:S=MyNetwork;T=WPA;P=secret;;")).toBeNull();
    expect(readParentCard("tel:+9779800000000")).toBeNull();
  });

  it("rejects a short string that is neither an ID nor a token", () => {
    expect(readParentCard("abc123")).toBeNull();
  });

  it("handles empty and missing input", () => {
    expect(readParentCard("")).toBeNull();
    expect(readParentCard(null)).toBeNull();
    expect(readParentCard(undefined)).toBeNull();
    expect(readParentCard("   ")).toBeNull();
  });
});

describe("extractActivationToken (legacy helper)", () => {
  it("keeps working for the old card URL", () => {
    expect(
      extractActivationToken(`https://example.com/parent/activate?t=${TOKEN}`)
    ).toBe(TOKEN);
    expect(extractActivationToken(TOKEN)).toBe(TOKEN);
  });

  it("rejects text a base64url token never contains", () => {
    expect(extractActivationToken("hello world this is not a token")).toBeNull();
    expect(extractActivationToken("a".repeat(30) + "!!")).toBeNull();
    expect(extractActivationToken("")).toBeNull();
  });
});
