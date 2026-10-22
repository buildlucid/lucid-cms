import { LucidError, setupJobScheduler } from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	LucidInvocation,
	RuntimeAdapter,
} from "@lucidcms/core/types";
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

/** Reads deployed Worker bindings without making them mandatory during prerender. */
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
		adapter: RuntimeAdapter;
		context?: AstroRequestContext;
		fallbackEnv?: EnvironmentVariables;
		compiled: boolean;
	}) {
		const runtime = props.context?.runtime;
		const workersEnv = runtime?.env ? undefined : await readWorkersEnv();
		const env = runtime?.env ?? workersEnv ?? props.fallbackEnv;

		if (!env) {
			throw new LucidError({
				message:
					"Lucid could not access the Cloudflare bindings for the current Astro request.",
			});
		}

		const server = (runtime?.env ?? workersEnv) ? "cloudflare" : "node";

		return {
			cacheKey: server,
			databaseScope:
				server === "cloudflare"
					? ("invocation" as const)
					: ("runtime" as const),
			env,
			executionContext: runtime?.ctx ?? props.context?.locals?.cfContext,
			runtimeContext: getRuntimeContext({
				server,
				compiled: props.compiled,
				host: "astro",
			}),
			http: {
				extensions: [platformContextExtension],
			},
		};
	},
	async handle(props: {
		invocation: LucidInvocation;
		context: AstroRequestContext;
		state: {
			env: EnvironmentVariables;
			executionContext?: CloudflareExecutionContext;
		};
	}) {
		return props.invocation.handle({
			request: props.context.request,
			executionContext: props.state.executionContext,
		});
	},
};

/** Creates the Worker exported by generated Astro entries, combining Astro's `fetch` with Lucid's `scheduled` and plugin handlers. */
export const createAstroWorker = (
	options: {
		fetch: (
			request: Request,
			env: EnvironmentVariables,
			ctx: CloudflareExecutionContext,
		) => Promise<Response>;
		/** The generated Lucid runtime module's invocation factory. */
		createLucidInvocation: (context: {
			runtime: CloudflareRuntime;
		}) => Promise<{ invocation: LucidInvocation }>;
	},
	handlers: Record<string, CloudflareWorkerHandler> = {},
) => ({
	...wrapWorkerHandlers(handlers, async (env, ctx) => {
		const { invocation } = await options.createLucidInvocation({
			runtime: { env, ctx },
		});
		return invocation;
	}),
	fetch: options.fetch,
	scheduled: async (
		controller: { scheduledTime: number },
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
	) => {
		const runJobScheduler = async () => {
			const { invocation } = await options.createLucidInvocation({
				runtime: { env, ctx },
			});
			try {
				await setupJobScheduler().run(await invocation.getServiceContext(), {
					scheduledAt: new Date(controller.scheduledTime),
				});
			} finally {
				await invocation.destroy();
			}
		};

		ctx.waitUntil(runJobScheduler());
	},
});

export default cloudflareAstroBridge;
