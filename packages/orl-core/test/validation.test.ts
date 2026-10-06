import { describe, expect, it } from "vitest";

import fixture from "../../../examples/demo-book/the-water-line.orl.json";
import {
  publicationMatches,
  validateOrlPackage
} from "../src/validate.js";

describe("validateOrlPackage", () => {
  it("accepts the ALME demo ORL package", () => {
    const result = validateOrlPackage(fixture);

    expect(result.valid).toBe(true);
    expect(result.package?.metadata.title).toContain("Water Line");
    expect(
      result.diagnostics.filter((item) => item.level === "error")
    ).toHaveLength(0);
  });

  it("rejects malformed packages without throwing", () => {
    const result = validateOrlPackage({
      schemaVersion: "0.1",
      id: "broken"
    });

    expect(result.valid).toBe(false);
    expect(result.package).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("rejects duplicate item ids semantically", () => {
    const copy = structuredClone(fixture);
    copy.layers[0]!.items[1]!.id = copy.layers[0]!.items[0]!.id;

    const result = validateOrlPackage(copy);

    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some(
        (item) => item.code === "semantic.duplicate-item-id"
      )
    ).toBe(true);
  });
});

describe("publicationMatches", () => {
  it("accepts the intended demo publication", () => {
    const validation = validateOrlPackage(fixture);
    expect(validation.package).not.toBeNull();

    expect(
      publicationMatches(
        validation.package!,
        "urn:uuid:orl-demo-the-water-line-v0.1"
      )
    ).toHaveLength(0);
  });

  it("reports a publication mismatch", () => {
    const validation = validateOrlPackage(fixture);

    expect(
      publicationMatches(
        validation.package!,
        "urn:uuid:some-other-book"
      )[0]?.code
    ).toBe("publication.identifier-mismatch");
  });
});
