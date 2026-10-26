import type { LucidAstroBridge } from "@lucidcms/astro/types";
import { LucidError } from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	LucidInvocation,
} from "@lucidcms/core/types";
import createScheduledHandler from "./services/create-scheduled-handler.js";
import durableObjectAgentRunner from "./services/durable-object-agent-runner.js";
import getRuntimeContext from "./services/get-runtime-context.js";
import platformContextExtension from "./services/platform-context-extension.js";
import wrapWorkerHandlers from "./services/wrap-worker-handlers.js";
import type {
	CloudflareExecutionContext,
	CloudflareWorkerHandler,
} from "./types.js";

type CloudflareRuntime = {
	env?: EnvironmentVariables;
	ctx?: CloudflareExecutionContext;
};

type AstroRequestContext = {
	request: Request;
	locals?: {
		cfContext?: CloudflareExecutionContext;
	};
	runtime?: CloudflareRuntime;
};

/** Reads the Worker's bindings, outside a request too, such as while Astro prerenders in workerd. */
const readWorkersEnv = async (): Promise<EnvironmentVariables | undefined> => {
	try {
		const workers = await import("cloudflare:workers");
		return workers.env as EnvironmentVariables;
	} catch {
		return undefined;
	}
};

/** Astro request bridge for the Cloudflare runtime. */
const cloudflareAstroBridge = {
	name: "@lucidcms/runtime-cloudflare/astro",
	async resolveRuntime(props: {
		context?: AstroRequestContext;
		compiled: boolean;
	}) {
		const runtime = props.context?.runtime;
		const env = runtime?.env ?? (await readWorkersEnv());

		if (!env) {
			throw new LucidError({
				message:
					"Lucid could not access the Cloudflare bindings for the current Astro request. Keep Astro's Cloudflare adapter prerendering in workerd, its default.",
			});
		}

		return {
			cacheKey: "cloudflare",
			databaseScope: "invocation" as const,
			adapterDefaults: { agentRunner: durableObjectAgentRunner },
			env,
			executionContext: runtime?.ctx ?? props.context?.locals?.cfContext,
			runtimeContext: getRuntimeContext({
				compiled: props.compiled,
				host: "astro",
			}),
			http: {
				extensions: [platformContextExtension],
			},
		};
	},
	async handle(props) {
		return props.invocation.handle({
			request: props.context.request,
			executionContext: props.state.executionContext,
		});
	},
} satisfies LucidAstroBridge;

/** Creates the Worker exported by Lucid's Astro Worker entry, combining Astro's `fetch` with Lucid's `scheduled` and plugin handlers. */
export const createAstroWorker = (
	options: {
		fetch: (
			request: Request,
			env: EnvironmentVariables,
			ctx: CloudflareExecutionContext,
		) => Promise<Response>;
		/** The invocation factory of Lucid's runtime module. */
		createLucidInvocation: (context: {
			runtime: CloudflareRuntime;
		}) => Promise<{ invocation: LucidInvocation }>;
	},
	handlers: Record<string, CloudflareWorkerHandler> = {},
) => {
	const createInvocation = async (
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
	) => {
		const { invocation } = await options.createLucidInvocation({
			runtime: { env, ctx },
		});
		return invocation;
	};

	return {
		...wrapWorkerHandlers(handlers, createInvocation),
		fetch: options.fetch,
		scheduled: createScheduledHandler(createInvocation),
	};
};

export default cloudflareAstroBridge;
