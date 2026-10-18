import type { PreviewFieldTarget } from "@lucidcms/client/markup";

/** Tracks editable field origins without exposing metadata to templates. */
export const fieldTargets = new WeakMap<object, PreviewFieldTarget>();
