import { createDraft, finishDraft } from "immer";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { text } from "../i18n/index.js";
import { hookExecutionKinds } from "./hook-map.js";
import type {
	ArgumentsType,
	ExecuteHookData,
	HookData,
	HookExecutionKind,
	HookOptions,
	HookResponse,
	HookServiceHandlers,
	TransformHookData,
} from "./types.js";

type MatchingHook<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = {
	handler: HookServiceHandlers[S][E];
	priority?: number;
	order: number;
};

type TransformPayload = {
	data: unknown;
};

type HookPayloadArguments<T> = T extends (
	context: ServiceContext,
	...args: infer Args
) => unknown
	? Args
	: never;

const hasTransformPayload = (value: unknown): value is TransformPayload => {
	if (typeof value !== "object" || value === null) return false;

	return "data" in value;
};

const getMatchingHooks = <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
) => {
	const hooks: Array<MatchingHook<S, E>> = [];
	let order = 0;

	for (let i = 0; i < options.config.hooks.length; i++) {
		const hook = options.config.hooks[i];
		if (hook === undefined) continue;
		if (hook.service !== options.service || hook.event !== options.event) {
			continue;
		}

		hooks.push({
			handler: hook.handler as HookServiceHandlers[S][E],
			priority: "priority" in hook ? hook.priority : undefined,
			order: order++,
		});
	}

	if (options.collectionInstance?.config.hooks === undefined) return hooks;

	for (let i = 0; i < options.collectionInstance.config.hooks.length; i++) {
		const hook = options.collectionInstance.config.hooks[i];
		if (hook === undefined) continue;
		if (hook.service !== options.service) continue;
		if (hook.event !== options.event) continue;

		hooks.push({
			handler: hook.handler as HookServiceHandlers[S][E],
			priority: "priority" in hook ? hook.priority : undefined,
			order: order++,
		});
	}

	return hooks;
};

const getTransformHooks = <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
) => {
	return getMatchingHooks(options).sort((a, b) => {
		const priorityDiff = (a.priority ?? 0) - (b.priority ?? 0);
		if (priorityDiff !== 0) return priorityDiff;

		return a.order - b.order;
	});
};

/**
 * Runs hooks that only perform side effects. Each matching hook receives the
 * same arguments and any returned data is ignored by design.
 */
const executeEffectHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
	args: ArgumentsType<HookServiceHandlers[S][E]>,
): ServiceResponse<HookData<S, E>> => {
	for (const hook of getMatchingHooks(options)) {
		const res = await (
			hook.handler as unknown as (
				...args: ArgumentsType<HookServiceHandlers[S][E]>
			) => Promise<HookResponse<S, E>>
		)(...args);
		if (res.error) return res;
	}

	return {
		error: undefined,
		data: undefined as HookData<S, E>,
	};
};

/**
 * Runs hooks as ordered transforms. The `data` payload is drafted with Immer for
 * each hook, so handlers can mutate only the parts they care about or return a
 * full replacement value. The finalized data is passed to the next hook.
 */
const executeTransformHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
	args: ArgumentsType<HookServiceHandlers[S][E]>,
): ServiceResponse<TransformHookData<S, E>> => {
	const payload = args[1];
	if (!hasTransformPayload(payload)) {
		return {
			error: {
				type: "basic",
				name: text.server("core.hooks.execution.error.name"),
				message: text.server("core.hooks.transform.payload.error.message", {
					data: {
						service: String(options.service),
						event: String(options.event),
					},
				}),
				status: 500,
			},
			data: undefined,
		};
	}

	let currentData = payload.data as TransformHookData<S, E>;

	for (const hook of getTransformHooks(options)) {
		const draft = createDraft(currentData);
		const nextArgs = [
			args[0],
			{
				...payload,
				data: draft,
			},
		] as ArgumentsType<HookServiceHandlers[S][E]>;

		const res = await (
			hook.handler as unknown as (
				...args: ArgumentsType<HookServiceHandlers[S][E]>
			) => Promise<HookResponse<S, E>>
		)(...nextArgs);
		if (res.error) return res;

		if (res.data === undefined || res.data === draft) {
			currentData = finishDraft(draft) as TransformHookData<S, E>;
			continue;
		}

		finishDraft(draft);

		currentData = res.data as TransformHookData<S, E>;
	}

	return {
		error: undefined,
		data: currentData,
	};
};

/**
 * Dispatches hooks through the configured execution kind while keeping one
 * caller interface for both effect and transform events.
 */
const executeHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	context: ServiceContext,
	options: HookOptions<S, E>,
	...args: HookPayloadArguments<HookServiceHandlers[S][E]>
): ServiceResponse<ExecuteHookData<S, E>> => {
	const hookArgs = [context, ...args] as ArgumentsType<
		HookServiceHandlers[S][E]
	>;
	const executionKind =
		(hookExecutionKinds as Record<string, Record<string, HookExecutionKind>>)[
			String(options.service)
		]?.[String(options.event)] ?? "effect";

	if (executionKind === "transform") {
		return executeTransformHooks(options, hookArgs) as ServiceResponse<
			ExecuteHookData<S, E>
		>;
	}

	return executeEffectHooks(options, hookArgs) as ServiceResponse<
		ExecuteHookData<S, E>
	>;
};

export default executeHooks;
