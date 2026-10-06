# ORL Reference Reader

This directory will contain the reference implementation for Open Accessible Reading Layers.

## V0.1 foundation

The reader will be built on **Thorium Web / Readium** rather than implementing EPUB rendering from scratch.

Initial stack:

- TypeScript;
- React;
- Next.js-compatible Thorium Web integration;
- `@edrlab/thorium-web`;
- Readium TypeScript packages as required;
- JSON Schema validation with Ajv or equivalent.

## First executable slice

The first build only needs to prove:

1. Thorium renders **The Water Line** demo EPUB.
2. A valid ORL JSON sidecar loads and validates.
3. A custom `positionStorage` adapter receives current Readium locators.
4. ORL registers a Thorium **Reading Support** plugin action.
5. Mara remains hidden before her introduction.
6. Mara appears after the navigator reaches her reveal locator.
7. malformed ORL never blocks normal EPUB reading.

Do not add Timeline, Re-entry, arbitrary local EPUB import, Tauri packaging, accounts, sync, marketplace, DRM, PDF, or AI generation until this proof passes.

## Desktop direction

After the first People-layer proof, perform an early packaging spike using **Tauri 2**.

The long-term architecture should reuse the same ORL Core, ORL Engine, and React support UI across web and desktop rather than creating separate products.
