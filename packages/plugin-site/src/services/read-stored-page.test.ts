import type { ServiceContext, Toolkit } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import trackContentReads from "../engine/track-content-reads.js";
import readStoredPage from "./read-stored-page.js";

const tokens: Record<string, string> = {};

vi.mock(import("@lucidcms/core/extension"), async (importOriginal) => ({
	...(await importOriginal()),
	getCacheTagTokens: async (_context, tags) =>
		Object.fromEntries(tags.map((tag) => [tag, tokens[tag] ?? "0"])),
}));

const store = new Map<string, unknown>();
const context = {
	kv: {
		get: async (_context: unknown, { key }: { key: string }) =>
			store.get(key) ?? null,
	},
} as unknown as ServiceContext;

const toolkit = {
	documents: {
		getSingle: vi.fn(async () => ({ error: undefined, data: {} })),
		getMultiple: vi.fn(async () => ({ error: undefined, data: {} })),
	},
} as unknown as Toolkit;

describe("stored pages", () => {
	test("stay current until a collection the page read changes", async () => {
		const tracked = trackContentReads(toolkit, context);
		await tracked.toolkit.documents.getSingle({
			collectionKey: "page",
			version: "latest",
		});
		await tracked.toolkit.documents.getMultiple({
			collectionKey: "page",
			version: "latest",
		});
		await tracked.toolkit.documents.getMultiple({
			collectionKey: "blog",
			version: "latest",
		});

		const page = {
			body: "<h1>Home</h1>",
			contentType: "text/html; charset=utf-8",
			tokens: await tracked.tokens(),
		};
		expect(page.tokens).toEqual({
			"content-documents:page": "0",
			"content-documents:blog": "0",
		});
		store.set("home", page);

		tokens["content-documents:menu"] = "1";
		await expect(readStoredPage(context, "home")).resolves.toEqual(page);

		tokens["content-documents:blog"] = "1";
		await expect(readStoredPage(context, "home")).resolves.toBeNull();
	});
});
