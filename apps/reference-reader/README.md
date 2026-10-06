# ORL Reference Reader

This directory contains the reference implementation for Open Accessible Reading Layers.

## V0.1 foundation

The reader is built on **Thorium Web / Readium** rather than implementing EPUB rendering from scratch.

Current stack:

- TypeScript;
- React;
- Next.js;
- Thorium Web 1.6;
- current Readium TypeScript packages;
- ORL Core from this workspace;
- Readium CLI as the local publication adapter.

## Local development

Current development baseline: **Node.js 24+**.

From the repository root:

### Terminal 1 — build and serve the demo EPUB

```bash
bash scripts/build-demo-epub.sh

READIUM_BIN="$(bash scripts/install-readium-cli.sh)"
"$READIUM_BIN" serve \
  --file-directory examples/demo-book/dist \
  --address 127.0.0.1 \
  --port 15080
```

This keeps the publication on the local machine and exposes its Readium Web Publication Manifest only through the loopback service.

### Terminal 2 — run the reference reader

```bash
npm install
npm run dev --workspace @open-reading-layers/reference-reader
```

Then open the local Next.js address shown in the terminal.

The reader defaults to:

```text
http://127.0.0.1:15080
```

for the Readium publication service.

Override it when needed with:

```bash
NEXT_PUBLIC_READIUM_BASE_URL=http://127.0.0.1:15080 \
npm run dev --workspace @open-reading-layers/reference-reader
```

## Current executable slice

The current implementation is proving:

1. Thorium renders **The Water Line** demo EPUB.
2. The demo ORL sidecar validates.
3. The publication identifier is matched.
4. A custom `positionStorage` adapter receives live Readium locators.
5. ORL registers a Thorium **Reading Support** action.
6. People remain spoiler-locked until their authored reveal anchors are reached.
7. revealed People appear in the Reading Support panel.
8. malformed/mismatched ORL does not prevent normal EPUB reading.

## Anchor model

ORL authoring anchors remain human-readable, for example:

```text
EPUB/chapter-01.xhtml#mara-introduction
```

Readium positions are **not guessed or baked into the ORL file**.

At runtime, the adapter uses publication reading order plus Readium's first-visible DOM selector to compare the reader's current visible element with the authored target element. If an anchor cannot be resolved safely, spoiler-sensitive support remains locked.

## Desktop direction

After the first People-layer proof passes, perform an early packaging spike using **Tauri 2**.

The desktop application should reuse the same:

- ORL Core;
- ORL session/eligibility logic;
- React support UI;
- Readium publication-adapter boundary.

Books and personal layers should remain local by default.

## Not yet in this slice

Do not add yet:

- full Timeline UI;
- full Re-entry UI;
- arbitrary local EPUB library management;
- Tauri packaging;
- accounts;
- sync;
- marketplace;
- DRM;
- PDF;
- AI-generated layers.

Those come only after the minimum end-to-end reading-support proof is stable.
