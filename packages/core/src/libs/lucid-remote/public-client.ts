import packageJson from "../../../package.json" with { type: "json" };
import type { EnvironmentVariables } from "../runtime/types.js";
import { getLucidRemoteConfigFromEnv } from "./origin.js";

type PublicRequestOptions = {
	timeoutMs?: number;
};

type LucidRemotePublicClient = {
	post: (
		path: `/${string}`,
		body: unknown,
		options?: PublicRequestOptions,
	) => Promise<boolean>;
};

const clients = new Map<string, LucidRemotePublicClient>();

/**
 * Creates the deliberately constrained client used for unauthenticated Lucid
 * Remote endpoints. It cannot attach arbitrary headers, send the CMS origin,
 * retry, or read response data.
 */
const createLucidRemotePublicClient = (
	apiDomain: string,
): LucidRemotePublicClient => ({
	post: async (path, body, options = {}) => {
		try {
			const url = new URL(path, apiDomain);
			if (url.origin !== apiDomain || !path.startsWith("/")) return false;

			const response = await fetch(url, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"User-Agent": `LucidCMS/${packageJson.version}`,
				},
				body: JSON.stringify(body),
				cache: "no-store",
				credentials: "omit",
				redirect: "error",
				signal: AbortSignal.timeout(options.timeoutMs ?? 750),
			});

			return response.ok;
		} catch {
			return false;
		}
	},
});

/** Returns a cached client for public, write-only Lucid Remote endpoints. */
export const getLucidRemotePublicClient = (env?: EnvironmentVariables) => {
	const apiDomain = getLucidRemoteConfigFromEnv(env).issuer;
	const cached = clients.get(apiDomain);
	if (cached) return cached;

	const client = createLucidRemotePublicClient(apiDomain);
	clients.set(apiDomain, client);
	return client;
};
