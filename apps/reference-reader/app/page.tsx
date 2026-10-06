"use client";

import dynamic from "next/dynamic";

const ReaderClient = dynamic(
  () =>
    import("./reader-client").then(
      (module) => module.ReaderClient
    ),
  {
    ssr: false,
    loading: () => (
      <section className="reader-status" aria-live="polite">
        <h1>Open Accessible Reading Layers</h1>
        <p>Loading the local reader…</p>
      </section>
    )
  }
);

export default function HomePage() {
  return (
    <main>
      <ReaderClient />
    </main>
  );
}
