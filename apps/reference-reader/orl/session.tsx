"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { Locator, Publication } from "@readium/shared";

import demoPackageJson from "../../../examples/demo-book/the-water-line.orl.json";
import {
  compareLocators,
  normalizeResourceHref,
  publicationMatches,
  validateOrlPackage,
  type OrlItem,
  type OrlLocator,
  type OrlPackage,
  type PublicationIndex,
  type ValidationDiagnostic
} from "@open-reading-layers/core";

interface OrlSessionValue {
  package: OrlPackage | null;
  diagnostics: ValidationDiagnostic[];
  revealedPeople: OrlItem[];
  updateCurrentLocator: (locator: Locator) => Promise<void>;
}

const OrlSessionContext = createContext<OrlSessionValue | null>(null);

function resourceMatches(a: string, b: string): boolean {
  const first = normalizeResourceHref(a);
  const second = normalizeResourceHref(b);

  return (
    first === second ||
    first.endsWith(`/${second}`) ||
    second.endsWith(`/${first}`)
  );
}

function toOrlLocator(locator: Locator): OrlLocator {
  const serialized = locator.serialize();

  return {
    href: serialized.href,
    type: serialized.type,
    title: serialized.title,
    locations: serialized.locations ?? {},
    text: serialized.text
  };
}

