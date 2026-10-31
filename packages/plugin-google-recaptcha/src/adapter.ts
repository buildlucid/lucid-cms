import { LucidError, z } from "@lucidcms/core";
import type { CaptchaAdapterInstance } from "@lucidcms/core/types";
import {
	ASSESSMENTS_URL,
	DEFAULT_MIN_SCORE,
	PLUGIN_IDENTIFIER,
	VERIFY_TIMEOUT,
} from "./constants.js";
import type { PluginOptions, RecaptchaClientOptions } from "./types.js";

const assessmentSchema = z.object({
	tokenProperties: z.object({
		valid: z.boolean(),
		invalidReason: z.string().optional(),
		action: z.string().optional(),
		hostname: z.string().optional(),
	}),
	riskAnalysis: z.object({ score: z.number().optional() }).optional(),
});

/** Checks reCAPTCHA tokens by creating assessments with the reCAPTCHA Enterprise API. */
const recaptchaCaptchaAdapter = (
	options: PluginOptions,
): CaptchaAdapterInstance => {
	const mode = options.mode ?? "score";
	const minScore =
		options.minScore ?? (mode === "score" ? DEFAULT_MIN_SCORE : undefined);
	const hostnames = options.hostnames?.map((hostname) =>
		hostname.toLowerCase(),
	);

	return {
		type: "captcha-adapter",
		key: PLUGIN_IDENTIFIER,
		client: {
			siteKey: options.siteKey,
			mode,
		} satisfies RecaptchaClientOptions,
		verify: async (context, params) => {
			const userIpAddress = options.sendRemoteIp
				? context.request.ipAddress
				: undefined;

			const response = await fetch(
				`${ASSESSMENTS_URL}/${encodeURIComponent(options.projectId)}/assessments`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Goog-Api-Key": options.apiKey,
					},
					body: JSON.stringify({
						event: {
							token: params.token,
							siteKey: options.siteKey,
							expectedAction: params.action,
							...(userIpAddress && { userIpAddress }),
						},
					}),
					signal: AbortSignal.timeout(VERIFY_TIMEOUT),
				},
			);
			//* over quota returns 429, so tokens fail closed
			if (!response.ok) {
				throw new LucidError({
					message: `reCAPTCHA createAssessment responded with ${response.status}.`,
				});
			}

			const { tokenProperties, riskAnalysis } = assessmentSchema.parse(
				await response.json(),
			);
			if (!tokenProperties.valid) {
				switch (tokenProperties.invalidReason) {
					case "EXPIRED":
					case "DUPE":
						return { success: false, reason: "expired" };
					case "UNEXPECTED_ACTION":
					case "DOMAIN_MISMATCH":
						return { success: false, reason: "mismatch" };
					default:
						return { success: false, reason: "invalid" };
				}
			}

			//* checkbox tokens may carry no action, so only score tokens must have one
			const action = tokenProperties.action?.toLowerCase();
			if (
				(mode === "score" || action) &&
				action !== params.action.toLowerCase()
			) {
				return { success: false, reason: "mismatch" };
			}
			if (
				hostnames &&
				!hostnames.includes(tokenProperties.hostname?.toLowerCase() ?? "")
			) {
				return { success: false, reason: "mismatch" };
			}

			const score = riskAnalysis?.score;
			if (minScore !== undefined && (score === undefined || score < minScore)) {
				return { success: false, reason: "low-score" };
			}

			return { success: true, score };
		},
	};
};

export default recaptchaCaptchaAdapter;
