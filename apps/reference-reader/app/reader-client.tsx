"use client";

import { useMemo, useRef, useState } from "react";
import type { Locator } from "@readium/shared";
import {
  StatefulReaderWrapper,
  ThStoreProvider,
  usePublication
} from "@edrlab/thorium-web/reader";

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function demoManifestUrl(): string {
  const readiumBase =
    process.env.NEXT_PUBLIC_READIUM_BASE_URL ??
    "http://127.0.0.1:15080";

  const encodedPublication = toBase64Url("the-water-line.epub");

  return (
    readiumBase.replace(/\/$/, "") +
    `/webpub/${encodedPublication}/manifest.json`
  );
}

export function ReaderClient() {
  const manifestUrl = useMemo(demoManifestUrl, []);
  const storedLocator = useRef<Locator | undefined>(undefined);
  const [currentLocator, setCurrentLocator] =
    useState<Locator | undefined>(undefined);

  const {
    publication,
    profile,
    localDataKey,
    isLoading,
    error
  } = usePublication({
    url: manifestUrl,
    onError: (publicationError) => {
      console.error("Publication loading error:", publicationError);
    }
  });

  const positionStorage = useMemo(
    () => ({
      get: () => storedLocator.current,
      set: (locator: Locator) => {
        storedLocator.current = locator;
        setCurrentLocator(locator);
      }
    }),
    []
  );

  if (error) {
    return (
      <section className="reader-status" role="alert">
        <h1>Unable to open the demo publication</h1>
        <p>
          Start the local Readium publication service, then reload
          this page.
        </p>
        <p>
          <code>{manifestUrl}</code>
        </p>
      </section>
    );
  }

  if (isLoading || !publication) {
    return (
      <section className="reader-status" aria-live="polite">
        <h1>Open Accessible Reading Layers</h1>
        <p>Loading The Water Line…</p>
      </section>
    );
  }

  return (
    <ThStoreProvider>
      <StatefulReaderWrapper
        profile={profile}
        publication={publication}
        localDataKey={localDataKey}
        positionStorage={positionStorage}
      />

      {process.env.NODE_ENV === "development" &&
      currentLocator ? (
        <output
          className="reader-status"
          aria-label="Current Readium locator"
        >
          <strong>Current locator:</strong>{" "}
          <code>{JSON.stringify(currentLocator.toJSON())}</code>
        </output>
      ) : null}
    </ThStoreProvider>
  );
}
