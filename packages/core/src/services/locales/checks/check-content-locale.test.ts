import { describe, expect, test } from "vitest";
import type { ServiceContext } from "../../../utils/services/types.js";
import checkContentLocale from "./check-content-locale.js";

const withLocales = (codes: string[]) =>
	({
		config: {
			localization: {
				locales: codes.map((code) => ({ code, label: code })),
				defaultLocale: codes[0] ?? null,
			},
		},
	}) as unknown as ServiceContext;

describe("checkContentLocale", () => {
	test("refuses locales and fallback locales the project doesn't have", async () => {
		const context = withLocales(["en"]);
		expect(
			(await checkContentLocale(context, { locale: "fr" })).error?.status,
		).toBe(400);
		expect(
			(
				await checkContentLocale(context, {
					locale: "en",
					fallbackLocale: "fr",
				})
			).error?.status,
		).toBe(400);
	});

	test("accepts any locale when the project has none, as nothing it reads is translated", async () => {
		const res = await checkContentLocale(withLocales([]), { locale: "en" });
		expect(res.error).toBeUndefined();
	});
});
