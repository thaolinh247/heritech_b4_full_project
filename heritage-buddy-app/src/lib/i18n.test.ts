import { STRINGS, pickViEn, t } from "./i18n";

describe("i18n dictionary", () => {
  it("en has exactly the same keys as vi", () => {
    const viKeys = Object.keys(STRINGS.vi).sort();
    const enKeys = Object.keys(STRINGS.en).sort();
    expect(viKeys).toEqual(enKeys);
  });

  it("no translation value is empty", () => {
    for (const lang of ["vi", "en"] as const) {
      for (const value of Object.values(STRINGS[lang])) {
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("t()", () => {
  it("returns the requested language", () => {
    expect(t("common.back", undefined, "vi")).toBe("Quay lại");
    expect(t("common.back", undefined, "en")).toBe("Back");
  });

  it("interpolates options", () => {
    expect(t("ctx.nodeDescFallback", { section: "ancient", order: 3 }, "vi")).toBe(
      "Hiện vật thuộc ancient, thứ tự 3 trong chuyến tham quan.",
    );
    expect(t("llm.networkErrorTemplate", { msg: "timeout" }, "en")).toContain("timeout");
  });

  it("falls back to vi when a key is missing in the requested language", () => {
    const missing = "common.back" as keyof typeof STRINGS.vi;
    // Simulate missing en key
    const original = STRINGS.en[missing];
    delete (STRINGS.en as Record<string, string>)[missing];
    expect(t(missing, undefined, "en")).toBe("Quay lại");
    (STRINGS.en as Record<string, string>)[missing] = original;
  });
});

describe("pickViEn()", () => {
  it("returns en when language is en and en text exists", () => {
    expect(pickViEn("Trống đồng", "Dong Son drum", "en")).toBe("Dong Son drum");
  });

  it("falls back to vi when en text is empty or missing", () => {
    expect(pickViEn("Trống đồng", "", "en")).toBe("Trống đồng");
    expect(pickViEn("Trống đồng", "  ", "en")).toBe("Trống đồng");
    expect(pickViEn("Trống đồng", null, "en")).toBe("Trống đồng");
  });

  it("returns vi for vi language", () => {
    expect(pickViEn("Trống đồng", "Dong Son drum", "vi")).toBe("Trống đồng");
  });
});
