# Windows beta.1 launch blocker (#6)

## Diagnosis, 17 November 2026

Reproduced using Miguel's installed `open-accessible-reading-layers.exe`, rather than a browser development server. Its original delivery ZIP records Actions source `c6b3380a3022a44ff5e3dee7b69b59b23f485b4a` (same source tree as PR #5 head `6618731e14f316329007fe768311773e4f45da3a`). WebView2 remote debugging was enabled temporarily for this process only; no permanent machine setting or application data was cleared.

The WebView loaded `http://tauri.localhost/` and the requested Next static JS/CSS assets with HTTP 200. The document became Next's `__next_error__` page with the reported Reload/Back message. Runtime exception evidence:

```text
EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script
    at Function (<anonymous>)
    at l.c (.../_next/static/chunks/0133q6dkdb7u2.js:4:26399)
    at l.u (.../_next/static/chunks/0133q6dkdb7u2.js:4:27198)
    at r.resolveRef (.../_next/static/chunks/0133q6dkdb7u2.js:4:28463)
```

The console also reported `Error compiling schema, function code:` from Ajv. `packages/orl-core/src/validate.ts` initialized Ajv2020 and compiled the ORL schema at module import. Importing the desktop component therefore threw before the library could render. Reload repeated the same deterministic exception; Back did not offer another usable route. This is a frontend initialization/CSP incompatibility, not missing bundled assets or a failed WebView2 installation.

## Correction

Generate Ajv's standalone CommonJS validator in Node from the existing schema and identical `allErrors`, `strict` and format options. Import the generated validator at runtime; retain schema/semantic diagnostics and the restrictive Tauri CSP. The generator runs during both reader asset-preparation builds, and its output is committed for typechecking/direct core consumers. This follows [Ajv's documented CSP-compatible standalone approach](https://ajv.js.org/standalone.html).

Beta.2 retains the application identifier, installation identity, storage paths and data formats. It adds a loading message and a recoverable route error view with error details. Original installer dependency locks are retained, with only the application version changed. Windows CI installs with `npm ci` and builds the exact PR head. No new automated tests or optional test phase were introduced. Existing browser CI/branch protection remain in force; full V1 acceptance remains pending Miguel's testing.

## Safe update

Close ORL. Keep the beta.1 installer for rollback. For an extra backup, copy `%APPDATA%\com.migydao.orl` (library, if present) and `%LOCALAPPDATA%\com.migydao.orl` (WebView preferences/state) while the app is closed. Run the beta.2 installer over the existing installation using the same destination; do not uninstall or clear application data. Do not choose any option to remove user data. If rollback is needed, close ORL and reinstall beta.1 to the same destination, preserving the backup. Beta.1 still has the known launch blocker.

Recheck launch first. Only after the library opens should the remaining V1 manual acceptance checklist resume.
