import type { ServiceContext } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import readCacheTagTokens from "./read-cache-tag-tokens.js";

const getCacheTagTokens = vi.fn(async (_context: unknown, tags: string[]) =>
	Object.fromEntries(tags.map((tag) => [tag, `${tag}:${calls++}`])),
);
let calls = 0;

vi.mock(import("@lucidcms/core/extension"), async (importOriginal) => ({
	...(await importOriginal()),
	getCacheTagTokens: (context: unknown, tags: string[]) =>
		getCacheTagTokens(context, tags),
}));

describe("readCacheTagTokens", () => {
	test("resolves each tag once per request, however many reads ask for it", async () => {
		const request = {} as ServiceContext;

		const [first, second] = await Promise.all([
			readCacheTagTokens(request, ["content-media", "content-documents:page"]),
			readCacheTagTokens(request, ["content-media"]),
		]);
		const third = await readCacheTagTokens(request, [
			"content-documents:page",
			"content-documents:blog",
		]);

		expect(getCacheTagTokens.mock.calls.map(([, tags]) => tags)).toEqual([
			["content-media", "content-documents:page"],
			["content-documents:blog"],
		]);
		expect(second["content-media"]).toBe(first["content-media"]);
		expect(third["content-documents:page"]).toBe(
			first["content-documents:page"],
		);
	});

	test("reads afresh for another request", async () => {
		const first = await readCacheTagTokens({} as ServiceContext, [
			"content-media",
		]);
		const second = await readCacheTagTokens({} as ServiceContext, [
			"content-media",
		]);

		expect(second["content-media"]).not.toBe(first["content-media"]);
	});
});
