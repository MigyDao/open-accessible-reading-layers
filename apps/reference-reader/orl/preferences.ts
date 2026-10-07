import {
  createPreferences,
  defaultPreferences,
  defaultFontCollection,
  ThActionsKeys,
  ThBreakpoints,
  ThDockingTypes,
  ThSettingsKeys,
  ThSheetTypes,
  ThSpacingSettingsKeys,
  ThTextSettingsKeys,
  ThThemeKeys
} from "@edrlab/thorium-web/core/preferences";
import {
  ThCollapsibilityVisibility
} from "@edrlab/thorium-web/core/components";

export const READING_SUPPORT_ACTION_KEY = "readingSupport" as const;

type OrlPreferenceKeys = {
  action: typeof READING_SUPPORT_ACTION_KEY | ThActionsKeys;
  theme: ThThemeKeys;
  settings: ThSettingsKeys;
  text: ThTextSettingsKeys;
  spacing: ThSpacingSettingsKeys;
};

export const orlReaderPreferences =
  createPreferences<OrlPreferenceKeys>({
    ...defaultPreferences,
    // This local reference reader must not wait on a third-party font service.
    settings: {
      ...defaultPreferences.settings,
      keys: {
        ...defaultPreferences.settings.keys,
        [ThSettingsKeys.fontFamily]: {
          default: Object.fromEntries(
            Object.entries(defaultFontCollection).filter(
              ([, font]) => font.source.type === "system"
            )
          )
        }
      }
    },
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
