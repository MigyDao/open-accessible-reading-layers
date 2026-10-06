# Open Reading Layers — V0.1 Technical Specification

**Status:** Draft 0.1  
**Project:** Open Accessible Reading Layers  
**Owner:** A Likkle More Eco  
**Initiator:** Miguel Francis

## 1. Purpose

Open Reading Layers (ORL) defines a small, portable sidecar format for optional reading-support information that can travel separately from an EPUB publication.

The V0.1 goal is:

> A reader can open a DRM-free EPUB, load an ORL sidecar file, and independently toggle three support layers: People/Characters, Timeline/Chronology, and Re-entry Context.

The EPUB remains unchanged.

## 2. Design principles

1. **Reader control** — support layers are optional and independently toggleable.
2. **Publication first** — support supplements rather than replaces the source.
3. **Portable sidecar** — ORL data is stored separately from the EPUB.
4. **Existing standards first** — align with EPUB, Readium locators, Web Annotation and EPUB Annotation work rather than inventing new targeting mechanics.
5. **Spoiler-aware by default** — information is not exposed before its reveal point.
6. **Accessible by construction** — every support item has a meaningful text representation.
7. **Local-first core** — V0.1 requires no account.
8. **Graceful failure** — ORL failure never blocks base reading.

## 3. Scope

### Included

- DRM-free EPUB 3;
- one or more ORL sidecar files;
- `people`, `timeline`, and `reentry` layer semantics;
- independent visibility controls;
- author, personal, and community provenance labels;
- portable JSON import/export;
- publication matching;
- location-aware reveal rules;
- keyboard and screen-reader operability.

### Excluded

- bookstore / marketplace;
- accounts / cloud sync;
- proprietary DRM;
- PDF;
- collaborative editing;
- paid community layers;
- AI generation as a runtime requirement;
- universal icon language;
- social/community moderation.

## 4. Existing-standards relationship

ORL V0.1 uses the EPUB package unique identifier as the primary publication match.

In-book locations use a compact locator object modeled on Readium Locators:

- `href`;
- media `type`;
- `locations` such as position, progression, total progression or fragment;
- optional text context for resilient matching.

The shape is intentionally migration-friendly toward current W3C annotation work.

## 5. Top-level package

```json
{
  "$schema": "https://openreadinglayers.org/schema/orl-0.1.schema.json",
  "schemaVersion": "0.1",
  "id": "urn:uuid:...",
  "publication": {},
  "metadata": {},
  "layers": []
}
```

Required:

- `schemaVersion`;
- `id`;
- `publication`;
- `metadata`;
- `layers`.

## 6. Publication matching

```json
{
  "publication": {
    "identifier": "urn:isbn:9780000000000",
    "modified": "2026-10-01T12:00:00Z",
    "title": "Example Book",
    "language": "en"
  }
}
```

Rules:

- `identifier` is required and should match the EPUB package unique identifier;
- `modified` is optional but recommended;
- title/language are descriptive, not primary keys;
- identifier match with revision mismatch should normally warn rather than hard-fail;
- a future version may define a content fingerprint.

## 7. Package metadata

```json
{
  "metadata": {
    "title": "Official Reading Support",
    "description": "Optional support supplied by the author.",
    "language": "en",
    "provenance": "author",
    "creator": [{"name": "Example Author"}],
    "license": "CC-BY-4.0"
  }
}
```

Allowed V0.1 provenance values:

- `author`;
- `personal`;
- `community`.

Readers should clearly communicate provenance.

## 8. Layer object

```json
{
  "id": "people",
  "type": "people",
  "label": "People",
  "description": "Reminders about people introduced so far.",
  "defaultVisible": false,
  "items": []
}
```

Required:

- `id`;
- `type`;
- `label`;
- `items`.

Runtime-recognized V0.1 types:

- `people`;
- `timeline`;
- `reentry`.

Unknown future types must be ignored safely rather than breaking reading.

## 9. Locator

