import {
  createPreferences,
  defaultPreferences,
  ThBreakpoints,
  ThDockingTypes,
  ThSheetTypes,
  type CustomizableKeys
} from "@edrlab/thorium-web/core/preferences";
import {
  ThCollapsibilityVisibility
} from "@edrlab/thorium-web/core/components";

export const READING_SUPPORT_ACTION_KEY = "readingSupport" as const;

type OrlPreferenceKeys = {
  action: typeof READING_SUPPORT_ACTION_KEY;
} & CustomizableKeys;

export const orlReaderPreferences =
  createPreferences<OrlPreferenceKeys>({
    ...defaultPreferences,
    actions: {
      ...defaultPreferences.actions,
      reflowOrder: [
        ...defaultPreferences.actions.reflowOrder,
        READING_SUPPORT_ACTION_KEY
      ],
      fxlOrder: [
        ...defaultPreferences.actions.fxlOrder,
        READING_SUPPORT_ACTION_KEY
      ],
      webPubOrder: [
        ...defaultPreferences.actions.webPubOrder,
        READING_SUPPORT_ACTION_KEY
      ],
      keys: {
        ...defaultPreferences.actions.keys,
        [READING_SUPPORT_ACTION_KEY]: {
          visibility: ThCollapsibilityVisibility.partially,
          shortcut: null,
          sheet: {
            defaultSheet: ThSheetTypes.popover,
            breakpoints: {
              [ThBreakpoints.compact]: ThSheetTypes.bottomSheet
            }
          },
          docked: {
            dockable: ThDockingTypes.both,
            width: 360,
            minWidth: 300,
            maxWidth: 480
          }
        }
      }
    }
  });
