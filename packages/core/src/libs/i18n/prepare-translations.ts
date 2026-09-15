import { mkdir } from "node:fs/promises";
import path from "node:path";
import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";
import writeFileIfChanged from "../../utils/helpers/write-file-if-changed.js";
import type { ResourceFile } from "../resources/types.js";
import { loadTranslationSources } from "./load-project-translations.js";
import { createTranslationStore } from "./store.js";
import type { TranslationBundles, TranslationStore } from "./types.js";

export type PrepareTranslationsResult = {
	translationStore: TranslationStore;
};

/**
 * Writes the merged runtime translation bundle for compiled runtimes to import.
 */
export const writeTranslationArtifact = async (props: {
	translationStore: TranslationStore;
	outputPath: string;
}) => {
	try {
		await mkdir(props.outputPath, { recursive: true });
		await writeFileIfChanged(
			path.join(props.outputPath, constants.i18n.renderedOutput),
			JSON.stringify(props.translationStore.bundles, null, 2),
		);
	} catch (error) {
		throw new LucidError({
			message:
				error instanceof Error
					? error.message
					: "Lucid failed to write the translation artifact.",
		});
	}
};

/**
 * Loads or accepts merged translation bundles, creates the runtime store, and
 * optionally writes the build artifact consumed by compiled runtimes.
 */
const prepareTranslations = async (props: {
	config: ResolvedLucidConfig;
	files?: ResourceFile[];
	bundles?: TranslationBundles;
	outputPath?: string;
}): Promise<PrepareTranslationsResult> => {
	const translationStore = createTranslationStore({
		defaultLocale: props.config.i18n.defaultLocale,
		bundles:
			props.bundles ??
			(await loadTranslationSources({
				files: props.files,
			})),
	});

	if (props.outputPath) {
		await writeTranslationArtifact({
			translationStore,
			outputPath: props.outputPath,
		});
	}

	return {
		translationStore,
	};
};

export default prepareTranslations;
