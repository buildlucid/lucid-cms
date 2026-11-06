import type { InternalDocumentField } from "@types";
import T from "@/translations";

type LocaleCounts = { missing: number; outdated: number };

const hasTextNode = (node: unknown): boolean => {
	if (!node || typeof node !== "object") return false;
	if ("text" in node && typeof node.text === "string" && node.text.trim()) {
		return true;
	}
	return "content" in node && Array.isArray(node.content)
		? node.content.some(hasTextNode)
		: false;
};

/** Whether a translated value has text, read the way the server reads it for each field type. */
const hasTranslationText = (type: string, value: unknown) => {
	if (type === "rich-text") return hasTextNode(value);
	if (type === "link") {
		return (
			!!value &&
			typeof value === "object" &&
			"label" in value &&
			typeof value.label === "string" &&
			value.label.trim() !== ""
		);
	}
	return typeof value === "string" && value.trim() !== "";
};

/** Says what a locale's translations need, eg. "3 missing, 2 out of date", leaving out counts of 0. Empty when nothing does. */
export const describeTranslationNeeds = (counts: {
	missing: number;
	outdated: number;
	byPersonOutdated?: number;
}) =>
	[
		counts.missing > 0
			? T()("translations.status.missing", { count: counts.missing })
			: undefined,
		counts.outdated > 0
			? T()("translations.status.outdated", { count: counts.outdated })
			: undefined,
		counts.byPersonOutdated
			? T()("translations.status.person.outdated", {
					count: counts.byPersonOutdated,
				})
			: undefined,
	]
		.filter(Boolean)
		.join(", ");

/**
 * Counts each locale's missing and out-of-date translations in the builder's
 * fields. Only fields with a `sourceHash` have source text to translate.
 */
export const countLocaleTranslations = (props: {
	fields: InternalDocumentField[];
	locales: string[];
	defaultLocale: string;
}): Map<string, LocaleCounts> => {
	const counts = new Map<string, LocaleCounts>(
		props.locales
			.filter((locale) => locale !== props.defaultLocale)
			.map((locale) => [locale, { missing: 0, outdated: 0 }]),
	);

	const visit = (fields: InternalDocumentField[]) => {
		for (const field of fields) {
			for (const group of field.groups ?? []) visit(group.fields);
			if (field.sourceHash === undefined) continue;

			for (const [locale, count] of counts) {
				if (!hasTranslationText(field.type, field.translations?.[locale])) {
					count.missing++;
					continue;
				}
				const source = field.translationSources?.[locale];
				if (source && source.source !== field.sourceHash) count.outdated++;
			}
		}
	};
	visit(props.fields);

	return counts;
};
