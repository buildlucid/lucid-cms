import { describe, expect, test, vi } from "vitest";
import type { CaptchaAdapterInstance } from "../../libs/captcha/types.js";
import verify from "./verify.js";

const createFixture = (verifyToken: CaptchaAdapterInstance["verify"]) => {
	const adapter = {
		type: "captcha-adapter",
		key: "test",
		verify: vi.fn(verifyToken),
	} satisfies CaptchaAdapterInstance;

	return { adapter, context: { captcha: adapter } as never };
};

describe("captcha verify service", () => {
	test("never passes without an adapter or a token", async () => {
		const { adapter, context } = createFixture(async () => ({
			success: true,
		}));

		expect(
			(await verify({ captcha: null } as never, { token: "a", action: "x" }))
				.error?.status,
		).toBe(500);
		expect(
			(await verify(context, { token: " ", action: "x" })).error?.code,
		).toBe("captcha_required");
		expect(adapter.verify).not.toHaveBeenCalled();
	});

	test("passes the server's action and returns the provider's score", async () => {
		const { adapter, context } = createFixture(async () => ({
			success: true,
			score: 0.9,
		}));

		const result = await verify(context, {
			token: "token",
			action: "lucid_login",
		});

		expect(result).toEqual({ error: undefined, data: { score: 0.9 } });
		expect(adapter.verify).toHaveBeenCalledExactlyOnceWith(context, {
			token: "token",
			action: "lucid_login",
		});
	});

	test("rejects failed tokens and provider outages without exposing details", async () => {
		const failed = await verify(
			createFixture(async () => ({ success: false, reason: "mismatch" }))
				.context,
			{ token: "token", action: "x" },
		);
		const outage = await verify(
			createFixture(async () => {
				throw new Error("secret-key token");
			}).context,
			{ token: "token", action: "x" },
		);

		expect(failed.error).toMatchObject({
			status: 403,
			code: "captcha_invalid",
		});
		expect(outage.error).toMatchObject({
			status: 503,
			code: "captcha_unavailable",
		});
		expect(JSON.stringify(outage)).not.toMatch(/secret-key/);
	});
});
