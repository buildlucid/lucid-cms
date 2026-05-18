import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import type { Config } from "../../types/config.js";
import type { ArgumentsType, HookServiceHandlers } from "../../types/hooks.js";
import type { InternalCollectionDocument } from "../../types/response.js";
import type { ServiceFn, ServiceResponse } from "../services/types.js";

export type HookExecutionMode = "merge" | "pipeline";

export type HookOptions<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = {
	service: S;
	event: E;
	config: Config;
	collectionInstance?: CollectionBuilder;
};

export type HookData<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> =
	HookServiceHandlers[S][E] extends ServiceFn<infer _Args, infer Data>
		? Data
		: never;

export type HookResponse<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = Awaited<ServiceResponse<HookData<S, E>>>;

export type PipelineHookDataMap = {
	documents: {
		afterFetch: InternalCollectionDocument[];
	};
};

export type PipelineHookData<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = S extends keyof PipelineHookDataMap
	? E extends keyof PipelineHookDataMap[S]
		? PipelineHookDataMap[S][E]
		: never
	: never;

export type PipelineInput<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = [PipelineHookData<S, E>] extends [never]
	? never
	: {
			initialData: PipelineHookData<S, E>;
			buildArgs: (
				currentData: PipelineHookData<S, E>,
			) => ArgumentsType<HookServiceHandlers[S][E]>;
		};

export type UnknownPipelineInput = {
	initialData: unknown;
	buildArgs: (currentData: unknown) => unknown[];
};
