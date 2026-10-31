import { afterEach, describe, expect, test, vi } from "vitest";
import turnstileCaptchaAdapter from "./adapter.js";

afterEach(() => vi.unstubAllGlobals());

const context = { request: { ipAddress: "203.0.113.1" } } as never;
const params = { token: "token", action: "lucid_login" };

const respond = (body: Record<string, unknown>, status = 200) => {
	const fetch = vi.fn(async () => Response.json(body, { status }));
	vi.stubGlobal("fetch", fetch);
	return fetch;
};

describe("Turnstile captcha adapter", () => {
	test("sends the secret and token, and the IP address only when enabled", async () => {
		const fetch = respond({ success: true, action: "lucid_login" });

		await turnstileCaptchaAdapter({
			siteKey: "site",
			secretKey: "secret",
		}).verify(context, params);
		await turnstileCaptchaAdapter({
			siteKey: "site",
			secretKey: "secret",
			sendRemoteIp: true,
		}).verify(context, params);

		const bodies = fetch.mock.calls.map(
			([, init]) => new URLSearchParams(String(init?.body)),
		);
		expect(Object.fromEntries(bodies[0] ?? [])).toEqual({
			secret: "secret",
			response: "token",
		});
		expect(bodies[1]?.get("remoteip")).toBe("203.0.113.1");
	});

	test("passes matching tokens and testing keys, and rejects other actions and hostnames", async () => {
		const adapter = turnstileCaptchaAdapter({
			siteKey: "site",
			secretKey: "secret",
			hostnames: ["CMS.example.com"],
		});

		respond({
			success: true,
			action: "lucid_login",
			hostname: "cms.example.com",
		});
		expect(await adapter.verify(context, params)).toEqual({ success: true });

		respond({
			success: true,
			action: "lucid_setup",
			hostname: "cms.example.com",
		});
		expect(await adapter.verify(context, params)).toEqual({
			success: false,
			reason: "mismatch",
		});

		respond({ success: true, action: "lucid_login", hostname: "evil.example" });
		expect(await adapter.verify(context, params)).toEqual({
			success: false,
			reason: "mismatch",
		});

		respond({
			success: true,
			hostname: "example.com",
			metadata: { result_with_testing_key: true },
		});
		expect(await adapter.verify(context, params)).toEqual({ success: true });
	});

	test("fails bad tokens and throws for problems the visitor can't fix", async () => {
		const adapter = turnstileCaptchaAdapter({
			siteKey: "site",
			secretKey: "secret",
		});

		respond({ success: false, "error-codes": ["timeout-or-duplicate"] });
		expect(await adapter.verify(context, params)).toEqual({
			success: false,
			reason: "expired",
		});

		respond({ success: false, "error-codes": ["invalid-input-response"] });
		expect(await adapter.verify(context, params)).toEqual({
			success: false,
			reason: "invalid",
		});

		respond({ success: false, "error-codes": ["invalid-input-secret"] });
		await expect(adapter.verify(context, params)).rejects.toThrow();

		respond({}, 500);
		await expect(adapter.verify(context, params)).rejects.toThrow();
	});
});
