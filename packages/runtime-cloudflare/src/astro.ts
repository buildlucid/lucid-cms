import { LucidError } from "@lucidcms/core";
import { setupCronJobs } from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	HttpExtension,
	LucidHonoContext,
	LucidInvocation,
	RuntimeAdapter,
} from "@lucidcms/core/types";
import getRuntimeContext from "./services/get-runtime-context.js";

type CloudflareExecutionContext = {
	waitUntil(promise: Promise<unknown>): void;
	passThroughOnException?: () => void;
};

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

/** Hono throws when executionCtx is read outside a Worker request. */
const getExecutionContext = (
	context: LucidHonoContext,
): CloudflareExecutionContext | null => {
	try {
		return context.executionCtx as CloudflareExecutionContext;
	} catch {
		return null;
	}
};

const platformContextExtension: HttpExtension = {
	name: "runtime-cloudflare:astro-context",
	priority: 0,
	register: (app) => {
		app.use("*", async (context, next) => {
			context.set(
				"cf",
				(context.req.raw as Request & { cf?: unknown }).cf ?? null,
			);
			context.set("caches", globalThis.caches ?? null);

			const executionContext = getExecutionContext(context);
			context.set(
				"ctx",
				executionContext
					? {
							waitUntil: executionContext.waitUntil.bind(executionContext),
							...(executionContext.passThroughOnException
								? {
										passThroughOnException:
											executionContext.passThroughOnException.bind(
												executionContext,
											),
									}
								: {}),
						}
					: null,
			);
			await next();
		});
	},
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

/** Astro request and scheduled-event bridge for the Cloudflare runtime. */
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
	async scheduled(props: {
		invocation: LucidInvocation;
		controller: { cron: string };
		state: {
			env: EnvironmentVariables;
			runtimeContext: ReturnType<typeof getRuntimeContext>;
		};
	}) {
		const cron = await setupCronJobs({
			createQueue: false,
			env: props.state.env,
			runtimeContext: props.state.runtimeContext,
		});
		await cron.register(await props.invocation.getServiceContext(), {
			schedule: props.controller.cron,
		});
	},
};

export default cloudflareAstroBridge;
