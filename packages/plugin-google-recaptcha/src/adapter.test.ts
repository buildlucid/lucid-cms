import { afterEach, describe, expect, test, vi } from "vitest";
import recaptchaCaptchaAdapter from "./adapter.js";

afterEach(() => vi.unstubAllGlobals());

const context = { request: { ipAddress: "203.0.113.1" } } as never;
const params = { token: "token", action: "lucid_login" };
const options = { siteKey: "site", projectId: "project", apiKey: "api-key" };

const respond = (body: Record<string, unknown>, status = 200) => {
	const fetch = vi.fn(async () => Response.json(body, { status }));
	vi.stubGlobal("fetch", fetch);
	return fetch;
};

const assessment = (
	tokenProperties: Record<string, unknown>,
	score?: number,
) => ({
	tokenProperties: { valid: true, action: "LUCID_LOGIN", ...tokenProperties },
	riskAnalysis: { score },
});

describe("reCAPTCHA captcha adapter", () => {
	test("creates an assessment with the key in a header and the expected action", async () => {
		const fetch = respond(assessment({}, 0.9));

		const result = await recaptchaCaptchaAdapter(options).verify(
			context,
			params,
		);

		expect(result).toEqual({ success: true, score: 0.9 });
		const [url, init] = fetch.mock.calls[0] ?? [];
		expect(url).toBe(
			"https://recaptchaenterprise.googleapis.com/v1/projects/project/assessments",
		);
		expect(init?.headers).toMatchObject({ "X-Goog-Api-Key": "api-key" });
		expect(JSON.parse(String(init?.body))).toEqual({
			event: { token: "token", siteKey: "site", expectedAction: "lucid_login" },
		});
	});

	test("rejects low scores, other actions and invalid tokens", async () => {
		const adapter = recaptchaCaptchaAdapter(options);

		respond(assessment({}, 0.3));
		expect(await adapter.verify(context, params)).toEqual({
			success: false,
			reason: "low-score",
		});

		respond(assessment({ action: "lucid_setup" }, 0.9));
		expect(await adapter.verify(context, params)).toEqual({
			success: false,
			reason: "mismatch",
		});

		respond(assessment({ valid: false, invalidReason: "DUPE" }));
		expect(await adapter.verify(context, params)).toEqual({
			success: false,
			reason: "expired",
		});
	});

	test("passes unscored checkbox tokens without an action", async () => {
		respond(assessment({ action: "" }));

		expect(
			await recaptchaCaptchaAdapter({ ...options, mode: "checkbox" }).verify(
				context,
				params,
			),
		).toEqual({ success: true, score: undefined });
	});

	test("throws when Google can't assess the token, such as over quota", async () => {
		respond({}, 429);

		await expect(
			recaptchaCaptchaAdapter(options).verify(context, params),
		).rejects.toThrow();
	});
});
