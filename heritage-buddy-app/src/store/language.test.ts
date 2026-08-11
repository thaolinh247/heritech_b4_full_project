import { useLanguageStore } from "./language";

describe("language store", () => {
  it("defaults to vi", () => {
    expect(useLanguageStore.getState().language).toBe("vi");
  });

  it("setLanguage updates the language", () => {
    useLanguageStore.getState().setLanguage("en");
    expect(useLanguageStore.getState().language).toBe("en");
    useLanguageStore.getState().setLanguage("vi");
    expect(useLanguageStore.getState().language).toBe("vi");
  });

  it("sets hydrated after rehydration", async () => {
    useLanguageStore.getState().setHydrated(false);
    await useLanguageStore.persist.rehydrate();
    expect(useLanguageStore.getState().hydrated).toBe(true);
  });
});
