import { describe, expect, it } from "vitest";

import {
  compareLocators,
  getEligibility,
  normalizeResourceHref,
  type OrlLocator,
  type PublicationIndex
} from "../src/index";

const publication: PublicationIndex = {
  readingOrder: [
    "EPUB/chapter-01.xhtml",
    "EPUB/chapter-02.xhtml",
    "EPUB/chapter-03.xhtml"
  ]
};

function locator(
  href: string,
  locations: OrlLocator["locations"]
): OrlLocator {
  return {
    href,
    type: "application/xhtml+xml",
    locations
  };
}

describe("normalizeResourceHref", () => {
  it("removes query/fragment and leading relative markers", () => {
    expect(
      normalizeResourceHref("./EPUB/chapter-01.xhtml#intro")
    ).toBe("EPUB/chapter-01.xhtml");
  });
});

describe("compareLocators", () => {
  it("prefers absolute publication positions when both exist", () => {
    expect(
      compareLocators(
        locator("EPUB/chapter-02.xhtml", { position: 4 }),
        locator("EPUB/chapter-01.xhtml", { position: 5 }),
        publication
      )
    ).toBe(-1);
  });

  it("uses reading-order resources when positions are absent", () => {
    expect(
      compareLocators(
        locator("EPUB/chapter-03.xhtml", { progression: 0 }),
        locator("EPUB/chapter-02.xhtml", { progression: 0.9 }),
        publication
      )
    ).toBe(1);
  });

  it("matches ORL-relative resources against served URL prefixes", () => {
    const servedPublication: PublicationIndex = {
      readingOrder: [
        "http://127.0.0.1:15080/webpub/demo/EPUB/chapter-01.xhtml",
        "http://127.0.0.1:15080/webpub/demo/EPUB/chapter-02.xhtml"
      ]
    };

    expect(
      compareLocators(
        locator(
          "http://127.0.0.1:15080/webpub/demo/EPUB/chapter-02.xhtml",
          { progression: 0.1 }
        ),
        locator("EPUB/chapter-01.xhtml", { progression: 0.9 }),
        servedPublication
      )
    ).toBe(1);
  });

  it("uses progression within the same resource", () => {
    expect(
      compareLocators(
        locator("EPUB/chapter-01.xhtml", { progression: 0.3 }),
        locator("EPUB/chapter-01.xhtml", { progression: 0.4 }),
        publication
      )
    ).toBe(-1);
  });

  it("returns null when it cannot compare safely", () => {
    expect(
      compareLocators(
        locator("EPUB/unknown.xhtml", { progression: 0.5 }),
        locator("EPUB/chapter-01.xhtml", { progression: 0.5 }),
        publication
      )
    ).toBeNull();
  });
});

describe("getEligibility", () => {
  const maraStart = locator("EPUB/chapter-01.xhtml", {
    position: 4,
    progression: 0.35
  });

  it("keeps Mara locked before the reveal position", () => {
    const current = locator("EPUB/chapter-01.xhtml", {
      position: 3,
      progression: 0.2
    });

    expect(
      getEligibility(current, { start: maraStart }, publication)
    ).toBe("locked");
  });

  it("reveals Mara at the reveal position", () => {
    const current = locator("EPUB/chapter-01.xhtml", {
      position: 4,
      progression: 0.35
    });

    expect(
      getEligibility(current, { start: maraStart }, publication)
    ).toBe("revealed");
  });

  it("reveals Mara after the reveal position", () => {
    const current = locator("EPUB/chapter-02.xhtml", {
      position: 8,
      progression: 0.1
    });

    expect(
      getEligibility(current, { start: maraStart }, publication)
    ).toBe("revealed");
  });

  it("keeps unresolvable spoiler-sensitive targets locked", () => {
    const current = locator("EPUB/chapter-01.xhtml", {
      progression: 0.8
    });
    const unresolved = locator("EPUB/missing.xhtml", {
      progression: 0.1
    });

    expect(
      getEligibility(current, { start: unresolved }, publication)
    ).toBe("locked");
  });

  it("marks ranged context active until its end", () => {
    const start = locator("EPUB/chapter-01.xhtml", {
      position: 2
    });
    const end = locator("EPUB/chapter-03.xhtml", {
      position: 10
    });
    const current = locator("EPUB/chapter-02.xhtml", {
      position: 7
    });

    expect(
      getEligibility(current, { start, end }, publication)
    ).toBe("active");
  });

  it("marks ranged context revealed after its end", () => {
    const start = locator("EPUB/chapter-01.xhtml", {
      position: 2
    });
    const end = locator("EPUB/chapter-02.xhtml", {
      position: 7
    });
    const current = locator("EPUB/chapter-03.xhtml", {
      position: 11
    });

    expect(
      getEligibility(current, { start, end }, publication)
    ).toBe("revealed");
  });
});
