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
	/** Resolves to the parsed JSON body, or null when the request or parsing fails. */
	get: (path: `/${string}`, options?: PublicRequestOptions) => Promise<unknown>;
};

const clients = new Map<string, LucidRemotePublicClient>();

/**
 * Public Lucid Remote client without custom headers, CMS origin or retries. Only reads return
 * data; callers validate it.
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
				//* a redirect answers as not ok, so it fails like any error. Workers don't support "error"
				redirect: "manual",
				signal: AbortSignal.timeout(options.timeoutMs ?? 750),
			});

			return response.ok;
		} catch {
			return false;
		}
	},
	get: async (path, options = {}) => {
		try {
			const url = new URL(path, apiDomain);
			if (url.origin !== apiDomain || !path.startsWith("/")) return null;

			const response = await fetch(url, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"User-Agent": `LucidCMS/${packageJson.version}`,
				},
				cache: "no-store",
				credentials: "omit",
				//* a redirect answers as not ok, so it fails like any error. Workers don't support "error"
				redirect: "manual",
				signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
			});
			if (!response.ok) return null;

			return await response.json();
		} catch {
			return null;
		}
	},
});

/** Returns a cached client for public Lucid Remote endpoints. */
export const getLucidRemotePublicClient = (
	env?: EnvironmentVariables | null,
) => {
	const apiDomain = getLucidRemoteConfigFromEnv(env).issuer;
	const cached = clients.get(apiDomain);
	if (cached) return cached;

	const client = createLucidRemotePublicClient(apiDomain);
	clients.set(apiDomain, client);
	return client;
};
