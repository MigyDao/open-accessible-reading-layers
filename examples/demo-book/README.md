# ALME Demo EPUB Fixture — The Water Line

**The Water Line** is a small A Likkle More Eco-owned technical story fixture for developing and testing ORL.

It is not intended as a polished publication.

## Story outline

### Chapter 1 — Morning

Ari arrives at a hillside workshop to help repair a gravity-fed water system before the afternoon heat.

Introduces:

- **Ari** — practical newcomer and viewpoint character;
- **Mara** — workshop mechanic.

Timeline:

- 08:10 — Ari arrives.

### Chapter 2 — The Tank

Ari and Mara discover the upper tank is intact, but flow is blocked farther downhill.

Introduces:

- **Jo** — cultivator responsible for the lower garden.

Timeline:

- 09:05 — Jo reports the lower beds have been without water since dawn.

### Chapter 3 — The Break

The group finds a cracked coupling hidden under leaf litter. Mara walks back for a replacement while Ari and Jo clear the channel.

Timeline:

- 10:20 — fault located;
- 11:00 — repair parts arrive.

State change:

- unknown blockage → known mechanical failure.

### Chapter 4 — Flow

The coupling is replaced and the water line is tested.

Timeline:

- 11:35 — flow restored.

## ORL behavior

### People

- Ari available from the opening;
- Mara locked until her Chapter 1 introduction;
- Jo locked until his Chapter 2 introduction.

### Timeline

Events must remain hidden until their reveal locators are reached.

### Re-entry

Range A — Chapters 1–2:

- objective: determine why water is not reaching the lower beds;
- open question: where is the blockage?

Range B — Chapters 3–4:

- objective: repair/test the cracked coupling;
- known cause: mechanical failure.

## EPUB accessibility requirements

The fixture EPUB should:

- use semantic XHTML headings and landmarks;
- maintain logical reading order;
- reflow cleanly at large text sizes;
- contain no required color-only meaning;
- include one decorative SVG;
- include one meaningful black-and-white water-line diagram with an appropriate text alternative;
- contain no JavaScript.

## Anchor requirements

Each reveal point should have:

- a stable XHTML resource path;
- a stable element ID where practical;
- Readium-generated position/progression;
- a short text-context fallback in ORL.

Exact position/progression values must be generated from the built EPUB rather than guessed.

## Negative fixtures

Later create:

1. valid EPUB + valid ORL;
2. malformed JSON;
3. schema-invalid ORL;
4. wrong publication identifier;
5. unresolved locator;
6. unsupported future layer type;
7. non-decorative visual missing text alternative.

## First executable test

Before Mara's introduction, Reading Support must not expose Mara.

After the navigator crosses Mara's introduction locator, Mara becomes available.

Jo must remain locked until Chapter 2.

This is the minimum proof for spoiler-safe ORL eligibility.
