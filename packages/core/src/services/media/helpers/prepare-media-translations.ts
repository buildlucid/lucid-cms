import type { Insert, LucidMediaTranslations } from "../../../types.js";

const prepareMediaTranslations = (props: {
	title: {
		localeCode: string;
		value: string | null;
	}[];
	alt: {
		localeCode: string;
		value: string | null;
	}[];
	mediaId: number;
}): Array<Omit<Insert<LucidMediaTranslations>, "id">> => {
	const translations: Array<Omit<Insert<LucidMediaTranslations>, "id">> = [];

	const uniqueLocales = new Set<string>();
	for (const title of props.title) {
		uniqueLocales.add(title.localeCode);
	}
	for (const alt of props.alt) {
		uniqueLocales.add(alt.localeCode);
	}

	for (const locale of uniqueLocales) {
		translations.push({
			locale_code: locale,
			title: props.title.find((t) => t.localeCode === locale)?.value ?? null,
			alt: props.alt.find((a) => a.localeCode === locale)?.value ?? null,
			media_id: props.mediaId,
		});
	}

	return translations;
};

export default prepareMediaTranslations;
