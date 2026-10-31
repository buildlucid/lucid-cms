import { describe, expect, test, vi } from "vitest";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { getInitializedCaptchaAdapter } from "./lifecycle.js";
import type { CaptchaAdapterInstance } from "./types.js";

const createAdapter = (): CaptchaAdapterInstance => ({
	type: "captcha-adapter",
	key: "test",
	lifecycle: {
		init: vi.fn(),
		destroy: vi.fn(),
	},
	verify: vi.fn(),
});

const createConfig = (
	captcha: ResolvedLucidConfig["captcha"],
	adapter?: string,
) =>
	({
		captcha,
		admin: {
			slots: [
				{
					key: "widget",
					slot: "captcha.widget",
					component: "./widget.tsx",
					match: { adapter },
				},
			],
		},
	}) as never as ResolvedLucidConfig;

describe("captcha adapter lifecycle", () => {
	test("needs a widget slot for the adapter while built-in forms are protected", async () => {
		const adapter = createAdapter();

		await expect(
			getInitializedCaptchaAdapter(createConfig({ adapter }, "other"), {
				adapter,
			}),
		).rejects.toThrow('No captcha.widget admin slot matches the "test"');
		await expect(
			getInitializedCaptchaAdapter(createConfig({ adapter }, "test"), {
				adapter,
			}),
		).resolves.toBe(adapter);
		await expect(
			getInitializedCaptchaAdapter(
				createConfig({ adapter, forms: false }, "other"),
				{ adapter },
			),
		).resolves.toBe(adapter);
	});

	test("destroys an adapter whose init fails", async () => {
		const adapter = createAdapter();
		vi.mocked(adapter.lifecycle?.init)?.mockRejectedValueOnce(
			new Error("init"),
		);

		await expect(
			getInitializedCaptchaAdapter(createConfig({ adapter }), { adapter }),
		).rejects.toThrow("init");
		expect(adapter.lifecycle?.destroy).toHaveBeenCalledOnce();
	});
});
