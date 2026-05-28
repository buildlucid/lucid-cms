import coreEnAdmin from "../../translations/en.admin.json" with {
	type: "json",
};
import coreEnServer from "../../translations/en.server.json" with {
	type: "json",
};
import type {
	TranslationBundle,
	TranslationBundles,
	TranslationData,
} from "./types.js";

const emptyBundle = (): TranslationBundle => ({
	admin: {},
	server: {},
});

export const coreTranslations: TranslationBundles = {
	en: {
		admin: coreEnAdmin,
		server: coreEnServer,
	},
};

export const normalizeTranslationBundle = (
	bundle: Partial<TranslationBundle> | undefined,
): TranslationBundle => ({
	admin: { ...(bundle?.admin ?? {}) },
	server: { ...(bundle?.server ?? {}) },
});

export const normalizeTranslationBundles = (
	bundles?: Record<string, Partial<TranslationBundle>>,
): TranslationBundles => {
	const normalized: TranslationBundles = {};

	for (const [locale, bundle] of Object.entries(bundles ?? {})) {
		normalized[locale] = normalizeTranslationBundle(bundle);
	}

	return normalized;
};

export const mergeTranslationBundles = (
	...sources: Array<Record<string, Partial<TranslationBundle>> | undefined>
): TranslationBundles => {
	const merged: TranslationBundles = {};

	for (const source of sources) {
		for (const [locale, bundle] of Object.entries(source ?? {})) {
			merged[locale] = merged[locale] ?? emptyBundle();
			merged[locale].admin = {
				...merged[locale].admin,
				...(bundle.admin ?? {}),
			};
			merged[locale].server = {
				...merged[locale].server,
				...(bundle.server ?? {}),
			};
		}
	}

	return merged;
};

export const formatTranslation = (
	translation: string,
	data?: TranslationData,
) => {
	if (!data) return translation;

	return translation.replace(
		/\{\{(\w+)\}\}/g,
		(_, key) => data[key as keyof TranslationData]?.toString() ?? "",
	);
};
