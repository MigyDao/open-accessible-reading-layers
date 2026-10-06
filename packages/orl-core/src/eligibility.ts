import type {
  Eligibility,
  LocatorComparison,
  OrlLocator,
  OrlTarget,
  PublicationIndex
} from "./types";

function compareNumber(a: number, b: number): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function normalizeResourceHref(href: string): string {
  const withoutFragment = href.split("#", 1)[0] ?? href;
  const withoutQuery = withoutFragment.split("?", 1)[0] ?? withoutFragment;

  return withoutQuery
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}

function readingOrderIndex(
  locator: OrlLocator,
  publication: PublicationIndex
): number {
  const target = normalizeResourceHref(locator.href);

  return publication.readingOrder.findIndex((href) => {
    const candidate = normalizeResourceHref(href);

    return (
      candidate === target ||
      candidate.endsWith(`/${target}`) ||
      target.endsWith(`/${candidate}`)
    );
  });
}

/**
 * Compares two ORL/Readium-style locators.
 *
 * Returns:
 * - -1 when a is before b
 * -  0 when the available locator information places them at the same point
 * -  1 when a is after b
 * - null when the available data is not sufficient to compare safely
 *
 * A null comparison is deliberately conservative. Callers should not reveal
 * spoiler-sensitive content when they cannot prove that the reveal point has
 * been reached.
 */
export function compareLocators(
  a: OrlLocator,
  b: OrlLocator,
  publication: PublicationIndex
): LocatorComparison {
  const aPosition = a.locations.position;
  const bPosition = b.locations.position;

  if (
    typeof aPosition === "number" &&
    Number.isInteger(aPosition) &&
    typeof bPosition === "number" &&
    Number.isInteger(bPosition)
  ) {
    return compareNumber(aPosition, bPosition);
  }

  const aIndex = readingOrderIndex(a, publication);
  const bIndex = readingOrderIndex(b, publication);

  if (aIndex >= 0 && bIndex >= 0 && aIndex !== bIndex) {
    return compareNumber(aIndex, bIndex);
  }

  if (aIndex < 0 || bIndex < 0) {
    return null;
  }

  const aProgression = a.locations.progression;
  const bProgression = b.locations.progression;

  if (
    typeof aProgression === "number" &&
    typeof bProgression === "number"
  ) {
    return compareNumber(aProgression, bProgression);
  }

  const aTotal = a.locations.totalProgression;
  const bTotal = b.locations.totalProgression;

  if (typeof aTotal === "number" && typeof bTotal === "number") {
    return compareNumber(aTotal, bTotal);
  }

  const aFragments = a.locations.fragments;
  const bFragments = b.locations.fragments;

  if (
    Array.isArray(aFragments) &&
    Array.isArray(bFragments) &&
    aFragments.length > 0 &&
    bFragments.length > 0 &&
    aFragments.some((fragment) => bFragments.includes(fragment))
  ) {
    return 0;
  }

  return null;
}

/**
 * Determines the spoiler-safe state of one support item at the current
 * reading position.
 *
 * Unknown/unresolvable start positions remain locked.
 *
 * For a ranged item:
 * - before start: locked
 * - at/after start but before end: active
 * - at/after end: revealed
 *
 * Callers that only want context-active range items (for example Re-entry)
 * can filter for "active". Persistent layer types such as People and
 * Timeline can display both "active" and "revealed" items.
 */
export function getEligibility(
  current: OrlLocator,
  target: OrlTarget,
  publication: PublicationIndex
): Eligibility {
  const startComparison = compareLocators(
    current,
    target.start,
    publication
  );

  if (startComparison === null || startComparison < 0) {
    return "locked";
  }

  if (!target.end) {
    return "revealed";
  }

  const endComparison = compareLocators(
    current,
    target.end,
    publication
  );

  if (endComparison === null || endComparison < 0) {
    return "active";
  }

  return "revealed";
}

export function isEligible(
  current: OrlLocator,
  target: OrlTarget,
  publication: PublicationIndex
): boolean {
  return getEligibility(current, target, publication) !== "locked";
}
