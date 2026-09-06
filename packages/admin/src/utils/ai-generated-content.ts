import type { AiGeneratedContent } from "@lucidcms/types";
import type { TranslationValue } from "@/utils/translation-helpers";

/** Editor drafts can contain one unassigned value or values for actual locales. */
export const generatedContentEntries = <T>(
	content: AiGeneratedContent<T>,
): Array<[string | null, T]> =>
	content.kind === "value"
		? [[null, content.value]]
		: Object.entries(content.translations);

export const mediaGenerationValue = (
	translations?: TranslationValue[],
): string | Record<string, string> | undefined => {
	if (!translations) return undefined;
	const assigned = translations.filter((row) => row.localeCode !== null);
	if (assigned.length === 0)
		return (
			translations.find((row) => row.localeCode === null)?.value ?? undefined
		);
	return Object.fromEntries(
		assigned.flatMap((row) =>
			row.value === null ? [] : [[row.localeCode, row.value]],
		),
	);
};
