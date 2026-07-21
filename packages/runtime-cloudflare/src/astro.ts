import { LucidError } from "@lucidcms/core";
import { setupCronJobs } from "@lucidcms/core/runtime";
import { createToolkitServiceContext } from "@lucidcms/core/toolkit";
import type {
	EnvironmentVariables,
	HttpExtension,
	LucidHonoContext,
	LucidHost,
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

		return {
			env,
			executionContext: runtime?.ctx ?? props.context?.locals?.cfContext,
			runtimeContext: getRuntimeContext({
				server: (runtime?.env ?? workersEnv) ? "cloudflare" : "node",
				compiled: props.compiled,
			}),
			http: {
				extensions: [platformContextExtension],
			},
		};
	},
	async handle(props: {
		host: LucidHost;
		context: AstroRequestContext;
		state: {
			env: EnvironmentVariables;
			executionContext?: CloudflareExecutionContext;
		};
	}) {
		const { app } = await props.host.getApp();
		return app.fetch(
			props.context.request,
			props.state.env,
			props.state.executionContext as Parameters<typeof app.fetch>[2],
		);
	},
	async scheduled(props: {
		host: LucidHost;
		controller: { cron: string };
		state: {
			env: EnvironmentVariables;
		};
	}) {
		const app = await props.host.getApp();
		const cron = await setupCronJobs({
			createQueue: false,
			env: props.state.env,
			runtimeContext: props.host.runtimeContext,
		});
		await cron.register(
			createToolkitServiceContext({
				config: props.host.config,
				translationStore: props.host.translationStore,
				env: props.state.env,
				runtimeContext: props.host.runtimeContext,
				queue: app.queue,
				kv: app.kv,
				media: app.media,
				email: app.email,
			}),
			{ schedule: props.controller.cron },
		);
	},
};

export default cloudflareAstroBridge;
