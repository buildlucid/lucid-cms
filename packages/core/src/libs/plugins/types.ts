import type { WritableDraft } from "immer";
import type { ServiceResponse } from "../../utils/services/types.js";
import type { Config } from "../../types/config.js";
import type {
	AdapterRuntimeContext,
	RuntimeBuildArtifactCompile,
	RuntimeBuildArtifactCustom,
	RuntimeBuildArtifactFile,
} from "../runtime-adapter/types.js";

export type LucidPluginBuildHookResult = {
	artifacts?: Array<
		| RuntimeBuildArtifactFile
		| RuntimeBuildArtifactCompile
		| RuntimeBuildArtifactCustom
	>;
};

export type LucidPluginHookInit = () => ServiceResponse<undefined>;
export type LucidPluginHookBuild = (props: {
	paths: {
		configPath: string;
		outputPath: string;
		outputRelativeConfigPath: string;
	};
}) => ServiceResponse<LucidPluginBuildHookResult>;

export type LucidPluginHooks = {
	/**
	 * This hook is called when the plugin is initialized within the `processConfig` function.
	 */
	init?: LucidPluginHookInit;
	/**
	 * This hook is called when the CLI build command is ran.
	 *
	 * Its artifacts are collected, processed and potentially passed to the runtime adapter based on the type.
	 */
	build?: LucidPluginHookBuild;
};

export type LucidPluginRecipe = (draft: WritableDraft<Config>) => void;

export type LucidPluginResponse = {
	/**
	 * The unique key of the plugin.
	 */
	key: string;
	/**
	 * The Lucid CMS semver range that the plugin is compatible with.
	 */
	lucid: string;
	/**
	 * The hooks that the plugin can register.
	 */
	hooks?: LucidPluginHooks;
	/**
	 * Can be used to check if the plugin is compatible with the current runtime context and state of the config.
	 *
	 * If the plugin is not compatible, you can throw either a LucidError or standard Error.
	 */
	checkCompatibility?: (props: {
		runtimeContext: AdapterRuntimeContext;
		config: Config;
	}) => void | Promise<void>;
	/**
	 * The recipe function where you can mutate the config.
	 */
	recipe: LucidPluginRecipe;
};

export type LucidPlugin<T = undefined> = (
	pluginOptions: T,
) => LucidPluginResponse;
