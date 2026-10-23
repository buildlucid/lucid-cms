import { LucidError } from "../../utils/errors/index.js";
import type { LoadConfigResult } from "../config/load-config-file.js";
import { createTranslator } from "../i18n/index.js";
import type { TranslationStore } from "../i18n/types.js";
import handlePluginRuntimeHooks from "../plugins/hooks/handle-runtime.js";
import { collectRuntimePrepareArtifacts } from "../runtime/prepare-artifacts.js";
import type { LucidViteProject } from "./types.js";

/** Collects the database adapter's and plugins' runtime artifacts that the project's runtime adapter supports. */
const collectRuntimeArtifacts = async (props: {
	loaded: LoadConfigResult;
	translationStore: TranslationStore;
}): Promise<LucidViteProject["artifacts"]> => {
	const { loaded } = props;

	const [prepare, build] = await Promise.all([
		collectRuntimePrepareArtifacts({
			db: loaded.definition.db,
			plugins: loaded.config.plugins,
			env: loaded.env ?? {},
			definition: loaded.definition,
			paths: {
				configPath: loaded.configPath,
				projectRoot: loaded.projectRoot,
			},
			customArtifactTypes: loaded.adapter.config?.customPrepareArtifacts,
		}),
		handlePluginRuntimeHooks({
			config: loaded.config,
			translationStore: props.translationStore,
			definition: loaded.definition,
			configPath: loaded.configPath,
		}),
	]);
	if (build.error) {
		const translate = createTranslator({
			store: props.translationStore,
			locale: "en",
		});

		throw new LucidError({
			message:
				translate.english(build.error.message) ??
				"Lucid could not collect plugin runtime artifacts.",
		});
	}

	const buildTypes = loaded.adapter.config?.customBuildArtifacts ?? [];
	return {
		prepare,
		build: build.data.filter((artifact) => buildTypes.includes(artifact.type)),
	};
};

export default collectRuntimeArtifacts;
