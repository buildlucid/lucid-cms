import { describe, expect, test } from "vitest";
import type { CaptchaAdapterInstance } from "../../libs/captcha/types.js";
import renderWidget from "./render-widget.js";

const context = (captcha: Partial<CaptchaAdapterInstance> | null) =>
	({
		captcha: captcha && {
			type: "captcha-adapter",
			key: "test",
			verify: async () => ({ success: true }),
			...captcha,
		},
	}) as never;

describe("captcha render widget service", () => {
	test("puts the settings and the widget's script in one element", async () => {
		const result = await renderWidget(
			context({
				client: { siteKey: '"key"' },
				browserWidget: 'draw("</script>")',
			}),
			{ action: "contact", field: "captcha" },
		);

		expect(result.data).toBe(
			'<div data-captcha="test" data-captcha-settings="{&quot;siteKey&quot;:&quot;\\&quot;key\\&quot;&quot;,&quot;action&quot;:&quot;contact&quot;,&quot;field&quot;:&quot;captcha&quot;}"><script>draw("<\\/script>")</script></div>',
		);
	});

	test("draws only the element without a script, and nothing without an adapter", async () => {
		const input = { action: "contact", field: "captcha" };

		expect((await renderWidget(context({}), input)).data).not.toContain(
			"<script>",
		);
		expect((await renderWidget(context(null), input)).data).toBeNull();
	});
});
