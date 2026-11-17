import type { LocalizedText } from "../../types.js";

/** The content locale a form is read in, and the default one text falls back to. */
export type FormLocale = { current?: string; default?: string };

/**
 * Picks a code-defined form's text for a locale: its own, else the default locale's, else the
 * first one given, so a missing translation never leaves a label empty.
 */
const localizeText = (text: LocalizedText, locale: FormLocale): string => {
	if (typeof text === "string") return text;
	return (
		(locale.current === undefined ? undefined : text[locale.current]) ??
		(locale.default === undefined ? undefined : text[locale.default]) ??
		Object.values(text)[0] ??
		""
	);
};

export default localizeText;
