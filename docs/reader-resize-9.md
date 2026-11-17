# ORL beta.4 — native scrolling for compact EPUB reading

## Acceptance evidence and diagnosis
Miguel's installed beta.3 screenshots on 17 November 2026 confirm readable dark-mode prose (#7) and working library scrolling (#8), but show that The Water Line uses two-column paginated text at full width and a single clipped column when its Windows window is narrowed. A wheel scroll cannot advance the page because the embedded Thorium/Readium reflowable EPUB renderer is deliberately in **paginated** mode, with reading progression reached through page navigation. The outer .reading-surface's overflow:hidden keeps the reader container bounded and is not the root cause.

## Repair
Rather than forcing CSS overflow on nested Readium iframe content, observe the actual reading-surface width and request Readium's normal Redux setScroll action when its width drops below 840px. This includes narrower available space caused by the separate Reading Support side panel. On widening, restore the previous mode if this session's change was automatic. A visible ORL toolbar mode toggle switches between Scroll view and Page view, and manual choices take priority over the current automatic switch. Fixed-layout books are exempt. Readium remains responsible for layout, wheel/touch/keyboard scrolling, settings persistence and locator reporting.

## Data safety and acceptance boundary
No local data/state migrations, book reimports, overrides of publication CSS, changes to ORL anchors, or editor expansion. Existing per-book ThStoreProvider persistence and native saved reading locators remain in place. When closing the app while narrow, scroll mode may be retained on a later wide relaunch; the explicit mode toggle handles that case. Reading Support stays a side panel.

No new optional automated suites or computer-use GUI checks were added. GitHub compile/installer evidence does not prove native reading behavior. Manual user verification: wide two-column pages, narrow scrolling to the following text, support-panel narrow case, return to wide pages, explicit mode toggle, saved position after restart, and personal entry editor access. Issue #9 remains open until confirmed by Miguel. The larger author workspace is tracked as an **unapproved post-V1 proposal** in #10.
