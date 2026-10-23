import type { ResolvedLucidConfig } from "../../types/config.js";
import type { ResourceFile } from "../resources/types.js";
import { loadTranslationSources } from "./load-project-translations.js";
import { createTranslationStore } from "./store.js";
import type { TranslationBundles, TranslationStore } from "./types.js";

export type PrepareTranslationsResult = {
	translationStore: TranslationStore;
};

/** Loads or accepts merged translation bundles and creates the runtime store. */
const prepareTranslations = async (props: {
	config: ResolvedLucidConfig;
	files?: ResourceFile[];
	bundles?: TranslationBundles;
}): Promise<PrepareTranslationsResult> => {
	const translationStore = createTranslationStore({
		defaultLocale: props.config.i18n.defaultLocale,
		bundles:
			props.bundles ??
			(await loadTranslationSources({
				files: props.files,
			})),
	});

	return {
		translationStore,
	};
};

export default prepareTranslations;
