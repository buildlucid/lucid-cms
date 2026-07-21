import { readFile } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import { prepareBuildArtifacts } from "@lucidcms/core/build";
import type {
	Config,
	LucidConfigDefinition,
	RuntimeAdapter,
	TranslationStore,
} from "@lucidcms/core/types";
import { parse } from "jsonc-parser";
import constants from "../constants.js";
import type { CloudflareRuntimeAdapter } from "../types.js";
import writeFileIfChanged from "../utils/write-file.js";
import { createAstroWorkerSource } from "./astro-worker.js";

type PrepareAstroOptions = {
	command: "dev" | "build" | "sync";
	adapter: RuntimeAdapter;
	configPath: string;
	projectRoot: string;
	generatedDirectory: string;
	runtimeModulePath: string;
	config: Config;
	translationStore: TranslationStore;
	definition: LucidConfigDefinition;
};

const toPosix = (value: string) => value.split(path.sep).join("/");

const updateWranglerConfig = async (props: {
	adapter: CloudflareRuntimeAdapter;
	workerPath: string;
}) => {
	const prepared = props.adapter.getPreparedWranglerConfig();
	if (!prepared) {
		throw new LucidError({
			message:
				"The Cloudflare runtime did not prepare a Wrangler config for Astro.",
		});
	}

	const source = await readFile(prepared.wranglerConfigPath, "utf-8");
	const config = parse(source) as Record<string, unknown>;
	const main = toPosix(
		path.relative(path.dirname(prepared.wranglerConfigPath), props.workerPath),
	);
	const relativeMain = main.startsWith(".") ? main : `./${main}`;

	if (!prepared.generated) {
		if (config.main !== relativeMain) {
			throw new LucidError({
				message: `Set Wrangler main to ${JSON.stringify(relativeMain)} so Astro can expose Lucid Worker events.`,
			});
		}
		return prepared;
	}

	config.main = relativeMain;
	const triggers =
		typeof config.triggers === "object" && config.triggers
			? { ...(config.triggers as Record<string, unknown>) }
			: {};
	triggers.crons =
		props.adapter.getOptions()?.worker?.crons ?? constants.DEFAULT_CRONS;
	config.triggers = triggers;
	await writeFileIfChanged(
		prepared.wranglerConfigPath,
		[
			`// ${constants.WRANGLER_GENERATED_CONFIG_MARKER}`,
			"// This file is overwritten when Lucid prepares the Cloudflare runtime.",
			`${JSON.stringify(config, null, "\t")}\n`,
		].join("\n"),
	);
	return prepared;
};

/** Prepares Cloudflare build artifacts and the combined Astro Worker entrypoint. */
const prepareAstro = async (options: PrepareAstroOptions) => {
	const adapter = options.adapter as CloudflareRuntimeAdapter;
	const artifacts = await prepareBuildArtifacts({
		config: options.config,
		translationStore: options.translationStore,
		definition: options.definition,
		silent: true,
		configPath: options.configPath,
		outputPath: options.generatedDirectory,
		outputRelativeConfigPath: toPosix(
			path.relative(options.generatedDirectory, options.configPath),
		),
		customArtifactTypes: [constants.WORKER_EXPORT_ARTIFACT_TYPE],
	});
	const workerPath = path.join(options.generatedDirectory, "worker.ts");
	await writeFileIfChanged(
		workerPath,
		createAstroWorkerSource({
			runtimeModulePath: options.runtimeModulePath,
			artifacts: artifacts.custom,
		}),
	);
	const prepared = await updateWranglerConfig({ adapter, workerPath });
	return prepared.generated
		? { ignoredWatchFiles: [prepared.wranglerConfigPath] }
		: undefined;
};

export default prepareAstro;
