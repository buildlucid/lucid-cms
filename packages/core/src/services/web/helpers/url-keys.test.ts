import { expect, test } from "vitest";
import { addWebUrlKeys, webSourceKey, webUrlKey } from "./url-keys.js";

test("URL keys match mentions loosely but never a changed query string", () => {
	const keys = addWebUrlKeys(
		new Set<string>(),
		'See example.com/about, or [docs](https://docs.example.com/guide?page=2#intro). {"url":"https://www.example.org/"}',
	);
	for (const url of [
		"https://www.example.com/about/",
		"http://docs.example.com/guide?page=2",
		"https://example.org",
	]) {
		expect(keys.has(webUrlKey(url) ?? "")).toBe(true);
	}
	expect(keys.has(webUrlKey("https://example.com/about?q=secret") ?? "")).toBe(
		false,
	);
	expect(webSourceKey("https://example.com/a?utm_source=x&id=1")).toBe(
		webUrlKey("https://example.com/a?id=1"),
	);
});
