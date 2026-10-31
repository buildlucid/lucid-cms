import { LucidError, z } from "@lucidcms/core";
import type { CaptchaAdapterInstance } from "@lucidcms/core/types";
import {
	MAX_TOKEN_LENGTH,
	PLUGIN_IDENTIFIER,
	SITEVERIFY_URL,
	VERIFY_TIMEOUT,
} from "./constants.js";
import type { PluginOptions, TurnstileClientOptions } from "./types.js";

/** Error codes for a missing or bad token, rather than a problem with our setup. */
const INVALID_TOKEN_CODES = [
	"missing-input-response",
	"invalid-input-response",
];

const responseSchema = z.object({
	success: z.boolean(),
	"error-codes": z.array(z.string()).default([]),
	action: z.string().optional(),
	hostname: z.string().optional(),
	metadata: z
		.object({ result_with_testing_key: z.boolean().optional() })
		.optional(),
});

/** Checks Turnstile tokens with Cloudflare's siteverify API. */
const turnstileCaptchaAdapter = (
	options: PluginOptions,
): CaptchaAdapterInstance => {
	const hostnames = options.hostnames?.map((hostname) =>
		hostname.toLowerCase(),
	);

	return {
		type: "captcha-adapter",
		key: PLUGIN_IDENTIFIER,
		client: {
			siteKey: options.siteKey,
			size: options.size ?? "flexible",
			appearance: options.appearance ?? "always",
		} satisfies TurnstileClientOptions,
		verify: async (context, params) => {
			if (params.token.length > MAX_TOKEN_LENGTH) {
				return { success: false, reason: "invalid" };
			}

			const body = new URLSearchParams({
				secret: options.secretKey,
				response: params.token,
			});
			if (options.sendRemoteIp && context.request.ipAddress) {
				body.set("remoteip", context.request.ipAddress);
			}

			const response = await fetch(SITEVERIFY_URL, {
				method: "POST",
				body,
				signal: AbortSignal.timeout(VERIFY_TIMEOUT),
			});
			if (!response.ok) {
				throw new LucidError({
					message: `Turnstile siteverify responded with ${response.status}.`,
				});
			}

			const result = responseSchema.parse(await response.json());
			const errors = result["error-codes"];
			if (!result.success) {
				if (errors.includes("timeout-or-duplicate")) {
					return { success: false, reason: "expired" };
				}
				if (errors.every((code) => INVALID_TOKEN_CODES.includes(code))) {
					return { success: false, reason: "invalid" };
				}
				//* bad secrets and internal errors are ours to fix, not the visitor's
				throw new LucidError({
					message: `Turnstile could not check the token: ${errors.join(", ")}.`,
				});
			}

			//* Cloudflare's testing keys pass every token, without an action or real hostname
			if (result.metadata?.result_with_testing_key) return { success: true };
			if (result.action !== params.action) {
				return { success: false, reason: "mismatch" };
			}
			if (
				hostnames &&
				!hostnames.includes(result.hostname?.toLowerCase() ?? "")
			) {
				return { success: false, reason: "mismatch" };
			}

			return { success: true };
		},
	};
};

export default turnstileCaptchaAdapter;