```json
{
  "href": "chapter-03.xhtml",
  "type": "application/xhtml+xml",
  "locations": {
    "progression": 0.42,
    "position": 57,
    "fragments": ["epubcfi(/6/10!/4/2/8)"]
  },
  "text": {
    "before": "When the door finally opened, ",
    "highlight": "Mara",
    "after": " stepped into the workshop."
  }
}
```

Every locator requires:

- `href`;
- `type`;
- `locations` with at least one usable location hint.

Text context is recommended for recovery but should avoid unnecessary copying of copyrighted text.

## 10. Target range

```json
{
  "target": {
    "start": {},
    "end": {}
  }
}
```

- `start` is required;
- `end` is optional;
- information is unavailable before `start`;
- range-limited information may be context-active only between start and end.

## 11. Common item

```json
{
  "id": "item-001",
  "target": {"start": {}},
  "label": "Human-readable label",
  "text": "Plain-language support content",
  "visual": null,
  "data": {}
}
```

Required:

- `id`;
- `target.start`;
- `label`;
- `text`.

Text remains authoritative.

## 12. People layer

Purpose: reduce memory load around people, roles, aliases, and relationships already revealed by the publication.

Example:

```json
{
  "id": "person-mara",
  "target": {
    "start": {
      "href": "chapter-03.xhtml",
      "type": "application/xhtml+xml",
      "locations": {"progression": 0.42}
    }
  },
  "label": "Mara",
  "text": "The mechanic who runs the river workshop.",
  "data": {
    "name": "Mara",
    "role": "Mechanic"
  }
}
```

The item is hidden before its reveal point and available afterward.

## 13. Timeline layer

Purpose: externalize sequence, elapsed time, dates, or events.

The data model does not prescribe whether the reader presents this as a semantic list, ruler, bar, calendar, or another visualization.

A non-visual semantic representation is always required.

## 14. Re-entry layer

Purpose: help a reader resume after a break without rereading large sections.

It may contain:

- current situation;
- key people;
- active objective;
- unresolved questions;
- concise already-known context.

Automatic "you have been away" behavior belongs to reader preferences, not the ORL data format.

## 15. Spoiler-safety rule

By default:

- an item is unavailable before `target.start`;
- an item may remain available afterward;
- range-limited items may be context-active only between start/end;
- future items must not be surfaced merely because they exist in the sidecar.

Locked items must not leak through accessible names, hidden DOM, counts, search results, or keyboard navigation.

## 16. Accessibility requirements

Reference implementations must:

- expose controls to keyboard users;
- provide meaningful names/states to screen readers;
- avoid required color-only meaning;
- preserve text equivalents for visuals;
- allow individual layer disablement;
- avoid obscuring source text;
- respect ordinary reading preferences;
- fail without blocking the book if ORL data is malformed/unresolved.

## 17. Privacy

- personal layer files should remain local by default;
- importing a book must not automatically upload its contents;
- ORL requires no account;
- hosted-service privacy rules are outside this specification.

## 18. Validation

A V0.1 validator should check:

1. valid JSON;
2. supported schema version;
3. package ID;
4. publication identifier;
5. metadata provenance;
6. unique layer IDs;
7. layer types;
8. unique item IDs;
9. required item text;
10. valid start locator;
11. locator field types;
12. no fatal dependency on optional visual data.

Recoverable conditions should normally produce warnings rather than block reading.

## 19. Reference-reader acceptance criteria

V0.1 is successful when the reference reader can:

- open one DRM-free EPUB;
- load one ORL sidecar;
- check publication identity;
- toggle People, Timeline, and Re-entry independently;
- reveal support only at/after its target;
- navigate to support targets where practical;
- continue reading if ORL fails;
- import/export the sidecar unchanged;
- operate support UI by keyboard/screen reader;
- work without an account.

## 20. Architectural decision

**ORL V0.1 innovates in support-layer semantics, not publication-location mechanics.**

If W3C EPUB Annotation work stabilizes in a form that cleanly expresses ORL's needs, migration toward a standards-native profile is preferred over maintaining unnecessary proprietary targeting.
