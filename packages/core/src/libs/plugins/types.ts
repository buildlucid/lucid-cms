import type { WritableDraft } from "immer";
import type { ServiceResponse } from "../../utils/services/types.js";
import type { Config } from "../../types/config.js";
import type {
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

export type LucidPluginHookInit = () => ServiceResponse<void>;
export type LucidPluginHookBuild = (props: {
	paths: {
		configPath: string;
		outputPath: string;
		outputRelativeConfigPath: string;
	};
}) => ServiceResponse<LucidPluginBuildHookResult>;

export type LucidPluginHooks = {
	init?: LucidPluginHookInit;
	build?: LucidPluginHookBuild;
};

export type LucidPluginRecipe = (draft: WritableDraft<Config>) => void;

export type LucidPluginResponse = {
	key: string;
	lucid: string;
	hooks?: LucidPluginHooks;
	recipe: LucidPluginRecipe;
};

export type LucidPlugin<T = undefined> = (
	pluginOptions: T,
) => LucidPluginResponse;
