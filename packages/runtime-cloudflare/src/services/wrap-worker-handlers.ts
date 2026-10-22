import type {
	EnvironmentVariables,
	LucidInvocation,
} from "@lucidcms/core/types";
import type {
	CloudflareExecutionContext,
	CloudflareWorkerHandler,
} from "../types.js";

/** Turns plugin handlers into Worker event methods that run each event in its own invocation. */
const wrapWorkerHandlers = (
	handlers: Record<string, CloudflareWorkerHandler>,
	createInvocation: (
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
	) => Promise<LucidInvocation>,
) =>
	Object.fromEntries(
		Object.entries(handlers).map(([event, handler]) => [
			event,
			async (
				input: unknown,
				env: EnvironmentVariables,
				ctx: CloudflareExecutionContext,
			) => {
				const invocation = await createInvocation(env, ctx);
				try {
					await handler({ event: input, env, ctx, invocation });
				} finally {
					await invocation.destroy();
				}
			},
		]),
	);

export default wrapWorkerHandlers;
