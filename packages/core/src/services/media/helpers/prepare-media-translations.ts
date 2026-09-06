import type { LucidMediaTranslations } from "../../../libs/db/tables/index.js";
import type { Insert } from "../../../libs/db/types.js";

const prepareMediaTranslations = (props: {
	title: {
		localeCode: string | null;
		value: string | null;
	}[];
	alt: {
		localeCode: string | null;
		value: string | null;
	}[];
	description?: {
		localeCode: string | null;
		value: string | null;
	}[];
	summary?: {
		localeCode: string | null;
		value: string | null;
	}[];
	mediaId: number;
	defaultLocale: string | null;
}): Array<Omit<Insert<LucidMediaTranslations>, "id">> => {
	const translations: Array<Omit<Insert<LucidMediaTranslations>, "id">> = [];

	const uniqueLocales = new Set<string | null>();
	for (const title of props.title) {
		uniqueLocales.add(title.localeCode ?? props.defaultLocale);
	}
	for (const alt of props.alt) {
		uniqueLocales.add(alt.localeCode ?? props.defaultLocale);
	}
	for (const description of props.description || []) {
		uniqueLocales.add(description.localeCode ?? props.defaultLocale);
	}
	for (const summary of props.summary || []) {
		uniqueLocales.add(summary.localeCode ?? props.defaultLocale);
	}

	for (const locale of uniqueLocales) {
		translations.push({
			locale_code: locale,
			title:
				(
					props.title.find((t) => t.localeCode === locale) ??
					props.title.find(
						(t) => locale === props.defaultLocale && t.localeCode === null,
					)
				)?.value ?? null,
			alt:
				(
					props.alt.find((a) => a.localeCode === locale) ??
					props.alt.find(
						(t) => locale === props.defaultLocale && t.localeCode === null,
					)
				)?.value ?? null,
			description:
				(
					props.description?.find((d) => d.localeCode === locale) ??
					props.description?.find(
						(t) => locale === props.defaultLocale && t.localeCode === null,
					)
				)?.value ?? null,
			summary:
				(
					props.summary?.find((s) => s.localeCode === locale) ??
					props.summary?.find(
						(t) => locale === props.defaultLocale && t.localeCode === null,
					)
				)?.value ?? null,
			media_id: props.mediaId,
		});
	}

	return translations;
};

export default prepareMediaTranslations;
