import { LucidError } from "@lucidcms/core";
import type {
	LucidHonoContext,
	LucidInvocation,
	RuntimeAdapter,
} from "@lucidcms/core/types";
import getRuntimeContext from "./services/runtime-context.js";

type AstroAdapter = {
	name: string;
};

type AstroRequestContext = {
	request: Request;
};

const resolveRemoteAddress = (request: Request) => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	return (
		forwardedFor?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		request.headers.get("cf-connecting-ip") ||
		"127.0.0.1"
	);
};

/** Astro request bridge for the Node runtime. */
const nodeAstroBridge = {
	name: "@lucidcms/runtime-node/astro",
	validateAdapter(adapter: AstroAdapter | undefined) {
		if (!adapter?.name.toLowerCase().includes("node")) {
			throw new LucidError({
				message:
					"The Lucid Node runtime requires an Astro Node adapter. Add @astrojs/node to astro.config.*.",
			});
		}
	},
	async resolveRuntime(props: { adapter: RuntimeAdapter; compiled: boolean }) {
		const runtimeContext = getRuntimeContext({ compiled: props.compiled });

		return {
			cacheKey: "node",
			databaseScope: "runtime" as const,
			runtimeContext: {
				...runtimeContext,
				configEntryPoint: null,
				getConnectionInfo: (context: LucidHonoContext) => {
					const address = resolveRemoteAddress(context.req.raw);
					return {
						address,
						addressType: address.includes(":") ? "IPv6" : "IPv4",
					};
				},
			},
		};
	},
	handle(props: { invocation: LucidInvocation; context: AstroRequestContext }) {
		return props.invocation.handle({ request: props.context.request });
	},
};

export default nodeAstroBridge;
