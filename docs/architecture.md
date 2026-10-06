# ORL V0.1 Architecture

## Architectural goal

ORL should innovate in **reading-support semantics**, not in EPUB rendering or publication-location mechanics.

The V0.1 reference implementation therefore builds on **Thorium Web / Readium** and keeps ORL as a separate, portable system.

## High-level architecture

```text
EPUB
  │
  ▼
Thorium Web / Readium
  │
  ├── current Readium Locator
  │
  └── normal accessible reading UI
          │
          ▼
      ORL Engine
          │
          ├── package validation
          ├── publication matching
          ├── spoiler-safe eligibility
          └── enabled-layer state
                  │
                  ▼
          Reading Support UI
          ├── People
          ├── Timeline
          └── Re-entry
```

The ORL sidecar remains separate from the EPUB.

## Core modules

### ORL Core

Environment-neutral code responsible for:

- V0.1 TypeScript types;
- JSON Schema;
- parse/validation;
- publication identity matching;
- diagnostics;
- normalization.

It must not depend on Tauri, Next.js server APIs, cloud services, or a specific storage backend.

### ORL Engine

Environment-neutral logic responsible for:

- receiving the current Readium Locator;
- comparing it with ORL target locators;
- determining locked/revealed/context-active state;
- enforcing spoiler-safe progressive disclosure;
- filtering output so locked items never reach presentation selectors;
- resolving navigation requests.

The eligibility engine should be independently unit-testable without rendering an EPUB.

### ORL UI

React components responsible for:

- Reading Support trigger;
- support panel;
- per-layer toggles;
- People cards;
- Timeline list;
- Re-entry context;
- provenance and diagnostics.

The UI does not decide spoiler eligibility.

## Thorium integration

Thorium Web exposes two especially useful integration points.

### Position storage

`StatefulReader` accepts a custom position-storage adapter:

```ts
interface PositionStorage {
  get: () => Locator | undefined;
  set: (locator: Locator) => void | Promise<void>;
}
```

Thorium calls `set(locator)` when navigator position changes.

The ORL reference reader can therefore persist the reading position and publish the latest locator to the ORL engine without scraping the DOM or patching navigator internals.

Concept:

```ts
const positionStorage: PositionStorage = {
  get: () => storedLocator,
  set: async (locator) => {
    storedLocator = locator;
    persist(locator);
    orlSession.updateCurrentLocator(locator);
  }
};
```

### Plugin registry

Thorium plugins can register custom action triggers and targets.

ORL should register a **Reading Support** action and panel while retaining Thorium's default controls.

Concept:

```ts
const orlPlugin: ThPlugin = {
  id: "open-reading-layers",
  name: "Open Reading Layers",
  description: "Optional reader-controlled support layers",
  version: "0.1.0",
  components: {
    actions: {
      "reading-support": {
        Trigger: ReadingSupportTrigger,
        Target: ReadingSupportPanel
      }
    },
    settings: {}
  }
};
```

## Locator strategy

ORL uses standards-aligned locator information rather than inventing a proprietary anchor format.

Preferred comparison order:

1. resolved absolute publication `position`;
2. reading-order resource index + within-resource `progression`;
3. fragment / EPUB CFI where available;
4. text context for recovery;
5. unresolved target becomes a diagnostic warning.

Thorium already relies on a Readium Positions List, which makes publication positions a strong V0.1 comparison basis.

## Spoiler-state model

A support item can be:

- **locked** — before its start target;
- **revealed** — at/after start;
- **active** — within a target range when contextual activity matters.

People and Timeline entries may remain available after reveal.

Re-entry entries are generally context-sensitive to their start/end range.

Locked items must never leak through:

- visible UI;
- hidden DOM;
- ARIA text;
- counts;
- search/filter output;
- keyboard navigation;
- production-facing debug data.

## Web + desktop from one core

ORL should support two first-class delivery modes.

### Hosted web reference reader

Useful for:

- public demos;
- contributors;
- accessibility testing;
- development;
- documentation.

### Local desktop reader

Preferred direction:

**Tauri 2 + the same React/Thorium Web frontend + local Readium publication processing/service**

Target behavior:

- install one desktop application;
- choose a local DRM-free EPUB;
- keep the EPUB on-device;
- load/save ORL sidecars locally;
- store personal reading state locally by default;
- require no internet for ordinary reading after installation.

The desktop application should use explicitly scoped file permissions rather than broad filesystem access.

## First executable slice

The first runnable proof is deliberately tiny:

> Open the ALME-owned demo EPUB, load a valid ORL sidecar, display Reading Support, and reveal the character Mara only after the current Readium Locator reaches her introduction.

This proves the essential integration before Timeline, Re-entry, local EPUB import, or complex UI are built.

## Explicit V0.1 non-goals

Do not add yet:

- accounts;
- cloud library;
- social features;
- marketplace;
- payments;
- proprietary DRM;
- PDF;
- AI-generated layers;
- community discovery;
- full authoring GUI;
- analytics beyond local debugging.

## Future standards direction

ORL should continue tracking W3C Web Annotation / EPUB Annotation work and Readium models.

If a mature standards-native format can express ORL requirements cleanly, ORL should prefer becoming a profile/extension of that standard over maintaining unnecessary proprietary targeting mechanics.
