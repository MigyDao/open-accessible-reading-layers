# Accessibility Principles

Open Accessible Reading Layers (ORL) is intended to support accessibility, but the project does not claim that one presentation or feature works for every reader.

## 1. Reader choice is a core accessibility feature

Support layers should be independently controllable. A reader who benefits from character reminders may not want a timeline. Another reader may want re-entry context but no visual icons.

Where practical, accessibility support should be configurable rather than imposed.

## 2. The publication remains primary

ORL supplements the source publication. It must not make the underlying book harder to access.

If ORL fails to load, contains malformed data, or cannot resolve an anchor, the book should remain readable.

## 3. Text equivalents are authoritative

Icons, diagrams, illustrations, maps, scales, and other visuals may be useful, but required meaning cannot exist only in a visual representation.

A meaningful visual requires an appropriate text alternative. Decorative visuals should be explicitly marked as decorative.

## 4. Do not depend on color alone

Status, chronology, relationships, warnings, or other information must not be encoded only by color.

## 5. Preserve ordinary reading controls

ORL must coexist with established reading accessibility controls such as:

- font size;
- line height;
- letter and word spacing;
- text alignment;
- contrast and themes;
- reflow;
- reduced motion;
- screen readers;
- keyboard operation.

## 6. Avoid unnecessary cognitive load

Support features should reduce reading friction, not turn the page into a dashboard.

The default experience should remain restrained. Readers should be able to open support when needed and close it when not needed.

## 7. Spoiler safety is an accessibility and trust requirement

Support content that has not yet become valid in the source must not be exposed prematurely.

Locked information must not leak through visible text, hidden DOM, accessible names, item counts, search results, or keyboard navigation.

## 8. Re-entry should be supported

Returning to a book after a break can require significant memory reconstruction. ORL may help readers recover:

- who is relevant;
- where they are;
- what has happened;
- what the current objective or question is;
- how much time has passed.

This support should be optional.

## 9. Accessibility needs can conflict

A persistent visual timeline may help one reader and distract another. Animation may help orientation for one person and create discomfort for another.

When needs conflict, prefer user control and documented trade-offs rather than declaring one presentation universally accessible.

## 10. Validate with people, not assumptions

Before making strong accessibility claims, ORL features should be tested with actual readers, including disabled and neurodivergent readers where possible.

Useful evidence includes:

- successful task completion;
- character/context recall;
- re-entry after time away;
- chronology/location comprehension;
- keyboard and screen-reader usability;
- cognitive load;
- reader preference;
- whether a support feature causes distraction or confusion.

## V0.1 acceptance baseline

The reference reader must, at minimum:

- expose support controls to keyboard users;
- expose meaningful names and states to assistive technologies;
- keep normal EPUB reading usable without ORL;
- provide text equivalents for non-decorative visuals;
- avoid required color-only information;
- respect reduced-motion preferences;
- support large text/reflow;
- allow each ORL layer to be disabled independently;
- treat malformed or unresolved ORL data as non-blocking.
