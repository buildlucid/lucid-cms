import { createDraft, finishDraft } from "immer";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import createToolkit from "../toolkit/create-toolkit.js";
import type { Toolkit } from "../toolkit/types.js";
import { hookExecutionKinds } from "./hook-map.js";
import type {
	ExecuteHookData,
	HookData,
	HookOptions,
	HookPayload,
	HookServiceHandlers,
	TransformHookData,
} from "./types.js";

type HookArguments<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = HookPayload<S, E> & {
	context: ServiceContext;
	toolkit: Toolkit;
};

type MatchingHookHandler<
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
> = (args: HookArguments<S, E>) => ServiceResponse<HookData<S, E>>;

const getOrderedHooks = <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	options: HookOptions<S, E>,
) => {
	const hooks = [
		...options.config.hooks,
		...(options.collectionInstance?.config.hooks ?? []),
	];

	return hooks
		.filter(
			(hook) =>
				hook.service === options.service && hook.event === options.event,
		)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		.map(
			// The service and event check selects the matching handler signature.
			(hook) => hook.handler as unknown as MatchingHookHandler<S, E>,
		);
};

/** Runs side effects in order, stopping at the first error. */
const executeEffectHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	hooks: MatchingHookHandler<S, E>[],
	args: HookArguments<S, E>,
): ServiceResponse<HookData<S, E>> => {
	for (const handler of hooks) {
		const result = await handler(args);
		if (result.error) return result;
	}

	return {
		error: undefined,
		data: undefined as HookData<S, E>,
	};
};

/**
 * Passes a fresh data draft to each hook. Hooks can mutate the draft or return
 * replacement data, which becomes the next hook's input.
 */
const executeTransformHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	hooks: MatchingHookHandler<S, E>[],
	args: HookArguments<S, E>,
): ServiceResponse<TransformHookData<S, E>> => {
	let currentData = args.data as TransformHookData<S, E>;

	for (const handler of hooks) {
		const draft = createDraft(currentData);
		const result = await handler({ ...args, data: draft });
		if (result.error) return result;

		if (result.data === undefined || result.data === draft) {
			currentData = finishDraft(draft) as TransformHookData<S, E>;
			continue;
		}

		finishDraft(draft);
		currentData = result.data as TransformHookData<S, E>;
	}

	return {
		error: undefined,
		data: currentData,
	};
};

/** Runs matching lifecycle hooks with helpers bound to the current transaction. */
const executeHooks = async <
	S extends keyof HookServiceHandlers,
	E extends keyof HookServiceHandlers[S],
>(
	context: ServiceContext,
	options: HookOptions<S, E>,
	payload: HookPayload<S, E>,
): ServiceResponse<ExecuteHookData<S, E>> => {
	const hooks = getOrderedHooks(options);
	const executionKind = hookExecutionKinds[options.service][options.event];

	if (hooks.length === 0) {
		return {
			error: undefined,
			data: (executionKind === "transform"
				? payload.data
				: undefined) as ExecuteHookData<S, E>,
		};
	}

	const args = { ...payload, context, toolkit: createToolkit(context) };

	if (executionKind === "transform") {
		return executeTransformHooks(hooks, args) as ServiceResponse<
			ExecuteHookData<S, E>
		>;
	}

	return executeEffectHooks(hooks, args) as ServiceResponse<
		ExecuteHookData<S, E>
	>;
};

export default executeHooks;
