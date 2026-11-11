import crypto from "node:crypto";
import packageJson from "../../../../package.json" with { type: "json" };
import constants from "../../../constants/constants.js";
import type { DeployProviderInstance, DeployProviderRun } from "../types.js";

export type DeployWebhookOptions = {
	/** Where to POST, such as a host's build hook or your own CI endpoint. */
	url: string;
	/**
	 * Signs requests with Standard Webhooks headers. Use a `whsec_` secret to verify them with the
	 * Standard Webhooks libraries.
	 */
	secret?: string;
	/** Extra request headers, such as an authorization header. */
	headers?: Record<string, string>;
	/**
	 * Keeps the run going until your CI POSTs its status to `data.callbackUrl`. Otherwise the run
	 * ends as triggered once the URL accepts the request.
	 */
	callback?: boolean;
	/** Replaces the JSON body, for hosts that expect their own. */
	body?: (run: DeployProviderRun) => unknown;
};

/** Standard Webhooks secrets are base64 after their prefix; other secrets are used as they are. */
const secretKey = (secret: string) =>
	secret.startsWith("whsec_")
		? Buffer.from(secret.slice("whsec_".length), "base64")
		: Buffer.from(secret, "utf8");

/**
 * A deploy provider that POSTs to a URL, such as a build hook from Netlify, Vercel or Cloudflare,
 * or your own CI endpoint.
 *
 * @example
 * defineDeploy({
 * 	key: "production",
 * 	name: "Production",
 * 	provider: deployWebhook({ url: env.BUILD_HOOK_URL }),
 * });
 */
const deployWebhook = (
	options: DeployWebhookOptions,
): DeployProviderInstance => ({
	type: "deploy-provider",
	key: "webhook",
	trigger: async (_context, run) => {
		const id = `deploy-run-${run.id}`;
		const timestamp = Math.floor(Date.now() / 1000);
		const body = JSON.stringify(
			options.body
				? options.body(run)
				: {
						type: "deploy.requested",
						timestamp: new Date(timestamp * 1000).toISOString(),
						data: {
							deploy: run.deployKey,
							runId: run.id,
							source: run.source,
							triggerCount: run.triggerCount,
							callbackUrl: run.callbackUrl,
						},
					},
		);

		const headers = new Headers(options.headers);
		headers.set("Content-Type", "application/json");
		headers.set("User-Agent", `LucidCMS/${packageJson.version}`);
		if (options.secret) {
			const signature = crypto
				.createHmac("sha256", secretKey(options.secret))
				.update(`${id}.${timestamp}.${body}`)
				.digest("base64");
			headers.set("webhook-id", id);
			headers.set("webhook-timestamp", String(timestamp));
			headers.set("webhook-signature", `v1,${signature}`);
		}

		const response = await fetch(options.url, {
			method: "POST",
			headers,
			body,
			//* a redirect answers as not ok, so it fails like any error. Workers don't support "error"
			redirect: "manual",
			signal: AbortSignal.timeout(constants.deploys.requestTimeoutMs),
		});
		if (!response.ok) {
			throw new Error(`The webhook responded with ${response.status}.`);
		}

		return options.callback ? { status: "running" } : { status: "triggered" };
	},
});

export default deployWebhook;