function targetFragment(target: OrlLocator): string | null {
  const fromLocations = target.locations.fragments?.[0];
  if (fromLocations) {
    return fromLocations.replace(/^#/, "");
  }

  const hash = target.href.indexOf("#");
  if (hash >= 0) {
    return target.href.slice(hash + 1);
  }

  return null;
}

function currentCssSelector(locator: Locator): string | null {
  const serialized = locator.serialize();
  const selector = serialized.locations?.cssSelector;

  return typeof selector === "string" && selector.trim()
    ? selector
    : null;
}

function readingOrderIndex(
  href: string,
  publication: PublicationIndex
): number {
  const target = normalizeResourceHref(href);

  return publication.readingOrder.findIndex((candidateHref) => {
    const candidate = normalizeResourceHref(candidateHref);

    return (
      candidate === target ||
      candidate.endsWith(`/${target}`) ||
      target.endsWith(`/${candidate}`)
    );
  });
}

class XhtmlCache {
  private readonly documents = new Map<string, Promise<Document>>();

  get(url: string): Promise<Document> {
    let pending = this.documents.get(url);

    if (!pending) {
      pending = fetch(url).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Unable to load publication resource: ${response.status}`
          );
        }

        const source = await response.text();
        const document = new DOMParser().parseFromString(
          source,
          "application/xhtml+xml"
        );

        if (document.querySelector("parsererror")) {
          throw new Error("Publication XHTML could not be parsed.");
        }

        return document;
      });
      this.documents.set(url, pending);
    }

    return pending;
  }
}

async function compareWithinResource(
  current: Locator,
  target: OrlLocator,
  manifestUrl: string,
  cache: XhtmlCache
): Promise<-1 | 0 | 1 | null> {
  const fragment = targetFragment(target);
  const selector = currentCssSelector(current);

  if (!fragment || !selector) {
    const currentFragments =
      current.serialize().locations?.fragments ?? [];

    if (
      Array.isArray(currentFragments) &&
      currentFragments.some(
        (value) => String(value).replace(/^#/, "") === fragment
      )
    ) {
      return 0;
    }

    return null;
  }

  const currentHref = current.href.split("#", 1)[0] ?? current.href;
  const resourceUrl = new URL(currentHref, manifestUrl).toString();

  try {
    const document = await cache.get(resourceUrl);
    const currentElement = document.querySelector(selector);
    const targetElement = document.getElementById(fragment);

    if (!currentElement || !targetElement) {
      return null;
    }

    if (currentElement === targetElement) {
      return 0;
    }

    const relation = currentElement.compareDocumentPosition(targetElement);

    if (relation & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }

    if (relation & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }

    return null;
  } catch (error) {
    console.warn("ORL anchor resolution failed.", error);
    return null;
  }
}

async function hasReachedTarget(
  current: Locator,
  target: OrlLocator,
  publication: PublicationIndex,
  manifestUrl: string,
  cache: XhtmlCache
): Promise<boolean> {
  const currentIndex = readingOrderIndex(current.href, publication);
  const targetIndex = readingOrderIndex(target.href, publication);

  if (currentIndex >= 0 && targetIndex >= 0) {
    if (currentIndex > targetIndex) return true;
    if (currentIndex < targetIndex) return false;

    if (resourceMatches(current.href, target.href)) {
      const domComparison = await compareWithinResource(
        current,
        target,
        manifestUrl,
        cache
      );

      if (domComparison !== null) {
        return domComparison >= 0;
      }
    }
  }

  const fallback = compareLocators(
    toOrlLocator(current),
    target,
    publication
  );

  return fallback !== null && fallback >= 0;
}

export function OrlSessionProvider({
  publication,
  manifestUrl,
  children
}: {
  publication: Publication;
  manifestUrl: string;
  children: ReactNode;
}) {
  const validation = useMemo(
    () => validateOrlPackage(demoPackageJson),
    []
  );

  const publicationIndex = useMemo<PublicationIndex>(
    () => ({
      readingOrder: publication.readingOrder.items.map(
        (link) => link.href
      )
    }),
    [publication]
  );

  const [revealedPeople, setRevealedPeople] = useState<OrlItem[]>([]);
  const revealedIds = useRef(new Set<string>());
  const xhtmlCache = useRef(new XhtmlCache());

  const publicationDiagnostics = useMemo(() => {
    if (!validation.package) return [];

    const identifier = publication.metadata.identifier;

    if (!identifier) {
      return [
        {
          level: "error" as const,
          code: "publication.identifier-missing",
          message:
            "The opened publication has no identifier, so ORL support cannot be safely matched."
        }
      ];
    }

    return publicationMatches(validation.package, identifier);
  }, [publication, validation.package]);

  const activePackage =
    validation.valid &&
    validation.package &&
    !publicationDiagnostics.some(
      (diagnostic) => diagnostic.level === "error"
    )
      ? validation.package
      : null;

  const diagnostics = useMemo(
    () => [...validation.diagnostics, ...publicationDiagnostics],
    [publicationDiagnostics, validation.diagnostics]
  );

  const updateCurrentLocator = useCallback(
    async (locator: Locator) => {
      if (!activePackage) return;

      const peopleLayer = activePackage.layers.find(
        (layer) => layer.type === "people"
      );

      if (!peopleLayer) return;

      let changed = false;

      for (const item of peopleLayer.items) {
        if (revealedIds.current.has(item.id)) continue;

        const reached = await hasReachedTarget(
          locator,
          item.target.start,
          publicationIndex,
          manifestUrl,
          xhtmlCache.current
        );

        if (reached) {
          revealedIds.current.add(item.id);
          changed = true;
        }
      }

      if (changed) {
        setRevealedPeople(
          peopleLayer.items.filter((item) =>
            revealedIds.current.has(item.id)
          )
        );
      }
    },
    [activePackage, manifestUrl, publicationIndex]
  );

  const value = useMemo<OrlSessionValue>(
    () => ({
      package: activePackage,
      diagnostics,
      revealedPeople,
      updateCurrentLocator
    }),
    [
      activePackage,
      diagnostics,
      revealedPeople,
      updateCurrentLocator
    ]
  );

  return (
    <OrlSessionContext.Provider value={value}>
      {children}
    </OrlSessionContext.Provider>
  );
}

export function useOrlSession(): OrlSessionValue {
  const session = useContext(OrlSessionContext);

  if (!session) {
    throw new Error(
      "useOrlSession must be used inside OrlSessionProvider."
    );
  }

  return session;
}
