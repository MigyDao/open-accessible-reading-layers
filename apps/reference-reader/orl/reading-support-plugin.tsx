"use client";

import type { SVGProps } from "react";
import {
  createDefaultPlugin,
  setActionOpen,
  StatefulActionIcon,
  StatefulOverflowMenuItem,
  StatefulSheetWrapper,
  useAppDispatch,
  useAppSelector,
  useDocking,
  type StatefulActionContainerProps,
  type StatefulActionTriggerProps,
  type ThPlugin
} from "@edrlab/thorium-web/reader";
import {
  useActionsPreferences
} from "@edrlab/thorium-web/core/preferences";
import {
  ThActionsTriggerVariant
} from "@edrlab/thorium-web/core/components";

import { useOrlSession } from "./session";
import { READING_SUPPORT_ACTION_KEY } from "./preferences";

function ReadingSupportIcon(
  props: SVGProps<SVGElement>
) {
  const {
    ref: _unusedRef,
    ...safeProps
  } = props;

  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(safeProps as SVGProps<SVGSVGElement>)}
    >
      <path d="M4 5.5c2.5-.7 5-.2 8 1.5v12c-3-1.7-5.5-2.2-8-1.5z" />
      <path d="M20 5.5c-2.5-.7-5-.2-8 1.5v12c3-1.7 5.5-2.2 8-1.5z" />
      <path d="M7 10h2.5" />
      <path d="M14.5 10H17" />
    </svg>
  );
}

export function ReadingSupportTrigger({
  variant
}: StatefulActionTriggerProps) {
  const preferences = useActionsPreferences();
  const profile = useAppSelector((state) => state.reader.profile);
  const actionState = useAppSelector((state) =>
    profile
      ? state.actions.keys[profile]?.[READING_SUPPORT_ACTION_KEY]
      : undefined
  );
  const dispatch = useAppDispatch();
  const actionPreferences =
    preferences.actionsKeys[READING_SUPPORT_ACTION_KEY];

  const setOpen = (isOpen: boolean) => {
    if (!profile) return;

    dispatch(
      setActionOpen({
        key: READING_SUPPORT_ACTION_KEY,
        isOpen,
        profile
      })
    );
  };

  if (!actionPreferences) return null;

  const label = "Reading Support";

  if (variant === ThActionsTriggerVariant.menu) {
    return (
      <StatefulOverflowMenuItem
        label={label}
        SVGIcon={ReadingSupportIcon}
        shortcut={actionPreferences.shortcut}
        id={READING_SUPPORT_ACTION_KEY}
        onAction={() => setOpen(!actionState?.isOpen)}
      />
    );
  }

  return (
    <StatefulActionIcon
      visibility={actionPreferences.visibility}
      aria-label={label}
      placement="bottom"
      tooltipLabel={label}
      shortcut={actionPreferences.shortcut}
      onPress={() => setOpen(!actionState?.isOpen)}
    >
      <ReadingSupportIcon
        aria-hidden="true"
        focusable="false"
      />
    </StatefulActionIcon>
  );
}

export function ReadingSupportPanel({
  triggerRef
}: StatefulActionContainerProps) {
  const profile = useAppSelector((state) => state.reader.profile);
  const actionState = useAppSelector((state) =>
    profile
      ? state.actions.keys[profile]?.[READING_SUPPORT_ACTION_KEY]
      : undefined
  );
  const dispatch = useAppDispatch();
  const docking = useDocking(READING_SUPPORT_ACTION_KEY);
  const {
    package: orlPackage,
    revealedPeople
  } = useOrlSession();

  const setOpen = (isOpen: boolean) => {
    if (!profile) return;

    dispatch(
      setActionOpen({
        key: READING_SUPPORT_ACTION_KEY,
        isOpen,
        profile
      })
    );
  };

  return (
    <StatefulSheetWrapper
      sheetType={docking.sheetType}
      sheetProps={{
        id: READING_SUPPORT_ACTION_KEY,
        triggerRef,
        heading: "Reading Support",
        placement: "bottom",
        isOpen: actionState?.isOpen ?? false,
        onOpenChange: setOpen,
        onClosePress: () => setOpen(false),
        docker: docking.getDocker()
      }}
    >
      <section
        aria-labelledby="orl-people-heading"
        style={{
          display: "grid",
          gap: "1rem",
          padding: "0.25rem"
        }}
      >
        {!orlPackage ? (
          <>
            <p>
              Reading support could not be activated for this
              publication.
            </p>
            <p>You can continue reading the publication.</p>
          </>
        ) : (
          <>
            <header>
              <h2 id="orl-people-heading">People</h2>
              <p>
                Only people introduced at or before your reading
                position are shown.
              </p>
            </header>

            {revealedPeople.length === 0 ? (
              <p>
                No character reminders are available at this point
                yet.
              </p>
            ) : (
              <ul
                style={{
                  display: "grid",
                  gap: "0.75rem",
                  paddingInlineStart: "1.25rem"
                }}
              >
                {revealedPeople.map((person) => (
                  <li key={person.id}>
                    <strong>{person.label}</strong>
                    <div>{person.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </StatefulSheetWrapper>
  );
}

export async function createOrlEpubPlugins(): Promise<ThPlugin[]> {
  return [
    createDefaultPlugin(),
    {
      id: "open-reading-layers",
      name: "Open Reading Layers",
      description:
        "Optional reader-controlled accessibility support layers.",
      version: "0.1.0",
      components: {
        actions: {
          [READING_SUPPORT_ACTION_KEY]: {
            Trigger: ReadingSupportTrigger,
            Target: ReadingSupportPanel
          }
        }
      }
    }
  ];
}
