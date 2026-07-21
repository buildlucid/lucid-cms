import type z from "zod";
import { resolveConfigDefinition } from "../config/resolve-config-definition.js";
import createApp from "../http/app.js";
import type { HttpExtension } from "../http/types.js";
import prepareTranslations from "../i18n/prepare-translations.js";
import type { TranslationBundles } from "../i18n/types.js";
import { createToolkitServiceContext } from "../toolkit/config.js";
import createToolkit from "../toolkit/create-toolkit.js";
import type {
	CreateToolkitServiceContextOptions,
	Toolkit,
} from "../toolkit/types.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
} from "./types.js";

/** Options used to create a Lucid instance within another framework or host. */
export type CreateLucidHostOptions = {
	definition: LucidConfigDefinition;
	runtimeContext: AdapterRuntimeContext;
	envSchema?: z.ZodType;
	env?: EnvironmentVariables;
	translationBundles?: TranslationBundles;
	meta?: LucidConfigDefinitionMeta;
	http?: {
		extensions?: HttpExtension[];
	};
};

/** A lazily initialized Lucid instance owned by an external host. */
export type LucidHost = Awaited<ReturnType<typeof createLucidHost>>;

/**
 * Creates a Lucid host with a shared application and toolkit lifecycle.
 */
const createLucidHost = async (options: CreateLucidHostOptions) => {
	const resolved = await resolveConfigDefinition({
		definition: options.definition,
		envSchema: options.envSchema,
		env: options.env,
		meta: options.meta,
		processConfigOptions: {
			bypassCache: true,
			skipValidation: true,
		},
	});
	const { translationStore } = await prepareTranslations({
		config: resolved.config,
		bundles: options.translationBundles,
	});
	let appPromise: ReturnType<typeof createApp> | undefined;
	let destroyed = false;

	const getApp = () => {
		if (destroyed) {
			throw new Error("Cannot use a Lucid host after it has been destroyed.");
		}

		if (!appPromise) {
			appPromise = createApp({
				config: resolved.config,
				translationStore,
				env: resolved.env,
				runtimeContext: options.runtimeContext,
				http: options.http,
			}).catch((error) => {
				appPromise = undefined;
				throw error;
			});
		}

		return appPromise;
	};

	const getToolkit = async (
		request?: CreateToolkitServiceContextOptions["request"],
	): Promise<Toolkit> => {
		const app = await getApp();
		return createToolkit(
			createToolkitServiceContext({
				config: resolved.config,
				translationStore,
				env: resolved.env,
				runtimeContext: options.runtimeContext,
				queue: app.queue,
				kv: app.kv,
				media: app.media,
				email: app.email,
				request,
			}),
		);
	};

	return {
		config: resolved.config,
		env: resolved.env,
		runtimeContext: options.runtimeContext,
		translationStore,
		getApp,
		getToolkit,
		destroy: async () => {
			if (destroyed) return;
			destroyed = true;
			const app = appPromise ? await appPromise : undefined;
			await app?.destroy();
		},
	};
};

export default createLucidHost;
