import merge from "lodash.merge";
import type { ArgumentsType, HookServiceHandlers } from "../../types/hooks.js";
import type { ServiceResponse } from "../services/types.js";
import { hookExecutionModes } from "./hook-map.js";
import type {
	HookData,
	HookExecutionMode,
	HookOptions,
	HookResponse,
	PipelineHookData,
	PipelineInput,
	UnknownPipelineInput,
} from "./types.js";

/**
 * Guards the dispatcher path because pipeline hooks are passed as an options
 * object while merge hooks keep the existing positional argument style.
 */
const isPipelineInput = (value: unknown): value is UnknownPipelineInput => {
	if (typeof value !== "object" || value === null) return false;

	return "initialData" in value && "buildArgs" in value;
};

/**
 * Executes hooks whose results are partial patches and deep merges them. This
 * preserves the original upsert/delete hook behavior.
 */
const executeMergeHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
	args: ArgumentsType<HookServiceHandlers[S][E]>,
): ServiceResponse<HookData<S, E>> => {
	const results: Array<HookResponse<S, E>> = [];

	for (let i = 0; i < options.config.hooks.length; i++) {
		const hook = options.config.hooks[i];
		if (hook === undefined) continue;
		if (hook.service === options.service && hook.event === options.event) {
			const res = await (
				hook.handler as unknown as (
					...args: ArgumentsType<HookServiceHandlers[S][E]>
				) => Promise<HookResponse<S, E>>
			)(...args);
			if (res.error) return res;

			results.push(res);
		}
	}

	if (options.collectionInstance?.config.hooks === undefined) {
		return merge({}, ...results);
	}

	for (let i = 0; i < options.collectionInstance.config.hooks.length; i++) {
		const hook = options.collectionInstance.config.hooks[i];
		if (hook === undefined) continue;
		if (hook.event === options.event) {
			const res = await (
				hook.handler as unknown as (
					...args: ArgumentsType<HookServiceHandlers[S][E]>
				) => Promise<HookResponse<S, E>>
			)(...args);
			if (res.error) return res;

			results.push(res);
		}
	}

	return merge({}, ...results);
};

/**
 * Executes hooks as ordered transforms, feeding each returned value into the
 * next handler. This avoids deep-merging formatted arrays like document fields.
 */
const executePipelineHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
	pipeline: PipelineInput<S, E>,
): ServiceResponse<PipelineHookData<S, E>> => {
	let currentData = pipeline.initialData;

	for (let i = 0; i < options.config.hooks.length; i++) {
		const hook = options.config.hooks[i];
		if (hook === undefined) continue;
		if (hook.service !== options.service || hook.event !== options.event) {
			continue;
		}

		const res = await (
			hook.handler as unknown as (
				...args: ArgumentsType<HookServiceHandlers[S][E]>
			) => ServiceResponse<PipelineHookData<S, E> | undefined>
		)(...pipeline.buildArgs(currentData));
		if (res.error) return res;
		if (res.data !== undefined) currentData = res.data;
	}

	if (options.collectionInstance?.config.hooks === undefined) {
		return {
			error: undefined,
			data: currentData,
		};
	}

	for (let i = 0; i < options.collectionInstance.config.hooks.length; i++) {
		const hook = options.collectionInstance.config.hooks[i];
		if (hook === undefined) continue;
		if (hook.event !== options.event) continue;

		const res = await (
			hook.handler as unknown as (
				...args: ArgumentsType<HookServiceHandlers[S][E]>
			) => ServiceResponse<PipelineHookData<S, E> | undefined>
		)(...pipeline.buildArgs(currentData));
		if (res.error) return res;
		if (res.data !== undefined) currentData = res.data;
	}

	return {
		error: undefined,
		data: currentData,
	};
};

/**
 * Runs hooks through the mode configured for their event, keeping one call
 * surface while allowing events to opt into merge or transform semantics.
 */
function executeHooks<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
	pipeline: PipelineInput<S, E>,
): ServiceResponse<PipelineHookData<S, E>>;
function executeHooks<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
	...args: ArgumentsType<HookServiceHandlers[S][E]>
): ServiceResponse<HookData<S, E>>;
async function executeHooks<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
	...args: unknown[]
): ServiceResponse<HookData<S, E> | PipelineHookData<S, E>> {
	const executionMode =
		(hookExecutionModes as Record<string, Record<string, HookExecutionMode>>)[
			String(options.service)
		]?.[String(options.event)] ?? "merge";

	if (executionMode === "pipeline") {
		const pipeline = args[0];
		if (!isPipelineInput(pipeline)) {
			throw new Error(
				`Hook ${String(options.service)}.${String(
					options.event,
				)} must be executed with pipeline input.`,
			);
		}

		return executePipelineHooks(options, pipeline as PipelineInput<S, E>);
	}

	return executeMergeHooks(
		options,
		args as ArgumentsType<HookServiceHandlers[S][E]>,
	);
}

export default executeHooks;
