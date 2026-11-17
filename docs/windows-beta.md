# ORL Windows V1 beta

Personal-use, unverified beta pending Miguel's functional and accessibility acceptance.

## Install and use

Download the Windows-x64 beta artifact from the Windows V1 beta workflow on the V1 PR. Extract the ZIP and run the NSIS setup executable. The beta is unsigned, so Windows may show a publisher warning. WebView2 is required; Windows 11 normally has it, and setup can download it if absent (that first installation step can require internet). Once installed, book reading requires no network or account.

Open The Water Line in the library, or choose Import EPUB for a legally obtained DRM-free book. Use Thorium's toolbar for navigation, contents, font size, spacing and theme. Reading Support opens the independently toggleable People, Timeline and Re-entry panel. Import a matching ORL JSON file, or choose Add personal entry here after navigating to a reveal point. Review the captured locator, write the label/reminder, then save. Personal entries can be edited or deleted once their reveal point is reached. Export each local package separately as portable ORL 0.1 JSON.

App copies, reading positions and layers are stored in the Windows application data directory for com.migydao.orl. Original EPUBs are never modified. Removing a library book removes its app copy, saved position and local packages; export personal layers first. Thorium stores its reading preferences locally in the webview profile, using a stable per-book key.

## First hands-on checks

- Install and launch; open The Water Line.
- Import an EPUB, navigate, change text size/spacing/theme, then read while disconnected.
- Close and reopen; check saved position, reading preferences and three layer toggles.
- Move forward and backward around story reveal points; confirm no premature support. Unresolved anchors stay hidden.
- Try missing, invalid and mismatched sidecars; the book must remain readable.
- Add, edit, delete and export a personal entry; import the exported package again.
- Check keyboard-only navigation, support-panel focus, Escape, and your preferred screen reader.
- Remove an app copy and confirm your original EPUB is unchanged.

## Scope and limitations

No automated tests were added for this beta. Existing repository tests and CI remain unchanged; build checks are separate from functional acceptance. Installer creation alone does not verify runtime behavior, accessibility, offline operation, preference persistence, ZIP edge cases or spoiler boundaries.

The local adapter generates a Readium Web Publication manifest from the EPUB ZIP/OPF and navigation document, then reuses Thorium/Readium for rendering. It replaces the browser prototype's separately installed Go streamer with an in-process, narrowly scoped Tauri publication protocol. No network listener, command shell, arbitrary disk path or native file capability is exposed to publication content. EPUB scripts and embedded interactive elements are removed from the served copy; external resources are blocked. Original files are preserved. Complex scripted EPUBs, DRM, encrypted/obfuscated resources and non-HTML spines may not render correctly. ZIP input limits: 512 MB expanded, 32 MB per resource, 20,000 entries. ORL/state limit: 8 MB.

Position lists are approximate navigation aids. Spoiler decisions use exact reading-order resources and resolvable DOM anchors/progression, with unknown anchors locked. Support is tied to the current location, so moving backward hides later entries. Personal entries are created at the current locator; manual arbitrary future-locator editing is deliberately avoided. Package metadata and validation messages do not expose future item labels/counts. This beta uses text support equivalents and does not render optional ORL visuals.

The Water Line prose, EPUB sources and example sidecar are the existing creator-owned ALME fixture in examples/demo-book, under the repository's Apache-2.0 terms. No third-party stories are bundled.

## Rebuild

On Windows with Node 24, Rust stable/MSVC, Visual Studio C++ build tools and WebView2:

```powershell
npm install
npm run package --workspace @open-reading-layers/desktop
```

The installer is emitted under apps/desktop/src-tauri/target/release/bundle/nsis. The Windows V1 beta workflow also records the source commit and installer SHA-256. Existing browser CI remains a separate requirement; a packaged beta does not imply it passed.


## Beta.4 — responsive reading layout and editor scope

In beta.3 the library and prose became readable, but resizing a paginated EPUB to one column left the next portion of the book inaccessible by vertical scrolling. This was not the same as the Home/Library overflow problem: Readium's paginated layout deliberately uses page turns. The ORL app does **not** apply CSS overflow to the publication iframe.

For reflowable EPUBs, ORL now observes the actual reader surface width (including reductions caused by opening the Reading Support side panel). Below 840 CSS pixels, it switches to Readium's built-in scroll mode; returning to wider space restores the former paginated mode if the change was automatic during this reading session. A labelled **Scroll view / Page view** button in the ORL toolbar allows manual overrides, including at compact sizes. The normal Thorium settings remain available. This is only for reflowable EPUBs, not fixed-layout books. Existing source EPUBs, per-book IDs, saved locators, layer packages and app data remain unchanged. The mode itself lives in Thorium's existing per-book stored preferences; relaunching after closing a narrow window may retain Scroll view until manually switched.

Personal entry authoring **is** already part of V1: Reading Support → Add personal entry here at a current locator; create, edit or delete eligible personal People, Timeline and Re-entry entries, and import/export ORL JSON. A separate author project workspace for whole-book entry management, future anchors, magic systems and versioned inventories is a post-V1 proposal (#10), not included in this narrow-window repair.

### Manual beta.4 acceptance (Miguel only)
- Back up application data, then install beta.4 over the existing beta.3 installation; do **not** uninstall or reset data.
- Confirm the existing library, imported The Water Line entries, reading position and settings remain available.
- With the reader wide, check that paginated columns still work. Resize below 840px: confirm the toolbar shows **Scroll view** and wheel/trackpad/keyboard vertical navigation reaches text below the viewport.
- Open Reading Support and observe that narrowing of the reader surface still leaves the prose reachable. Confirm People/Timeline/Re-entry eligibility follows position without spoilers.
- Resize wide again and confirm the temporary automatic page/scroll adjustment is restored, unless the layout was manually overridden. Try the toolbar button in each direction; verify user choice and location handling.
- Use **Reading Support → Add personal entry here**, then test creating, editing, exporting and reimporting a personal ORL entry if desired.
- Keep full Windows functional, accessibility and previous browser E2E acceptance open until Miguel reports results. No additional optional automated tests or agent-driven computer GUI acceptance.
