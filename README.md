# Open Accessible Reading Layers

**Open Accessible Reading Layers (ORL)** is an open-source accessibility R&D project from **A Likkle More Eco**, initiated by **Miguel Francis** in Jamaica.

ORL explores a simple idea: digital reading can remain text-first while offering optional, reader-controlled support layers that help people orient themselves, remember context, and return to complex material after a break.

The long-term goal is not to create a proprietary book format. It is to develop an open, portable support-layer model that other readers, publishers, libraries, accessibility projects, educators, and developers can adopt or adapt.

## V0.1 focus

The first prototype is intentionally small:

- read one DRM-free EPUB;
- load a separate ORL JSON sidecar;
- expose three optional support-layer types:
  - **People / Characters**
  - **Timeline / Chronology**
  - **Re-entry Context**
- keep future information spoiler-locked until the reader reaches its reveal point;
- keep the underlying publication readable even if ORL data is missing or malformed;
- preserve keyboard, screen-reader, reflow, contrast, and ordinary reading preferences.

## Architecture direction

ORL is being designed as a **portable sidecar layer system**, separate from the publication itself.

The reference reader will use **Thorium Web / Readium** rather than building an EPUB renderer from scratch. ORL focuses on the support-layer semantics, eligibility logic, accessibility behavior, and author/reader experience.

The same core should eventually support:

- a hosted web reader;
- a fully local desktop build;
- future mobile implementations;
- adoption by other reading platforms.

The preferred desktop direction is **Tauri + the same React/Thorium Web frontend**, with local book and layer storage by default.

## Project principles

- **Reader control:** support layers are optional and independently toggleable.
- **Text remains primary:** visual or structural aids supplement the source material.
- **Accessibility by construction:** visual support must retain meaningful text equivalents.
- **Local-first where practical:** personal books and personal layers should not require upload.
- **Interoperability over lock-in:** align with EPUB, Readium, Web Annotation / EPUB Annotation work, and accessibility standards where practical.
- **Graceful failure:** ORL must never make an otherwise readable book unreadable.
- **Co-design over assumptions:** accessibility claims should be validated with real readers, including disabled and neurodivergent readers.

## Current status

V0.1 is in active development.

Current implementation sequence:

1. repository foundation;
2. V0.1 ORL specification;
3. JSON Schema;
4. ALME-owned demo EPUB fixture;
5. first executable Thorium/Readium integration;
6. People layer proof;
7. Timeline + Re-entry layers;
8. early local-desktop/Tauri packaging spike.

## Repository structure

The repository will grow toward:

```text
docs/
  accessibility-principles.md
  architecture.md
  spec/orl-0.1.md
schema/
  orl-0.1.schema.json
examples/
  demo-book/
apps/
  reference-reader/
packages/
  orl-core/
  orl-engine/
  orl-ui/
```

This structure may stay flatter until separation becomes useful.

## Origin & credit

Open Accessible Reading Layers was initiated by **Miguel Francis** through **A Likkle More Eco**.

If this work helps your project, please preserve the required license notices and credit the project where practical so others can trace its origins, learn from it, and contribute improvements back.

## License

Software in this repository is intended to be released under the **Apache License 2.0**.

Documentation and example-content licensing may be identified separately where appropriate.

See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Contributing

Contributions are welcome once the initial V0.1 foundation is stable. Please see [CONTRIBUTING.md](CONTRIBUTING.md).

Accessibility feedback, implementation feedback, standards alignment, testing, and documentation contributions are especially valuable.

## Funding

This is intended as public-good/open accessibility work. Optional funding may later be used to support accessibility research, testing, documentation, and maintenance.
