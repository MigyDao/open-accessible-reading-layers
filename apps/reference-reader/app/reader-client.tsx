"use client";

import { useMemo, useRef, useState } from "react";
import type { Locator, Publication } from "@readium/shared";
import {
  StatefulReaderWrapper,
  StatefulGlobalPreferencesProvider,
  ThStoreProvider,
  usePublication
} from "@edrlab/thorium-web/reader";

import {
  OrlSessionProvider,
  useOrlSession
} from "../orl/session";
import {
  createOrlEpubPlugins
} from "../orl/reading-support-plugin";
import {
  orlReaderPreferences
} from "../orl/preferences";

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

function OrlReader({
  publication,
  profile,
  localDataKey
}: {
  publication: Publication;
  profile: "epub" | "webPub" | "audio" | null | undefined;
  localDataKey: string | null;
}) {
  const storedLocator = useRef<Locator | undefined>(undefined);
  const [currentLocator, setCurrentLocator] =
    useState<Locator | undefined>(undefined);
  const { updateCurrentLocator } = useOrlSession();

  const positionStorage = useMemo(
    () => ({
      get: () => storedLocator.current,
      set: async (locator: Locator) => {
        storedLocator.current = locator;
        setCurrentLocator(locator);
        await updateCurrentLocator(locator);
        window.dispatchEvent(new CustomEvent("orl:position-changed", {
          detail: locator.serialize()
        }));
      }
    }),
    [updateCurrentLocator]
  );

  return (
    <>
      <StatefulReaderWrapper
        profile={profile}
        publication={publication}
        localDataKey={localDataKey}
        positionStorage={positionStorage}
        plugins={{
          epub: createOrlEpubPlugins
        }}
        preferences={{
          initialPreferences: orlReaderPreferences
        }}
        i18n={{ load: "languageOnly" }}
      />

      {process.env.NODE_ENV === "development" &&
      currentLocator ? (
        <output
          className="reader-status"
          aria-label="Current Readium locator"
        >
          <strong>Current locator:</strong>{" "}
          <code>{JSON.stringify(currentLocator.serialize())}</code>
        </output>
      ) : null}
    </>
  );
}

function PublicationReader() {
  const manifestUrl = useMemo(demoManifestUrl, []);

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
        <p>Loading The Water Line.</p>
      </section>
    );
  }

  return (
    <OrlSessionProvider
      publication={publication}
      manifestUrl={manifestUrl}
    >
      <OrlReader
        publication={publication}
        profile={profile}
        localDataKey={localDataKey}
      />
    </OrlSessionProvider>
  );
}

export function ReaderClient() {
  return (
    <ThStoreProvider>
      <StatefulGlobalPreferencesProvider initialPreferences={{ locale: "en" }}>
        <PublicationReader />
      </StatefulGlobalPreferencesProvider>
    </ThStoreProvider>
  );
}
