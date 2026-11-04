/**
 * Text as a reader sees it, for telling whether an element shows a field's value: runs of spaces,
 * line breaks and non-breaking spaces read as one space, and the ends are trimmed.
 */
export const toShownText = (value: string) => value.replace(/\s+/g, " ").trim();
