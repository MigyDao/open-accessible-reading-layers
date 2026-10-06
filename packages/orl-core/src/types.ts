export interface OrlTextContext {
  before?: string;
  highlight?: string;
  after?: string;
}

export interface OrlLocations {
  progression?: number;
  totalProgression?: number;
  position?: number;
  fragments?: string[];
  [key: string]: unknown;
}

export interface OrlLocator {
  href: string;
  type: string;
  title?: string;
  locations: OrlLocations;
  text?: OrlTextContext;
  [key: string]: unknown;
}

export interface OrlTarget {
  start: OrlLocator;
  end?: OrlLocator;
}

export interface OrlVisual {
  src?: string;
  alt?: string;
  decorative?: boolean;
  [key: string]: unknown;
}

export interface OrlItem {
  id: string;
  target: OrlTarget;
  label: string;
  text: string;
  visual?: OrlVisual | null;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OrlLayer {
  id: string;
  type: string;
  label: string;
  description?: string;
  defaultVisible?: boolean;
  items: OrlItem[];
  [key: string]: unknown;
}

export type OrlProvenance = "author" | "personal" | "community";

export interface OrlPackage {
  schemaVersion: "0.1";
  id: string;
  publication: {
    identifier: string;
    modified?: string;
    title?: string;
    language?: string;
    [key: string]: unknown;
  };
  metadata: {
    title: string;
    description?: string;
    language: string;
    provenance: OrlProvenance;
    creator?: Array<{ name: string; id?: string }>;
    license?: string;
    created?: string;
    modified?: string;
    [key: string]: unknown;
  };
  layers: OrlLayer[];
  [key: string]: unknown;
}

export interface PublicationIndex {
  /**
   * Publication-relative reading-order hrefs in spine order.
   *
   * Example:
   * ["EPUB/chapter-01.xhtml", "EPUB/chapter-02.xhtml"]
   */
  readingOrder: string[];
}

export type LocatorComparison = -1 | 0 | 1 | null;

export type Eligibility = "locked" | "active" | "revealed";
