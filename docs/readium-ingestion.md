# Readium Publication Ingestion — V0.1

Thorium Web does not read a packaged EPUB directly. It consumes a **Readium Web Publication Manifest** and related publication services.

For ORL V0.1, the publication adapter is the current Readium CLI `serve` command.

## Development path

```text
The Water Line source
        │
        ▼
build-demo-epub.sh
        │
        ▼
the-water-line.epub
        │
        ▼
Readium CLI serve
        │
        ├── manifest.json
        ├── publication resources
        └── ~readium/positions.json
                 │
                 ▼
            Thorium Web
```

The same boundary is useful for the later local desktop version: Tauri can bundle/start a local Readium service while keeping books on-device.

## Pinned development version

Initial integration is tested with **Readium CLI v0.10.1**.

The repository installer pins release checksums for supported Unix development/CI platforms rather than downloading an unverified "latest" executable.

## Local verification

Requirements:

- Bash;
- curl;
- zip/unzip;
- jq;
- base64;
- sha256sum.

Run:

```bash
bash scripts/verify-readium-demo.sh
```

The script:

1. builds **The Water Line** EPUB if necessary;
2. downloads/verifies Readium CLI when not supplied;
3. starts a loopback-only Readium server;
4. discovers the demo publication;
5. fetches its Readium Web Publication Manifest;
6. checks the ORL publication identifier;
7. fetches the Readium Position List;
8. verifies the expected reading order and positions.

## Runtime URL shape

For a filesystem publication, Readium currently exposes:

```text
/webpub/{base64url-relative-publication-path}/manifest.json
```

and the public Positions service at:

```text
/webpub/{encoded-path}/~readium/positions.json
```

These paths are treated as adapter details, not ORL format requirements.

## Important anchor distinction

The Position List provides stable navigational locations for the publication, but it does **not by itself resolve an arbitrary authoring element ID** such as:

```text
chapter-01.xhtml#mara-introduction
```

Therefore ORL keeps authoring anchors and runtime position comparison conceptually separate.

The first integration must add an **anchor-resolution step** that converts a support target into the strongest runtime locator available. We must not invent guessed `position` values in the ORL file.

Until an anchor is resolvable, spoiler-sensitive items remain locked.

## Next integration step

Once Readium ingestion is green:

1. scaffold the Thorium Web reference reader;
2. feed it the demo manifest URL;
3. provide a custom `positionStorage`;
4. route position changes into the ORL session;
5. add Reading Support through Thorium's plugin registry;
6. implement a minimal anchor resolver for the demo's stable element IDs;
7. prove Mara locked → revealed.
