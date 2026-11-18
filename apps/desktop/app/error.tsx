"use client";

export default function StartupError({ error, reset }: { error: Error; reset: () => void }) {
  return <main className="library">
    <h1>ORL could not open this page</h1>
    <p>Your saved library and original EPUB files have not been removed.</p>
    <p>Try again once. If this persists, close ORL and include the details below in your bug report.</p>
    <details><summary>Error details</summary><pre>{error.message}</pre></details>
    <button onClick={reset}>Try again</button>
  </main>;
}
