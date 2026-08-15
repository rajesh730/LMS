import {
  translate,
  createTranslator,
  normalizeLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from "@/lib/parentI18n";

/**
 * §23 — the UI must be localisation-ready and must never hard-code text.
 * The property that matters most is graceful degradation: a missing Nepali
 * string has to fall back to readable English, never to a blank screen.
 */

describe("locale handling", () => {
  it("accepts the supported locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "ne"]);
    expect(normalizeLocale("ne")).toBe("ne");
    expect(normalizeLocale("EN")).toBe("en");
  });

  it("falls back to the default for anything unknown", () => {
    expect(normalizeLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale("")).toBe(DEFAULT_LOCALE);
  });
});

describe("translate", () => {
  it("returns the Nepali string when one exists", () => {
    expect(translate("ne", "nav.home")).toBe("गृह");
    expect(translate("en", "nav.home")).toBe("Home");
  });

  it("interpolates named parameters", () => {
    expect(translate("en", "journey.title", { name: "Aayush" })).toBe(
      "Aayush's Journey"
    );
    expect(translate("ne", "journey.title", { name: "आयुष" })).toContain("आयुष");
  });

  it("leaves an unsupplied placeholder intact rather than printing 'undefined'", () => {
    expect(translate("en", "journey.title", {})).toBe("{name}'s Journey");
  });

  it("falls back to English for a key missing from the Nepali dictionary", () => {
    // Deliberately reaching for a key only defined in `en`.
    const value = translate("ne", "settings.simpleModeHelp");
    expect(value).toBeTruthy();
    expect(value).not.toBe("settings.simpleModeHelp");
  });

  it("returns the key itself for a key missing everywhere — never blank", () => {
    expect(translate("en", "does.not.exist")).toBe("does.not.exist");
    expect(translate("ne", "does.not.exist")).toBe("does.not.exist");
  });
});

describe("createTranslator", () => {
  it("binds a locale and exposes it", () => {
    const t = createTranslator("ne");
    expect(t.locale).toBe("ne");
    expect(t("nav.messages")).toBe("सन्देश");
  });

  it("normalises a bad locale instead of throwing", () => {
    const t = createTranslator("klingon");
    expect(t.locale).toBe("en");
    expect(t("nav.home")).toBe("Home");
  });
});

describe("dictionary coverage for the five primary destinations (§1)", () => {
  it.each([
    "nav.home",
    "nav.journey",
    "nav.events",
    "nav.messages",
    "nav.child",
  ])("%s is translated in every supported locale", (key) => {
    SUPPORTED_LOCALES.forEach((locale) => {
      const value = translate(locale, key);
      expect(value).toBeTruthy();
      // A key echoed back means the string is missing.
      expect(value).not.toBe(key);
    });
  });
});

describe("status labels are translated, not colour-only (§4)", () => {
  it.each(["status.actionRequired", "status.needsAttention", "status.complete"])(
    "%s has real text in both locales",
    (key) => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(translate(locale, key)).not.toBe(key);
      });
    }
  );
});
