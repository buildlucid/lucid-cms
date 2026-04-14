import { describe, expect, test } from "vitest";
import { createLucidSpaResponse, shouldServeLucidSpaShell } from "./runtime.js";

describe("@lucidcms/astro runtime", () => {
	test("serves the SPA shell for Lucid client routes", () => {
		expect(shouldServeLucidSpaShell("/lucid", "GET")).toBe(true);
		expect(shouldServeLucidSpaShell("/lucid/content/entries", "HEAD")).toBe(
			true,
		);
	});

	test("does not serve the SPA shell for API, asset, or non-GET requests", () => {
		expect(shouldServeLucidSpaShell("/lucid/api/v1/auth", "GET")).toBe(false);
		expect(shouldServeLucidSpaShell("/lucid/openapi", "GET")).toBe(false);
		expect(shouldServeLucidSpaShell("/lucid/assets/index.js", "GET")).toBe(
			false,
		);
		expect(shouldServeLucidSpaShell("/lucid/content/entries", "POST")).toBe(
			false,
		);
		expect(shouldServeLucidSpaShell("/outside-lucid", "GET")).toBe(false);
	});

	test("creates a cache-busting HTML response for the SPA shell", async () => {
		const getResponse = createLucidSpaResponse("<html>ok</html>", "GET");
		const headResponse = createLucidSpaResponse("<html>ok</html>", "HEAD");

		expect(getResponse.status).toBe(200);
		expect(getResponse.headers.get("content-type")).toBe(
			"text/html; charset=utf-8",
		);
		expect(getResponse.headers.get("cache-control")).toBe("no-store");
		await expect(getResponse.text()).resolves.toBe("<html>ok</html>");
		await expect(headResponse.text()).resolves.toBe("");
	});
});
